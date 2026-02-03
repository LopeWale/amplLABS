from pydantic import BaseModel, Field


class SolverRunRequest(BaseModel):
    """Schema for requesting a solver run."""

    model_id: int
    data_file_id: int | None = None
    solver: str = Field(default="highs")
    options: dict = Field(default_factory=dict)
    timeout: int = Field(default=300, ge=1, le=3600)  # 1 sec to 1 hour


class SolverRunResponse(BaseModel):
    """Schema for solver run response."""

    job_id: str
    status: str
    message: str


class SolverStatus(BaseModel):
    """Schema for solver job status."""

    job_id: str
    status: str  # queued, running, completed, failed
    progress: dict | None = None
    result_id: int | None = None
    error: str | None = None


class SolverInfo(BaseModel):
    """Schema for solver information."""

    name: str
    available: bool
    description: str
    supports: list[str]  # ["LP", "MIP", "QP"]


class SolverCompareRequest(BaseModel):
    """Schema for comparing multiple solvers."""

    model_id: int
    data_file_id: int | None = None
    solvers: list[str] = Field(..., min_length=1)
    options: dict = Field(default_factory=dict)
