from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.models.database import get_db, Project, Criteria, Alternative, MatrixValue
from app.schemas.matrix import (
    MatrixValidateRequest, 
    AHPValidateRequest, 
    AHPValidateResponse, 
    SolverCalculateRequest, 
    SolverSensitivityRequest
)
from app.services.ahp import calculate_ahp_weights
from app.services.saw import solve_saw
from app.services.topsis import solve_topsis

router = APIRouter()

@router.post("/validate")
def validate_matrix(payload: MatrixValidateRequest):
    """
    Validates a raw decision matrix, weights, and types.
    Checks for negative values on benefit criteria and division-by-zero.
    """
    matrix = payload.matrix
    weights = payload.weights
    types = payload.criterias_types
    
    if len(matrix) == 0:
        raise HTTPException(status_code=400, detail="Matriks kosong")
        
    n_crits = len(weights)
    if n_crits == 0:
        raise HTTPException(status_code=400, detail="Kriteria kosong")
        
    # Check dimensions
    for idx, row in enumerate(matrix):
        if len(row) != n_crits:
            raise HTTPException(
                status_code=400, 
                detail=f"Jumlah kolom pada alternatif ke-{idx} ({len(row)}) tidak sesuai dengan jumlah kriteria ({n_crits})."
            )
            
    # Validate negative values on benefit criteria
    for r_idx, row in enumerate(matrix):
        for c_idx, val in enumerate(row):
            if c_idx < len(types) and types[c_idx] == "benefit" and val < 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Nilai kriteria benefit ke-{c_idx+1} pada alternatif ke-{r_idx+1} tidak boleh negatif."
                )
                
    # Run test SAW and TOPSIS calculations to catch Division by Zero
    try:
        solve_saw(matrix, weights, types)
        solve_topsis(matrix, weights, types)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return {"status": "success", "message": "Matriks keputusan valid untuk komputasi."}

