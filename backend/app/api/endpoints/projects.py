import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
import io

from app.models.database import get_db, Project, Criteria, Alternative, MatrixValue
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectDetailResponse, ProjectSetupRequest

router = APIRouter()

# ─── Static routes first (must come before /{id} to avoid path param collision) ───

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(title=project_in.title)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.created_at.desc()).all()

@router.get("/laptop/dataset-sample")
def get_laptop_dataset_sample():
    """
    Loads and parses the laptop dataset.
    Returns criteria definitions, alternative names, and matrix values for the first 30 laptops.
    """
    possible_paths = [
        "/code/laptop_price - dataset.csv",
        "./laptop_price - dataset.csv",
        "../laptop_price - dataset.csv",
        "laptop_price - dataset.csv",
    ]

    df = None
    for p in possible_paths:
        if os.path.exists(p):
            try:
                df = pd.read_csv(p)
                break
            except Exception:
                continue

    if df is None:
        raise HTTPException(status_code=404, detail="Dataset laptop_price - dataset.csv tidak ditemukan di server.")

    df_sample = df.head(30).copy()

    criterias = [
        {"name": "RAM (GB)", "weight": 0.25, "type": "benefit"},
        {"name": "CPU_Frequency (GHz)", "weight": 0.20, "type": "benefit"},
        {"name": "Weight (kg)", "weight": 0.15, "type": "cost"},
        {"name": "Price (Euro)", "weight": 0.30, "type": "cost"},
        {"name": "Inches", "weight": 0.10, "type": "benefit"},
    ]

    alternatives = []
    matrix = []

    for idx, row in df_sample.iterrows():
        company = str(row['Company']).strip()
        product = str(row['Product']).strip().replace('"', '')
        alternatives.append({"name": f"{company} {product}"})

        try: ram = float(row['RAM (GB)'])
        except Exception: ram = 8.0
        try: cpu_freq = float(row['CPU_Frequency (GHz)'])
        except Exception: cpu_freq = 2.0
        try: weight = float(row['Weight (kg)'])
        except Exception: weight = 1.8
        try: price = float(row['Price (Euro)'])
        except Exception: price = 500.0
        try: inches = float(row['Inches'])
        except Exception: inches = 15.6

        matrix.append([ram, cpu_freq, weight, price, inches])

    return {"criterias": criterias, "alternatives": alternatives, "matrix": matrix}


@router.get("/recruitment/dataset-sample")
def get_recruitment_dataset_sample():
    """
    Loads and parses the recruitment dataset.
    Returns criteria definitions, alternative names, and matrix values for the first 10 candidates.
    """
    possible_paths = [
        "/code/recruitment_data.csv",
        "./recruitment_data.csv",
        "../recruitment_data.csv",
        "recruitment_data.csv",
    ]

    df = None
    for p in possible_paths:
        if os.path.exists(p):
            try:
                df = pd.read_csv(p)
                break
            except Exception:
                continue

    if df is None:
        raise HTTPException(status_code=404, detail="Dataset recruitment_data.csv tidak ditemukan di server.")

    df_sample = df.head(10).copy()

    criterias = [
        {"name": "Pengalaman (Tahun)", "weight": 0.25, "type": "benefit"},
        {"name": "Skor Interview", "weight": 0.30, "type": "benefit"},
        {"name": "Skor Skill", "weight": 0.25, "type": "benefit"},
        {"name": "Skor Kepribadian", "weight": 0.20, "type": "benefit"},
    ]

    alternatives = []
    matrix = []

    for idx, row in df_sample.iterrows():
        alternatives.append({"name": f"Kandidat {idx + 1}"})

        try: exp = float(row.get('ExperienceYears', 0))
        except Exception: exp = 0.0
        try: interview = float(row.get('InterviewScore', 50))
        except Exception: interview = 50.0
        try: skill = float(row.get('SkillScore', 50))
        except Exception: skill = 50.0
        try: personality = float(row.get('PersonalityScore', 50))
        except Exception: personality = 50.0

        matrix.append([exp, interview, skill, personality])

    return {"criterias": criterias, "alternatives": alternatives, "matrix": matrix}


@router.post("/import-csv")
def import_csv_file(file: UploadFile = File(...)):
    """
    Parses an uploaded CSV/Excel file, returns columns and the first 5 rows.
    """
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Format berkas harus .csv, .xls, atau .xlsx")

    try:
        contents = file.file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Ukuran berkas melebihi batas 5 MB")

        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))

        return {
            "columns": df.columns.tolist(),
            "sample_rows": df.head(5).fillna("").to_dict(orient="records"),
            "total_rows": len(df),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses file: {str(e)}")


# ─── Dynamic /{id} routes below static routes ───

@router.get("/{id}", response_model=ProjectDetailResponse)
def get_project(id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
    return project

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
    db.delete(project)
    db.commit()
    return None

@router.post("/{id}/setup", response_model=ProjectDetailResponse)
def setup_project(id: str, payload: ProjectSetupRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")

    # Auto-normalize weights if not summing to 1
    total_weight = sum(c.weight for c in payload.criterias)
    if not (0.99 <= total_weight <= 1.01):
        if total_weight > 0:
            for c in payload.criterias:
                c.weight = c.weight / total_weight
        else:
            n_crits = len(payload.criterias)
            for c in payload.criterias:
                c.weight = 1.0 / n_crits

    # Clear existing data
    db.query(MatrixValue).filter(MatrixValue.project_id == id).delete()
    db.query(Criteria).filter(Criteria.project_id == id).delete()
    db.query(Alternative).filter(Alternative.project_id == id).delete()

    # Create Criterias
    criteria_objs = []
    for c in payload.criterias:
        crit = Criteria(project_id=id, name=c.name, weight=c.weight, type=c.type)
        db.add(crit)
        criteria_objs.append(crit)

    # Create Alternatives
    alternative_objs = []
    for a in payload.alternatives:
        alt = Alternative(project_id=id, name=a.name)
        db.add(alt)
        alternative_objs.append(alt)

    db.commit()

    for c in criteria_objs:
        db.refresh(c)
    for a in alternative_objs:
        db.refresh(a)

    # Create Matrix Values
    if len(payload.matrix) != len(alternative_objs):
        raise HTTPException(status_code=400, detail="Jumlah baris matriks harus sesuai dengan jumlah alternatif.")

    for alt_idx, row in enumerate(payload.matrix):
        if len(row) != len(criteria_objs):
            raise HTTPException(status_code=400, detail=f"Jumlah kolom pada baris matriks ke-{alt_idx} harus sesuai dengan jumlah kriteria.")
        for crit_idx, val in enumerate(row):
            if criteria_objs[crit_idx].type == "benefit" and val < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Nilai kriteria benefit '{criteria_objs[crit_idx].name}' untuk alternatif '{alternative_objs[alt_idx].name}' tidak boleh negatif ({val})."
                )
            db.add(MatrixValue(
                project_id=id,
                criteria_id=criteria_objs[crit_idx].id,
                alternative_id=alternative_objs[alt_idx].id,
                value=val,
            ))

    project.chosen_method = payload.chosen_method
    db.commit()
    db.refresh(project)
    return project
