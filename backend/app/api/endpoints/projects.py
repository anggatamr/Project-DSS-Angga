import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import io

from app.models.database import get_db, Project, Criteria, Alternative, MatrixValue
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectDetailResponse, ProjectSetupRequest

router = APIRouter()

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
    
    # Validation checks
    # Check if sum of weights is ~1.0
    total_weight = sum(c.weight for c in payload.criterias)
    if not (0.99 <= total_weight <= 1.01):
        # Auto-normalize weights if not summing to 1
        if total_weight > 0:
            for c in payload.criterias:
                c.weight = c.weight / total_weight
        else:
            # Equal weight
            n_crits = len(payload.criterias)
            for c in payload.criterias:
                c.weight = 1.0 / n_crits

    # Clear existing criterias, alternatives, and matrix values
    db.query(MatrixValue).filter(MatrixValue.project_id == id).delete()
    db.query(Criteria).filter(Criteria.project_id == id).delete()
    db.query(Alternative).filter(Alternative.project_id == id).delete()

    # 1. Create Criterias
    criteria_objs = []
    for c in payload.criterias:
        crit = Criteria(
            project_id=id,
            name=c.name,
            weight=c.weight,
            type=c.type
        )
        db.add(crit)
        criteria_objs.append(crit)
    
    # 2. Create Alternatives
    alternative_objs = []
    for a in payload.alternatives:
        alt = Alternative(
            project_id=id,
            name=a.name
        )
        db.add(alt)
        alternative_objs.append(alt)
        
    db.commit() # Save to generate IDs
    
    # Refresh to load IDs
    for c in criteria_objs:
        db.refresh(c)
    for a in alternative_objs:
        db.refresh(a)

    # 3. Create Matrix Values
    # Payload matrix is 2D: matrix[alt_idx][crit_idx]
    if len(payload.matrix) != len(alternative_objs):
        raise HTTPException(status_code=400, detail="Jumlah baris matriks harus sesuai dengan jumlah alternatif.")
    
    for alt_idx, row in enumerate(payload.matrix):
        if len(row) != len(criteria_objs):
            raise HTTPException(status_code=400, detail=f"Jumlah kolom pada baris matriks ke-{alt_idx} harus sesuai dengan jumlah kriteria.")
        for crit_idx, val in enumerate(row):
            # Benefit criteria cannot have negative values
            if criteria_objs[crit_idx].type == "benefit" and val < 0:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Nilai kriteria benefit '{criteria_objs[crit_idx].name}' untuk alternatif '{alternative_objs[alt_idx].name}' tidak boleh negatif ({val})."
                )
            
            # Avoid Division by Zero checks are performed during computation, but we save the cells here
            cell = MatrixValue(
                project_id=id,
                criteria_id=criteria_objs[crit_idx].id,
                alternative_id=alternative_objs[alt_idx].id,
                value=val
            )
            db.add(cell)

    # Update chosen method
    project.chosen_method = payload.chosen_method
    db.commit()
    db.refresh(project)
    
    return project

@router.get("/laptop/dataset-sample")
def get_laptop_dataset_sample():
    """
    Loads and parses the provided laptop dataset from the workspace root directory.
    Returns the criteria definitions, alternative names, and matrix values for the first 30 laptops.
    """
    # Look for the dataset file
    possible_paths = [
        "../laptop_price - dataset.csv",
        "./laptop_price - dataset.csv",
        "laptop_price - dataset.csv",
        "../../laptop_price - dataset.csv",
        # Absolute path in workspace
        "c:/Users/Angga/Documents/Percodingan Duniawi/Project-DSS-Angga/laptop_price - dataset.csv"
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
    
    # We select 30 laptops for the demo to prevent frontend rendering lag
    df_sample = df.head(30).copy()
    
    # Map columns to Criteria:
    # 1. RAM (GB) -> Benefit, Weight = 0.25
    # 2. CPU_Frequency (GHz) -> Benefit, Weight = 0.20
    # 3. Weight (kg) -> Cost, Weight = 0.15
    # 4. Price (Euro) -> Cost, Weight = 0.30
    # 5. Inches -> Benefit, Weight = 0.10
    
    criterias = [
        {"name": "RAM (GB)", "weight": 0.25, "type": "benefit"},
        {"name": "CPU_Frequency (GHz)", "weight": 0.20, "type": "benefit"},
        {"name": "Weight (kg)", "weight": 0.15, "type": "cost"},
        {"name": "Price (Euro)", "weight": 0.30, "type": "cost"},
        {"name": "Inches", "weight": 0.10, "type": "benefit"}
    ]
    
    alternatives = []
    matrix = []
    
    for idx, row in df_sample.iterrows():
        # Alternative name: Company + Product (clean from excessive quotes)
        company = str(row['Company']).strip()
        product = str(row['Product']).strip().replace('"', '')
        alt_name = f"{company} {product}"
        alternatives.append({"name": alt_name})
        
        # Get numerical values, cleaning up if needed
        try:
            ram = float(row['RAM (GB)'])
        except Exception:
            ram = 8.0
            
        try:
            cpu_freq = float(row['CPU_Frequency (GHz)'])
        except Exception:
            cpu_freq = 2.0
            
        try:
            weight = float(row['Weight (kg)'])
        except Exception:
            weight = 1.8
            
        try:
            price = float(row['Price (Euro)'])
        except Exception:
            price = 500.0
            
        try:
            inches = float(row['Inches'])
        except Exception:
            inches = 15.6
            
        matrix.append([ram, cpu_freq, weight, price, inches])
        
    return {
        "criterias": criterias,
        "alternatives": alternatives,
        "matrix": matrix
    }

@router.post("/import-csv")
def import_csv_file(file: UploadFile = File(...)):
    """
    Parses an uploaded CSV file, returns columns and the first 5 rows
    to let the user map criteria and alternative columns in the frontend.
    """
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Format berkas harus .csv, .xls, atau .xlsx")
        
    try:
        contents = file.file.read()
        # Limit file size to 5MB
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Ukuran berkas melebihi batas 5 MB")
            
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        columns = df.columns.tolist()
        sample_rows = df.head(5).fillna("").to_dict(orient="records")
        total_rows = len(df)
        
        return {
            "columns": columns,
            "sample_rows": sample_rows,
            "total_rows": total_rows
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memproses file: {str(e)}")
