from datetime import datetime
from pydantic import BaseModel, Field


class ModelCreate(BaseModel):
    """Schema for creating a new AMPL model."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    model_content: str = Field(..., min_length=1)
    problem_type: str | None = Field(None, pattern="^(LP|MIP|NLP|QP|MINLP)$")
    tags: list[str] = Field(default_factory=list)


class ModelUpdate(BaseModel):
    """Schema for updating an AMPL model."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    model_content: str | None = None
    problem_type: str | None = None
    tags: list[str] | None = None


class ModelResponse(BaseModel):
    """Schema for AMPL model response."""

    id: int
    name: str
    description: str | None
    model_content: str
    problem_type: str | None
    tags: list[str]
    is_template: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataFileCreate(BaseModel):
    """Schema for creating a data file."""

    name: str = Field(..., min_length=1, max_length=255)
    file_content: str = Field(..., min_length=1)
    file_type: str = Field(default="dat", pattern="^(dat|excel_import)$")


class DataFileResponse(BaseModel):
    """Schema for data file response."""

    id: int
    model_id: int
    name: str
    file_content: str
    file_type: str
    source_excel_path: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
