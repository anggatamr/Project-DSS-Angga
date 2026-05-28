from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CriteriaBase(BaseModel):
    name: str = Field(..., max_length=50)
    weight: float = Field(..., ge=0, le=1)
    type: str = Field(..., pattern="^(benefit|cost)$")

class CriteriaResponse(CriteriaBase):
    id: str

    class Config:
        from_attributes = True

class AlternativeBase(BaseModel):
    name: str = Field(..., max_length=100)

class AlternativeResponse(AlternativeBase):
    id: str

    class Config:
        from_attributes = True

class MatrixValueResponse(BaseModel):
    criteria_id: str
    alternative_id: str
    value: float

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str = Field(..., max_length=100)

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    chosen_method: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    criterias: List[CriteriaResponse] = []
    alternatives: List[AlternativeResponse] = []
    matrix_values: List[MatrixValueResponse] = []

    class Config:
        from_attributes = True

class ProjectSetupRequest(BaseModel):
    criterias: List[CriteriaBase]
    alternatives: List[AlternativeBase]
    matrix: List[List[float]] # matrix[alt_idx][crit_idx]
    chosen_method: Optional[str] = "TOPSIS"