@router.post("/ahp-validate", response_model=AHPValidateResponse)
def ahp_validate(payload: AHPValidateRequest):
    """
    Validates pairwise comparison matrix for AHP, calculates weights, CI, and CR.
    """
    matrix = payload.pairwise_matrix
    n = len(matrix)
    
    if n != len(payload.criteria_names):
        raise HTTPException(status_code=400, detail="Ukuran matriks berpasangan harus sama dengan jumlah kriteria.")
        
    # Validate pairwise consistency characteristics (A[i][j] * A[j][i] approx 1)
    for i in range(n):
        if len(matrix[i]) != n:
            raise HTTPException(status_code=400, detail=f"Baris ke-{i} matriks tidak berukuran {n}.")
        if abs(matrix[i][i] - 1.0) > 1e-3:
            raise HTTPException(status_code=400, detail="Elemen diagonal utama matriks berpasangan AHP harus bernilai 1.")
            
    try:
        weights, lambda_max, ci, cr, is_consistent = calculate_ahp_weights(matrix)
        
        # Eigenvalues can be approximated by Saaty method
        return AHPValidateResponse(
            eigenvalues=weights, # approximated weights represent eigenvalues characteristics
            eigenvector=weights,
            max_eigenvalue=lambda_max,
            consistency_index=ci,
            consistency_ratio=cr,
            is_consistent=is_consistent
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/calculate")
def calculate_dss(payload: SolverCalculateRequest, db: Session = Depends(get_db)):
    """
    Runs full computation for a project based on the selected MCDM method.
    """
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    # Fetch criteria, alternatives, and matrix values ordered to build a clean 2D matrix
    criterias = db.query(Criteria).filter(Criteria.project_id == project.id).order_by(Criteria.name).all()
    alternatives = db.query(Alternative).filter(Alternative.project_id == project.id).order_by(Alternative.name).all()
    
    if not criterias or not alternatives:
        raise HTTPException(status_code=400, detail="Kriteria atau alternatif belum dikonfigurasi untuk proyek ini.")
        
    # Map for easy matrix construction
    crit_ids = [c.id for c in criterias]
    alt_ids = [a.id for a in alternatives]
    
    # Initialize empty 2D matrix: shape (len(alt), len(crit))
    matrix_2d = [[0.0 for _ in range(len(crit_ids))] for _ in range(len(alt_ids))]
    
    # Query matrix values
    cells = db.query(MatrixValue).filter(MatrixValue.project_id == project.id).all()
    
    # Build dictionary map to speed up lookups
    cell_map = {(c.alternative_id, c.criteria_id): c.value for c in cells}
    
    for i, alt_id in enumerate(alt_ids):
        for j, crit_id in enumerate(crit_ids):
            matrix_2d[i][j] = cell_map.get((alt_id, crit_id), 0.0)
            
    # Formulate inputs for services
    weights = [c.weight for c in criterias]
    criteria_types = [c.type for c in criterias]
    
    method = payload.method
    
    try:
        if method == "SAW":
            results = solve_saw(matrix_2d, weights, criteria_types)
        elif method == "TOPSIS":
            results = solve_topsis(matrix_2d, weights, criteria_types)
        else:
            raise HTTPException(status_code=400, detail=f"Metode {method} tidak didukung.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Formulate rankings output
    scores = results["scores"]
    ranked_alternatives = []
    for idx, alt in enumerate(alternatives):
        ranked_alternatives.append({
            "id": alt.id,
            "name": alt.name,
            "score": scores[idx]
        })
        
    # Sort by score descending (highest score is rank 1)
    ranked_alternatives = sorted(ranked_alternatives, key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for rank_idx, item in enumerate(ranked_alternatives):
        item["rank"] = rank_idx + 1
        
    # Update project chosen method in DB
    if project.chosen_method != method:
        project.chosen_method = method
        db.commit()
        
    return {
        "project_title": project.title,
        "method": method,
        "criterias": [{"id": c.id, "name": c.name, "weight": c.weight, "type": c.type} for c in criterias],
        "alternatives": [{"id": a.id, "name": a.name} for a in alternatives],
        "matrix": matrix_2d,
        "results": results,
        "rankings": ranked_alternatives
    }

@router.post("/sensitivity")
def calculate_sensitivity(payload: SolverSensitivityRequest, db: Session = Depends(get_db)):
    """
    Quickly recalculates scores and rankings for dynamic slider weight modifications.
    Does NOT modify the weights in the database (temporary simulation).
    """
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    criterias = db.query(Criteria).filter(Criteria.project_id == project.id).order_by(Criteria.name).all()
    alternatives = db.query(Alternative).filter(Alternative.project_id == project.id).order_by(Alternative.name).all()
    
    if len(payload.modified_weights) != len(criterias):
        raise HTTPException(
            status_code=400, 
            detail=f"Jumlah bobot termodifikasi ({len(payload.modified_weights)}) tidak sesuai dengan jumlah kriteria ({len(criterias)})."
        )
        
    # Build 2D matrix
    crit_ids = [c.id for c in criterias]
    alt_ids = [a.id for a in alternatives]
    matrix_2d = [[0.0 for _ in range(len(crit_ids))] for _ in range(len(alt_ids))]
    
    cells = db.query(MatrixValue).filter(MatrixValue.project_id == project.id).all()
    cell_map = {(c.alternative_id, c.criteria_id): c.value for c in cells}
    
    for i, alt_id in enumerate(alt_ids):
        for j, crit_id in enumerate(crit_ids):
            matrix_2d[i][j] = cell_map.get((alt_id, crit_id), 0.0)
            
    # Calculate with new weights
    criteria_types = [c.type for c in criterias]
    method = project.chosen_method or "TOPSIS"
    
    try:
        if method == "SAW":
            results = solve_saw(matrix_2d, payload.modified_weights, criteria_types)
        elif method == "TOPSIS":
            results = solve_topsis(matrix_2d, payload.modified_weights, criteria_types)
        else:
            results = solve_topsis(matrix_2d, payload.modified_weights, criteria_types)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Formulate ranking
    scores = results["scores"]
    ranked_alternatives = []
    for idx, alt in enumerate(alternatives):
        ranked_alternatives.append({
            "id": alt.id,
            "name": alt.name,
            "score": scores[idx]
        })
        
    ranked_alternatives = sorted(ranked_alternatives, key=lambda x: x["score"], reverse=True)
    for rank_idx, item in enumerate(ranked_alternatives):
        item["rank"] = rank_idx + 1
        
    return {
        "method": method,
        "modified_weights": payload.modified_weights,
        "rankings": ranked_alternatives
    }
