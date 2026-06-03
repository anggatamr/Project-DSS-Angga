import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Sistem Pendukung Keputusan TPK"
    
    # Use a writable /tmp directory if running in container environments like Hugging Face
    DATABASE_URL: str = (
        "sqlite:////tmp/dss_database.db"
        if os.environ.get("RUNNING_IN_DOCKER") or os.environ.get("HF_SPACE") or not os.access(".", os.W_OK)
        else "sqlite:///./dss_database.db"
    )

    class Config:
        case_sensitive = True

settings = Settings()
