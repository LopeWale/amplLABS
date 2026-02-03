"""API routes for file import/export operations."""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from app.db.database import get_db
from app.models import AMPLModel, DataFile

router = APIRouter()


@router.post("/import/mod")
async def import_mod_file(
    file: UploadFile = File(...),
    name: str | None = None,
    db: Session = Depends(get_db),
):
    """Import an existing .mod file and create a new model."""
    if not file.filename.endswith('.mod'):
        raise HTTPException(status_code=400, detail="File must be a .mod file")

    try:
        content = await file.read()
        model_content = content.decode('utf-8')

        model_name = name or file.filename.replace('.mod', '')

        # Create the model
        db_model = AMPLModel(
            name=model_name,
            description=f"Imported from {file.filename}",
            model_content=model_content,
            tags=["imported"],
        )
        db.add(db_model)
        db.commit()
        db.refresh(db_model)

        return {
            "id": db_model.id,
            "name": db_model.name,
            "message": f"Successfully imported {file.filename}",
        }

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported. Please use UTF-8.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import file: {str(e)}")


@router.post("/import/dat/{model_id}")
async def import_dat_file(
    model_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Import a .dat file for an existing model."""
    if not file.filename.endswith('.dat'):
        raise HTTPException(status_code=400, detail="File must be a .dat file")

    # Check model exists
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        content = await file.read()
        data_content = content.decode('utf-8')

        # Create data file
        db_file = DataFile(
            model_id=model_id,
            name=file.filename,
            file_content=data_content,
            file_type="dat",
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        return {
            "id": db_file.id,
            "name": db_file.name,
            "model_id": model_id,
            "message": f"Successfully imported {file.filename}",
        }

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported. Please use UTF-8.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import file: {str(e)}")


@router.post("/import/bundle")
async def import_mod_dat_bundle(
    mod_file: UploadFile = File(...),
    dat_file: UploadFile = File(None),
    name: str | None = None,
    db: Session = Depends(get_db),
):
    """Import both .mod and .dat files together."""
    if not mod_file.filename.endswith('.mod'):
        raise HTTPException(status_code=400, detail="First file must be a .mod file")

    if dat_file and not dat_file.filename.endswith('.dat'):
        raise HTTPException(status_code=400, detail="Second file must be a .dat file")

    try:
        # Read model file
        mod_content = (await mod_file.read()).decode('utf-8')
        model_name = name or mod_file.filename.replace('.mod', '')

        # Create model
        db_model = AMPLModel(
            name=model_name,
            description=f"Imported from {mod_file.filename}",
            model_content=mod_content,
            tags=["imported"],
        )
        db.add(db_model)
        db.commit()
        db.refresh(db_model)

        result = {
            "model_id": db_model.id,
            "model_name": db_model.name,
            "data_file_id": None,
        }

        # Import data file if provided
        if dat_file:
            dat_content = (await dat_file.read()).decode('utf-8')
            db_file = DataFile(
                model_id=db_model.id,
                name=dat_file.filename,
                file_content=dat_content,
                file_type="dat",
            )
            db.add(db_file)
            db.commit()
            db.refresh(db_file)
            result["data_file_id"] = db_file.id

        return result

    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import: {str(e)}")


@router.get("/export/mod/{model_id}")
async def export_mod_file(model_id: int, db: Session = Depends(get_db)):
    """Export a model as a .mod file."""
    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    content = model.model_content.encode('utf-8')
    filename = f"{model.name.replace(' ', '_')}.mod"

    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/dat/{data_file_id}")
async def export_dat_file(data_file_id: int, db: Session = Depends(get_db)):
    """Export a data file as a .dat file."""
    data_file = db.query(DataFile).filter(DataFile.id == data_file_id).first()
    if not data_file:
        raise HTTPException(status_code=404, detail="Data file not found")

    content = data_file.file_content.encode('utf-8')
    filename = data_file.name if data_file.name.endswith('.dat') else f"{data_file.name}.dat"

    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/bundle/{model_id}")
async def export_bundle(model_id: int, db: Session = Depends(get_db)):
    """Export model and all data files as a ZIP bundle."""
    import zipfile

    model = db.query(AMPLModel).filter(AMPLModel.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add model file
        mod_filename = f"{model.name.replace(' ', '_')}.mod"
        zip_file.writestr(mod_filename, model.model_content)

        # Add all data files
        for data_file in model.data_files:
            dat_filename = data_file.name if data_file.name.endswith('.dat') else f"{data_file.name}.dat"
            zip_file.writestr(dat_filename, data_file.file_content)

    zip_buffer.seek(0)
    zip_filename = f"{model.name.replace(' ', '_')}_bundle.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )
