import datetime
import uuid
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Integer, UniqueConstraint, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(100), nullable=False)
    chosen_method = Column(String(20), nullable=True) # e.g. SAW, TOPSIS, AHP
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    criterias = relationship("Criteria", back_populates="project", cascade="all, delete-orphan")
    alternatives = relationship("Alternative", back_populates="project", cascade="all, delete-orphan")
    matrix_values = relationship("MatrixValue", back_populates="project", cascade="all, delete-orphan")

class Criteria(Base):
    __tablename__ = "criterias"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    weight = Column(Float, nullable=False) # weight in range [0, 1]
    type = Column(String(7), nullable=False) # 'benefit' or 'cost'

    # Relationships
    project = relationship("Project", back_populates="criterias")
    matrix_values = relationship("MatrixValue", back_populates="criteria", cascade="all, delete-orphan")

class Alternative(Base):
    __tablename__ = "alternatives"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="alternatives")
    matrix_values = relationship("MatrixValue", back_populates="alternative", cascade="all, delete-orphan")

class MatrixValue(Base):
    __tablename__ = "matrix_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    criteria_id = Column(String, ForeignKey("criterias.id", ondelete="CASCADE"), nullable=False)
    alternative_id = Column(String, ForeignKey("alternatives.id", ondelete="CASCADE"), nullable=False)
    value = Column(Float, nullable=False)

    __table_args__ = (
        UniqueConstraint("project_id", "criteria_id", "alternative_id", name="unique_matrix_cell"),
    )

    # Relationships
    project = relationship("Project", back_populates="matrix_values")
    criteria = relationship("Criteria", back_populates="matrix_values")
    alternative = relationship("Alternative", back_populates="matrix_values")

# Database session setup — use centralized config to support different environments
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
