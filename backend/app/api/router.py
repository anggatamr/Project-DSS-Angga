from fastapi import APIRouter
from app.api.endpoints import projects, solver, analytics, ml_solver

api_router = APIRouter()

api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(solver.router, prefix="/solver", tags=["solver"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(ml_solver.router, prefix="/ml", tags=["Machine Learning"])
