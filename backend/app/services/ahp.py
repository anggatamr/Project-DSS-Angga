import numpy as np
from typing import Dict, List, Tuple

# Saaty's Random Index (RI) table
RANDOM_INDEX = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49
}

def calculate_ahp_weights(pairwise_matrix: List[List[float]]) -> Tuple[List[float], float, float, float, bool]:
    """
    Computes the AHP weights, lambda_max, CI, and CR from a pairwise comparison matrix.
    Returns:
        eigenvector (weights): List[float]
        lambda_max: float
        consistency_index (CI): float
        consistency_ratio (CR): float
        is_consistent: bool
    """
    matrix = np.array(pairwise_matrix, dtype=float)
    n = matrix.shape[0]
    
    if n == 0:
        return [], 0.0, 0.0, 0.0, True
    
    # 1. Normalize columns
    col_sums = matrix.sum(axis=0)
    # Check for division by zero
    if np.any(col_sums == 0):
        raise ValueError("Invalid pairwise comparison matrix: column sum is zero.")
        
    normalized_matrix = matrix / col_sums
    
    # 2. Calculate row averages to get the weights (eigenvector)
    weights = normalized_matrix.mean(axis=1)
    
    # 3. Calculate lambda_max (Principal Eigenvalue)
    # Ws = matrix * weights
    weighted_sum = np.dot(matrix, weights)
    # lambda_i = Ws_i / weights_i
    # Handle small weight values to avoid division by zero
    weights_safe = np.where(weights == 0, 1e-9, weights)
    lambdas = weighted_sum / weights_safe
    lambda_max = float(lambdas.mean())
    
    # 4. Consistency Index (CI)
    if n <= 1:
        ci = 0.0
    else:
        ci = (lambda_max - n) / (n - 1)
        
    # 5. Consistency Ratio (CR)
    ri = RANDOM_INDEX.get(n, 1.49) # Default to 1.49 if n > 10
    if ri == 0.0:
        cr = 0.0
    else:
        cr = ci / ri
        
    is_consistent = cr <= 0.1
    
    return weights.tolist(), lambda_max, ci, cr, is_consistent
