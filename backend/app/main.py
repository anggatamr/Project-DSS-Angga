from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import uvicorn

from app.core.config import settings
from app.models.database import Base, engine, get_db
from app.api.router import api_router
from app.services.pdf_generator import generate_pdf_report

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API untuk Sistem Pendukung Keputusan (DSS) Teori Pengambilan Keputusan",
    version="1.0.0"
)

# CORS Policy
origins = [
    "http://localhost:5173", # Vite React default
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*" # Fallback
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Additional direct route for PDF download
@app.get(f"{settings.API_V1_STR}/projects/{{project_id}}/report")
def download_project_report(project_id: str, db: Session = Depends(get_db)):
    """
    Generates and downloads the academic PDF report for the project.
    """
    try:
        pdf_buffer = generate_pdf_report(project_id, db)
        headers = {
            'Content-Disposition': f'attachment; filename="laporan_spk_{project_id}.pdf"'
        }
        return StreamingResponse(pdf_buffer, headers=headers, media_type='application/pdf')
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat laporan PDF: {str(e)}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Backend Sistem Pendukung Keputusan TPK aktif.",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
