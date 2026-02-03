"""API routes for AMPL model management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import AMPLModel, DataFile
from app.schemas.model import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    DataFileCreate,
    DataFileResponse,
)
from app.core.ampl_engine import ampl_engine

router = APIRouter()


@router.get("", response_model=list[ModelResponse])
async def list_models(
    skip: int = 0,
    limit: int = 100,
    problem_type: str | None = None,
    db: Session = Depends(get_db),
):
    """List all AMPL models."""
    query = db.query(AMPLModel)

    if problem_type:
        query = query.filter(AMPLModel.problem_type == problem_type)

    models = query.offset(skip).limit(limit).all()
    return models


@router.post("", response_model=ModelResponse, status_code=201)
async def create_model(model: ModelCreate, db: Session = Depends(get_db)):
    """Create a new AMPL model."""
    db_model = AMPLModel(
        name=model.name,
        description=model.description,
        model_content=model.model_content,
        problem_type=model.problem_type,
        tags=model.tags,
    )
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: int, db: Session = Depends(get_db)):
    """Get a specific AMPL model by ID."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: int, model_update: ModelUpdate, db: Session = Depends(get_db)
):
    """Update an AMPL model."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    update_data = model_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(model, key, value)

    db.commit()
    db.refresh(model)
    return model


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: int, db: Session = Depends(get_db)):
    """Delete an AMPL model."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    db.delete(model)
    db.commit()


@router.post("/{model_id}/validate")
async def validate_model(model_id: int, db: Session = Depends(get_db)):
    """Validate an AMPL model's syntax."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    result = ampl_engine.validate_model(model.model_content)
    return result


@router.get("/{model_id}/info")
async def get_model_info(model_id: int, db: Session = Depends(get_db)):
    """Get information about model structure (sets, params, vars)."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Get the first data file if available
    data_content = None
    if model.data_files:
        data_content = model.data_files[0].file_content

    result = ampl_engine.get_model_info(model.model_content, data_content)
    return result


# Data file routes
@router.get("/{model_id}/data-files", response_model=list[DataFileResponse])
async def list_data_files(model_id: int, db: Session = Depends(get_db)):
    """List all data files for a model."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    return model.data_files


@router.post("/{model_id}/data-files", response_model=DataFileResponse, status_code=201)
async def create_data_file(
    model_id: int, data_file: DataFileCreate, db: Session = Depends(get_db)
):
    """Create a data file for a model."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    db_file = DataFile(
        model_id=model_id,
        name=data_file.name,
        file_content=data_file.file_content,
        file_type=data_file.file_type,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


@router.delete("/{model_id}/data-files/{file_id}", status_code=204)
async def delete_data_file(model_id: int, file_id: int, db: Session = Depends(get_db)):
    """Delete a data file."""
    data_file = (
        db.query(DataFile)
        .filter(DataFile.id == file_id, DataFile.model_id == model_id)
        .first()
    )
    if not data_file:
        raise HTTPException(status_code=404, detail="Data file not found")

    db.delete(data_file)
    db.commit()
