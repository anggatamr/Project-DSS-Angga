import numpy as np
import random
from typing import List, Dict, Any, Tuple, Optional

from app.services.saw import solve_saw
from app.services.topsis import solve_topsis

def run_goal_seeking_solver(
    matrix: List[List[float]],
    weights: List[float],
    criteria_types: List[str],
    target_alt_idx: int,
    changing_crit_idx: int,
    method: str = "TOPSIS",
    target_rank: int = 1
) -> Tuple[bool, Optional[float], str]:
    """
    Finds the boundary value for a specific criterion of a target alternative 
    to achieve Rank 1 (or target rank) using the Bisection Method.
    
    Returns:
        success: bool
        target_value: float or None
        message: str
    """
    X = np.array(matrix, dtype=float)
    n_alts, n_crits = X.shape
    
    if target_alt_idx < 0 or target_alt_idx >= n_alts:
        return False, None, "Indeks alternatif target tidak valid."
    if changing_crit_idx < 0 or changing_crit_idx >= n_crits:
        return False, None, "Indeks kriteria yang diubah tidak valid."

    c_type = criteria_types[changing_crit_idx].lower()
    direction = "higher" if c_type == "benefit" else "lower"

    # Helper function to solve and return rankings and scores
    def solve_temp(val: float) -> Tuple[np.ndarray, List[int]]:
        X_temp = X.copy()
        X_temp[target_alt_idx, changing_crit_idx] = val
        if method == "SAW":
            res = solve_saw(X_temp.tolist(), weights, criteria_types)
        else:
            res = solve_topsis(X_temp.tolist(), weights, criteria_types)
            
        scores = np.array(res["scores"])
        # Calculate ranks: sort scores descending
        sorted_indices = np.argsort(-scores)
        ranks = [0] * n_alts
        for r_idx, alt_idx in enumerate(sorted_indices):
            ranks[alt_idx] = r_idx + 1
        return scores, ranks

    # 1. Check if already meeting target rank
    initial_scores, initial_ranks = solve_temp(X[target_alt_idx, changing_crit_idx])
    if initial_ranks[target_alt_idx] <= target_rank:
        return True, float(X[target_alt_idx, changing_crit_idx]), f"Alternatif sudah menempati Rank {initial_ranks[target_alt_idx]}."

    # 2. Determine target score (T) to beat other alternatives
    # If target_rank is 1, target score is max of all *other* alternatives' scores + 1e-4
    other_scores = np.delete(initial_scores, target_alt_idx)
    max_other_score = other_scores.max()
    target_score = max_other_score + 1e-4

    # 3. Setup Bisection search boundaries
    col_values = X[:, changing_crit_idx]
    max_in_col = col_values.max()
    
    # Range configuration
    if c_type == "benefit":
        L = 0.0
        R = max(max_in_col * 20.0, 1000.0) # Search range up to 20x column max
    else: # cost
        L = 1e-6 # Avoid division by zero
        R = max(max_in_col * 10.0, 1000.0)

    # Pre-check boundary scores
    scores_L, ranks_L = solve_temp(L)
    scores_R, ranks_R = solve_temp(R)

    # For benefit: L=0 gives lowest score, R=max gives highest score
    # For cost: L=0.0001 gives highest score, R=max gives lowest score
    max_achievable_score = scores_R[target_alt_idx] if c_type == "benefit" else scores_L[target_alt_idx]
    
    if max_achievable_score < target_score:
        return False, None, f"Tidak dapat mencapai Peringkat {target_rank} karena kontribusi kriteria ini terlalu rendah meskipun nilainya dimaksimalkan."

    # 4. Perform Bisection
    iterations = 35
    for _ in range(iterations):
        M = (L + R) / 2.0
        scores_M, ranks_M = solve_temp(M)
        current_score = scores_M[target_alt_idx]
        
        if c_type == "benefit":
            if current_score < target_score:
                L = M # We need higher benefit
            else:
                R = M # Try to lower benefit to find minimal boundary
        else: # cost
            if current_score < target_score:
                R = M # We need lower cost
            else:
                L = M # Try to raise cost to find maximal boundary (less cost reduction)

    final_val = (L + R) / 2.0
    final_scores, final_ranks = solve_temp(final_val)

    if final_ranks[target_alt_idx] <= target_rank:
        return True, float(final_val), "Sukses menemukan nilai batas optimasi."
    else:
        return False, None, "Bisection gagal berkonvergen ke solusi stabil."


def run_monte_carlo_simulation(
    matrix: List[List[float]],
    weights: List[float],
    criteria_types: List[str],
    method: str = "TOPSIS",
    iterations: int = 1000,
    perturbation: float = 0.05
) -> Dict[int, float]:
    """
    Runs Monte Carlo simulation by perturbing criteria weights.
    Returns:
        Dict mapping alternative index to stability rate (%)
    """
    n_alts = len(matrix)
    n_crits = len(weights)
    
    if n_alts == 0 or n_crits == 0:
        return {}

    win_counts = {i: 0 for i in range(n_alts)}
    W = np.array(weights, dtype=float)

    for _ in range(iterations):
        # 1. Perturb weights randomly within [-perturbation, +perturbation]
        random_variations = np.array([random.uniform(-perturbation, perturbation) for _ in range(n_crits)])
        perturbed_w_temp = W * (1.0 + random_variations)
        
        # Clip to ensure no negative weights
        perturbed_w_temp = np.clip(perturbed_w_temp, 1e-6, 1.0)
        
        # Re-normalize
        sum_w = perturbed_w_temp.sum()
        perturbed_w = perturbed_w_temp / (sum_w if sum_w > 0 else 1.0)

        # 2. Solve MCDM
        try:
            if method == "SAW":
                res = solve_saw(matrix, perturbed_w.tolist(), criteria_types)
            else:
                res = solve_topsis(matrix, perturbed_w.tolist(), criteria_types)
                
            scores = res["scores"]
            if len(scores) > 0:
                best_alt_idx = int(np.argmax(scores))
                win_counts[best_alt_idx] += 1
        except Exception:
            continue # Skip failed iterations

    # 3. Calculate percentage rates
    stability_rates = {
        alt_idx: float(count / iterations) * 100.0 
        for alt_idx, count in win_counts.items()
    }
    
    return stability_rates
