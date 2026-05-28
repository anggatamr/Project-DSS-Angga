import numpy as np
from typing import List, Dict, Any

def solve_saw(
    matrix: List[List[float]], 
    weights: List[float], 
    criteria_types: List[str]
) -> Dict[str, Any]:
    """
    Computes alternative scores using Simple Additive Weighting (SAW).
    Args:
        matrix: 2D list of decision matrix values where matrix[alt_idx][crit_idx]
        weights: list of criteria weights
        criteria_types: list of "benefit" or "cost"
    Returns:
        Dict containing:
            normalized_matrix: 2D list of normalized values
            scores: list of final preference scores for each alternative
    """
    X = np.array(matrix, dtype=float)
    W = np.array(weights, dtype=float)
    
    n_alts, n_crits = X.shape
    if n_alts == 0 or n_crits == 0:
        return {"normalized_matrix": [], "scores": []}
        
    R = np.zeros_like(X)
    
    for j in range(n_crits):
        col = X[:, j]
        c_type = criteria_types[j].lower()
        
        if c_type == "benefit":
            col_max = col.max()
            if col_max == 0:
                raise ValueError(f"Division by zero in SAW: maximum value of benefit criterion at index {j} is zero.")
            R[:, j] = col / col_max
        elif c_type == "cost":
            col_min = col.min()
            # If any value is 0, we can't divide by it for cost criteria.
            # E.g. col_min / col[i] -> if col[i] == 0, division by zero!
            if np.any(col == 0):
                raise ValueError(f"Division by zero in SAW: cost criterion at index {j} contains a zero value.")
            R[:, j] = col_min / col
        else:
            raise ValueError(f"Invalid criteria type: '{c_type}'. Must be 'benefit' or 'cost'.")
            
    # Calculate preference score: V_i = sum(w_j * r_ij)
    # V is a 1D array of length n_alts
    V = np.dot(R, W)
    
    return {
        "normalized_matrix": R.tolist(),
        "scores": V.tolist()
    }
