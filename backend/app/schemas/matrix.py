from pydantic import BaseModel, Field
from typing import List, Optional

class MatrixValidateRequest(BaseModel):
    matrix: List[List[float]]
    weights: List[float]
    criterias_types: List[str] # List of "benefit" or "cost"

class AHPValidateRequest(BaseModel):
    criteria_names: List[str]
    pairwise_matrix: List[List[float]] # nxn pairwise comparison matrix

class AHPValidateResponse(BaseModel):
    eigenvalues: List[float]
    eigenvector: List[float] # weights derived
    max_eigenvalue: float # lambda_max
    consistency_index: float # CI
    consistency_ratio: float # CR
    is_consistent: bool # CR <= 0.1

class SolverCalculateRequest(BaseModel):
    project_id: str
    method: str = Field("TOPSIS", pattern="^(SAW|TOPSIS)$")

class SolverSensitivityRequest(BaseModel):
    project_id: str
    modified_weights: List[float] # List of new weights corresponding to criteria order
