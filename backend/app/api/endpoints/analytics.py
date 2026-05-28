from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.models.database import get_db, Project, Criteria, Alternative, MatrixValue
from app.schemas.analytics import WhatIfRequest, GoalSeekRequest, GoalSeekResponse, RiskMonteRequest, RiskMonteResponse, RiskMonteAlternativeRate
from app.services.saw import solve_saw
from app.services.topsis import solve_topsis
from app.services.analytics_solvers import run_goal_seeking_solver, run_monte_carlo_simulation

router = APIRouter()

@router.post("/what-if")
def calculate_what_if(payload: WhatIfRequest):
    """
    Computes scores and rankings instantly on modified input data without saving.
    """
    matrix = payload.matrix
    weights = payload.weights
    types = payload.criterias_types
    method = payload.method
    
    if len(matrix) == 0 or len(weights) == 0:
        raise HTTPException(status_code=400, detail="Data matriks atau kriteria kosong.")
        
    try:
        if method == "SAW":
            results = solve_saw(matrix, weights, types)
        else:
            results = solve_topsis(matrix, weights, types)
            
        scores = results["scores"]
        
        # Build rankings
        rankings = []
        for idx, score in enumerate(scores):
            rankings.append({
                "alternative_index": idx,
                "score": score
            })
            
        # Sort descending
        rankings = sorted(rankings, key=lambda x: x["score"], reverse=True)
        for rank_idx, item in enumerate(rankings):
            item["rank"] = rank_idx + 1
            
        return {
            "method": method,
            "results": results,
            "rankings": rankings
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/goal-seek", response_model=GoalSeekResponse)
def calculate_goal_seeking(payload: GoalSeekRequest, db: Session = Depends(get_db)):
    """
    Goal Seeking Solver using Bisection Method. Finds boundary value of changing_criteria
    for target_alternative to reach Rank 1.
    """
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    criterias = db.query(Criteria).filter(Criteria.project_id == project.id).order_by(Criteria.name).all()
    alternatives = db.query(Alternative).filter(Alternative.project_id == project.id).order_by(Alternative.name).all()
    
    # Identify indices
    target_alt_idx = -1
    for idx, alt in enumerate(alternatives):
        if alt.id == payload.target_alternative_id:
            target_alt_idx = idx
            break
            
    changing_crit_idx = -1
    for idx, crit in enumerate(criterias):
        if crit.id == payload.changing_criteria_id:
            changing_crit_idx = idx
            break
            
    if target_alt_idx == -1:
        raise HTTPException(status_code=404, detail="Alternatif target tidak ditemukan.")
    if changing_crit_idx == -1:
        raise HTTPException(status_code=404, detail="Kriteria pengubah tidak ditemukan.")
        
    # Reconstruct 2D decision matrix
    crit_ids = [c.id for c in criterias]
    alt_ids = [a.id for a in alternatives]
    matrix_2d = [[0.0 for _ in range(len(crit_ids))] for _ in range(len(alt_ids))]
    
    cells = db.query(MatrixValue).filter(MatrixValue.project_id == project.id).all()
    cell_map = {(c.alternative_id, c.criteria_id): c.value for c in cells}
    
    for i, alt_id in enumerate(alt_ids):
        for j, crit_id in enumerate(crit_ids):
            matrix_2d[i][j] = cell_map.get((alt_id, crit_id), 0.0)
            
    current_value = matrix_2d[target_alt_idx][changing_crit_idx]
    weights = [c.weight for c in criterias]
    criteria_types = [c.type for c in criterias]
    method = project.chosen_method or "TOPSIS"
    
    try:
        success, target_val, msg = run_goal_seeking_solver(
            matrix=matrix_2d,
            weights=weights,
            criteria_types=criteria_types,
            target_alt_idx=target_alt_idx,
            changing_crit_idx=changing_crit_idx,
            method=method,
            target_rank=payload.target_rank
        )
        
        return GoalSeekResponse(
            success=success,
            message=msg,
            current_value=current_value,
            target_value=target_val,
            target_rank=payload.target_rank,
            direction="higher" if criteria_types[changing_crit_idx] == "benefit" else "lower",
            criteria_name=criterias[changing_crit_idx].name,
            alternative_name=alternatives[target_alt_idx].name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjalankan Goal Seeking: {str(e)}")

@router.post("/risk-monte", response_model=RiskMonteResponse)
def calculate_risk_monte_carlo(payload: RiskMonteRequest, db: Session = Depends(get_db)):
    """
    Monte Carlo Simulation. Perturbs weights randomly and calculates the Rank 1 Stability Rate.
    """
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    criterias = db.query(Criteria).filter(Criteria.project_id == project.id).order_by(Criteria.name).all()
    alternatives = db.query(Alternative).filter(Alternative.project_id == project.id).order_by(Alternative.name).all()
    
    if len(criterias) == 0 or len(alternatives) == 0:
        raise HTTPException(status_code=400, detail="Data kriteria atau alternatif tidak tersedia.")
        
    # Reconstruct 2D decision matrix
    crit_ids = [c.id for c in criterias]
    alt_ids = [a.id for a in alternatives]
    matrix_2d = [[0.0 for _ in range(len(crit_ids))] for _ in range(len(alt_ids))]
    
    cells = db.query(MatrixValue).filter(MatrixValue.project_id == project.id).all()
    cell_map = {(c.alternative_id, c.criteria_id): c.value for c in cells}
    
    for i, alt_id in enumerate(alt_ids):
        for j, crit_id in enumerate(crit_ids):
            matrix_2d[i][j] = cell_map.get((alt_id, crit_id), 0.0)
            
    weights = [c.weight for c in criterias]
    criteria_types = [c.type for c in criterias]
    method = project.chosen_method or "TOPSIS"
    
    try:
        stability_rates_map = run_monte_carlo_simulation(
            matrix=matrix_2d,
            weights=weights,
            criteria_types=criteria_types,
            method=method,
            iterations=payload.iterations,
            perturbation=payload.perturbation_percent
        )
        
        rates_list = []
        for alt_idx, rate in stability_rates_map.items():
            rates_list.append(RiskMonteAlternativeRate(
                alternative_id=alternatives[alt_idx].id,
                alternative_name=alternatives[alt_idx].name,
                stability_rate=rate
            ))
            
        # Sort descending by rate
        rates_list = sorted(rates_list, key=lambda x: x.stability_rate, reverse=True)
        
        return RiskMonteResponse(
            project_title=project.title,
            iterations=payload.iterations,
            perturbation=payload.perturbation_percent,
            stability_rates=rates_list
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjalankan simulasi Monte Carlo: {str(e)}")
