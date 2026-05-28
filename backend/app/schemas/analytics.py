from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class WhatIfRequest(BaseModel):
    matrix: List[List[float]]
    weights: List[float]
    criterias_types: List[str]
    method: str = Field("TOPSIS", pattern="^(SAW|TOPSIS)$")

class GoalSeekRequest(BaseModel):
    project_id: str
    target_alternative_id: str
    changing_criteria_id: str
    target_rank: int = Field(1, ge=1)

class GoalSeekResponse(BaseModel):
    success: bool
    message: str
    current_value: float
    target_value: Optional[float] = None
    target_rank: int
    direction: str # "lower" (for cost) or "higher" (for benefit)
    criteria_name: str
    alternative_name: str

class RiskMonteRequest(BaseModel):
    project_id: str
    iterations: int = Field(1000, ge=10, le=10000)
    perturbation_percent: float = Field(0.05, ge=0.01, le=0.5)

class RiskMonteAlternativeRate(BaseModel):
    alternative_id: str
    alternative_name: str
    stability_rate: float # Percentage in [0, 100]

class RiskMonteResponse(BaseModel):
    project_title: str
    iterations: int
    perturbation: float
    stability_rates: List[RiskMonteAlternativeRate]
