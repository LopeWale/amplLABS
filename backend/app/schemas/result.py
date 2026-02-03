from datetime import datetime
from pydantic import BaseModel


class VariableResultResponse(BaseModel):
    """Schema for variable result response."""

    id: int
    variable_name: str
    indices: list | None
    value: float | None
    reduced_cost: float | None
    lower_bound: float | None
    upper_bound: float | None

    class Config:
        from_attributes = True


class ConstraintResultResponse(BaseModel):
    """Schema for constraint result response."""

    id: int
    constraint_name: str
    indices: list | None
    body: float | None
    dual: float | None
    slack: float | None
    lower_bound: float | None
    upper_bound: float | None

    class Config:
        from_attributes = True


class OptimizationRunResponse(BaseModel):
    """Schema for optimization run response."""

    id: int
    model_id: int
    data_file_id: int | None
    solver_name: str
    solver_options: dict
    status: str
    error_message: str | None
    objective_value: float | None
    solve_time: float | None
    iterations: int | None
    nodes: int | None
    gap: float | None
    solver_output: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class OptimizationRunDetail(OptimizationRunResponse):
    """Detailed optimization run with variables and constraints."""

    variable_results: list[VariableResultResponse] = []
    constraint_results: list[ConstraintResultResponse] = []
