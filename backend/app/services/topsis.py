import numpy as np
from typing import List, Dict, Any

def solve_topsis(
    matrix: List[List[float]], 
    weights: List[float], 
    criteria_types: List[str]
) -> Dict[str, Any]:
    """
    Computes alternative scores using TOPSIS.
    Args:
        matrix: 2D list of decision matrix values where matrix[alt_idx][crit_idx]
        weights: list of criteria weights
        criteria_types: list of "benefit" or "cost"
    Returns:
        Dict containing:
            normalized_matrix: 2D list of normalized values (vector normalization)
            weighted_matrix: 2D list of weighted normalized values
            ideal_positive: list of positive ideal values (A+)
            ideal_negative: list of negative ideal values (A-)
            distance_positive: list of separation measures from A+ (D+)
            distance_negative: list of separation measures from A- (D-)
            scores: list of relative closeness scores (C_i)
    """
    X = np.array(matrix, dtype=float)
    W = np.array(weights, dtype=float)
    
    n_alts, n_crits = X.shape
    if n_alts == 0 or n_crits == 0:
        return {
            "normalized_matrix": [],
            "weighted_matrix": [],
            "ideal_positive": [],
            "ideal_negative": [],
            "distance_positive": [],
            "distance_negative": [],
            "scores": []
        }
        
    # 1. Normalize the decision matrix using Vector Normalization
    # r_ij = x_ij / sqrt(sum(x_kj^2))
    norm_factors = np.sqrt(np.sum(X**2, axis=0))
    if np.any(norm_factors == 0):
        # Find which column has zero norm factor
        zero_indices = np.where(norm_factors == 0)[0].tolist()
        raise ValueError(f"Division by zero in TOPSIS: criteria at indices {zero_indices} have all zero values.")
        
    R = X / norm_factors
    
    # 2. Calculate the weighted normalized decision matrix
    # y_ij = w_j * r_ij
    Y = R * W
    
    # 3. Determine positive ideal (A+) and negative ideal (A-) solutions
    ideal_pos = np.zeros(n_crits)
    ideal_neg = np.zeros(n_crits)
    
    for j in range(n_crits):
        col = Y[:, j]
        c_type = criteria_types[j].lower()
        
        if c_type == "benefit":
            ideal_pos[j] = col.max()
            ideal_neg[j] = col.min()
        elif c_type == "cost":
            ideal_pos[j] = col.min()
            ideal_neg[j] = col.max()
        else:
            raise ValueError(f"Invalid criteria type: '{c_type}'. Must be 'benefit' or 'cost'.")
            
    # 4. Calculate separation measures (D+ and D-)
    # D+_i = sqrt(sum((y_ij - A+_j)^2))
    # D-_i = sqrt(sum((y_ij - A-_j)^2))
    D_pos = np.sqrt(np.sum((Y - ideal_pos)**2, axis=1))
    D_neg = np.sqrt(np.sum((Y - ideal_neg)**2, axis=1))
    
    # 5. Calculate relative closeness scores
    # C_i = D-_i / (D+_i + D-_i)
    denom = D_pos + D_neg
    # If denominator is 0 (i.e. alternative is identical to both ideal positive and negative, meaning all are identical)
    denom_safe = np.where(denom == 0, 1e-9, denom)
    C = D_neg / denom_safe
    
    # If it was actually zero, set closeness score to 0.5 (neutral)
    C = np.where(denom == 0, 0.5, C)
    
    return {
        "normalized_matrix": R.tolist(),
        "weighted_matrix": Y.tolist(),
        "ideal_positive": ideal_pos.tolist(),
        "ideal_negative": ideal_neg.tolist(),
        "distance_positive": D_pos.tolist(),
        "distance_negative": D_neg.tolist(),
        "scores": C.tolist()
    }
