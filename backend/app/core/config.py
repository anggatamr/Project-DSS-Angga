import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sistem Pendukung Keputusan TPK"
    
    # SQLite Database URI
    DATABASE_URL: str = "sqlite:///./dss_database.db"

    class Config:
        case_sensitive = True

settings = Settings()
