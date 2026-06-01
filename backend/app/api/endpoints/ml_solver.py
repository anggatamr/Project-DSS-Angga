"""
ML Solver API endpoints.
POST /api/v1/ml/profile-dataset   — auto-profile any CSV/Excel
POST /api/v1/ml/train-model       — train ML model on uploaded dataset
POST /api/v1/ml/integrated-solve  — MCDM + ML combined ranking
POST /api/v1/ml/sensitivity-with-ml — sensitivity analysis with ML confidence
GET  /api/v1/ml/models            — list active models
"""
from __future__ import annotations

import io

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.ml import (
    IntegratedSolveRequest,
    SensitivityMLRequest,
)
from app.services.ml.data_profiler import SmartDataProfiler
from app.services.ml.dynamic_learner import DynamicLearner
from app.services.ml.mcdm_ml_integrator import MCDMMLIntegrator
from app.services.ml.model_store import get_learner, list_models, save_learner

router = APIRouter()


# ------------------------------------------------------------------ #
#  Helpers                                                             #
# ------------------------------------------------------------------ #

def _read_upload(file: UploadFile) -> pd.DataFrame:
    content = file.file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file melebihi batas 10 MB.")
    fname = (file.filename or "").lower()
    try:
        if fname.endswith(".csv"):
            return pd.read_csv(io.BytesIO(content))
        elif fname.endswith((".xlsx", ".xls")):
            return pd.read_excel(io.BytesIO(content))
        else:
            # Try CSV first, then Excel
            try:
                return pd.read_csv(io.BytesIO(content))
            except Exception:
                return pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {e}")


# ------------------------------------------------------------------ #
#  Endpoints                                                           #
# ------------------------------------------------------------------ #

@router.post("/profile-dataset")
async def profile_dataset(file: UploadFile = File(...)):
    """
    Auto-profile any CSV/Excel dataset.
    Returns column types, semantic roles, statistics, and recommended ML models.
    """
    df = _read_upload(file)
    profiler = SmartDataProfiler()
    profile = profiler.profile_dataset(df, dataset_name=file.filename or "dataset")
    return {
        "status": "success",
        "profile": profiler.serialize_profile(profile),
    }


@router.post("/train-model")
async def train_model(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    test_size: float = Form(0.2),
):
    """
    Train ML model(s) on user's dataset with automatic preprocessing.
    Returns model_id, training metrics, and feature importance.
    """
    df = _read_upload(file)

    if target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Kolom target '{target_column}' tidak ditemukan dalam dataset. "
                   f"Kolom yang tersedia: {df.columns.tolist()}",
        )

    learner = DynamicLearner()
    try:
        report = learner.fit(
            df,
            target_col=target_column,
            test_size=test_size,
            dataset_name=file.filename or "dataset",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melatih model: {e}")

    model_id = save_learner(learner)
    return {"status": "success", "model_id": model_id, **report}


@router.post("/integrated-solve")
async def integrated_solve(payload: IntegratedSolveRequest):
    """
    Combined MCDM + ML ranking.
    Requires a previously trained model_id from /train-model.
    """
    try:
        learner = get_learner(payload.model_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    integrator = MCDMMLIntegrator(learner)
    try:
        result = integrator.integrated_solve(
            matrix=payload.matrix,
            weights=payload.weights,
            criteria_types=payload.criteria_types,
            criteria_names=payload.criteria_names,
            alternative_names=payload.alternative_names,
            method=payload.method,
            use_ml_prediction=payload.use_ml_prediction,
            ml_weight=payload.ml_weight,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjalankan integrated solve: {e}")

    return {"status": "success", "result": result}


@router.post("/sensitivity-with-ml")
async def sensitivity_with_ml(payload: SensitivityMLRequest):
    """
    Sensitivity analysis with ML confidence bounds.
    Sweeps one criterion weight and records ranking + confidence changes.
    """
    try:
        learner = get_learner(payload.model_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if payload.vary_criterion_idx >= len(payload.criteria_names):
        raise HTTPException(status_code=400, detail="vary_criterion_idx di luar batas.")

    integrator = MCDMMLIntegrator(learner)
    try:
        data = integrator.sensitivity_with_ml(
            matrix=payload.matrix,
            base_weights=payload.weights,
            criteria_types=payload.criteria_types,
            criteria_names=payload.criteria_names,
            alternative_names=payload.alternative_names,
            vary_criterion_idx=payload.vary_criterion_idx,
            method=payload.method,
            steps=payload.steps,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjalankan sensitivity analysis: {e}")

    return {"status": "success", "sensitivity_data": data}


@router.get("/models")
async def list_active_models():
    """List all trained models currently in memory."""
    return {"status": "success", "models": list_models()}
