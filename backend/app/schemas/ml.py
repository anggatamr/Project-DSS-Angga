from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class ProfileDatasetResponse(BaseModel):
    status: str
    profile: Dict[str, Any]


class TrainModelResponse(BaseModel):
    status: str
    model_id: str
    task_type: str
    target_column: str
    features: List[str]
    best_model: Optional[str]
    data_quality: float
    sample_size: int
    training_results: Dict[str, Any]
    feature_importance: Dict[str, float]
    dataset_profile: Dict[str, Any]


class IntegratedSolveRequest(BaseModel):
    model_id: str
    matrix: List[List[float]]
    weights: List[float]
    criteria_types: List[str]
    criteria_names: List[str]
    alternative_names: List[str]
    method: str = Field("TOPSIS", pattern="^(TOPSIS|SAW)$")
    use_ml_prediction: bool = True
    ml_weight: float = Field(0.20, ge=0.0, le=0.5)


class SensitivityMLRequest(BaseModel):
    model_id: str
    matrix: List[List[float]]
    weights: List[float]
    criteria_types: List[str]
    criteria_names: List[str]
    alternative_names: List[str]
    vary_criterion_idx: int = Field(0, ge=0)
    method: str = Field("TOPSIS", pattern="^(TOPSIS|SAW)$")
    steps: int = Field(10, ge=3, le=20)
