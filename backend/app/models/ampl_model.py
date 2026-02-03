from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.database import Base


class AMPLModel(Base):
    """Stores AMPL model (.mod) files."""

    __tablename__ = "ampl_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    model_content = Column(Text, nullable=False)  # The .mod file content
    problem_type = Column(String(50), nullable=True)  # LP, MIP, NLP, etc.
    tags = Column(JSON, default=list)  # ["transportation", "assignment"]
    is_template = Column(Boolean, default=False)  # Built-in example models
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    data_files = relationship(
        "DataFile", back_populates="model", cascade="all, delete-orphan"
    )
    optimization_runs = relationship(
        "OptimizationRun", back_populates="model", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<AMPLModel(id={self.id}, name='{self.name}')>"


class DataFile(Base):
    """Stores AMPL data (.dat) files linked to models."""

    __tablename__ = "data_files"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ampl_models.id"), nullable=False)
    name = Column(String(255), nullable=False)
    file_content = Column(Text, nullable=False)  # The .dat file content
    file_type = Column(String(10), default="dat")  # dat, excel_import
    source_excel_path = Column(String(500), nullable=True)  # If imported from Excel
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    model = relationship("AMPLModel", back_populates="data_files")
    optimization_runs = relationship("OptimizationRun", back_populates="data_file")

    def __repr__(self):
        return f"<DataFile(id={self.id}, name='{self.name}')>"
