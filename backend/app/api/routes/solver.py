"""API routes for solver execution."""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models import AMPLModel, DataFile, OptimizationRun, VariableResult, ConstraintResult
from app.schemas.solver import (
    SolverRunRequest,
    SolverRunResponse,
    SolverStatus,
    SolverInfo,
    SolverResultSummary,
    SolverResultList,
)
from app.core.ampl_engine import ampl_engine

router = APIRouter()

# In-memory job tracking (in production, use Redis or similar)
_job_status: dict[str, dict] = {}


@router.get("/solvers", response_model=list[SolverInfo])
async def list_solvers():
    """List all available solvers."""
    return ampl_engine.get_available_solvers()


@router.post("/run", response_model=SolverRunResponse)
async def run_solver(
    request: SolverRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Execute an optimization model."""
    # Verify model exists
    model = db.query(AMPLModel).filter(AMPLModel.id == request.model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Get data file if specified
    data_content = None
    if request.data_file_id:
        data_file = (
            db.query(DataFile)
            .filter(DataFile.id == request.data_file_id)
            .first()
        )
        if not data_file:
            raise HTTPException(status_code=404, detail="Data file not found")
        data_content = data_file.file_content

    # Create job ID
    job_id = str(uuid.uuid4())

    # Initialize job status
    _job_status[job_id] = {
        "status": "queued",
        "progress": None,
        "result_id": None,
        "error": None,
    }

    # Create optimization run record
    opt_run = OptimizationRun(
        model_id=request.model_id,
        data_file_id=request.data_file_id,
        solver_name=request.solver,
        solver_options=request.options,
        status="queued",
    )
    db.add(opt_run)
    db.commit()
    db.refresh(opt_run)

    # Run solver in background
    background_tasks.add_task(
        _execute_solver,
        job_id=job_id,
        run_id=opt_run.id,
        model_content=model.model_content,
        data_content=data_content,
        solver=request.solver,
        options=request.options,
        timeout=request.timeout,
    )

    return SolverRunResponse(
        job_id=job_id,
        status="queued",
        message="Optimization job queued",
    )


def _serialize_run(opt_run: OptimizationRun) -> SolverResultSummary:
    """Serialize optimization run for API responses."""
    return SolverResultSummary(
        id=opt_run.id,
        model_id=opt_run.model_id,
        model_name=opt_run.model.name if opt_run.model else None,
        data_file_id=opt_run.data_file_id,
        solver_name=opt_run.solver_name,
        solver_options=opt_run.solver_options or {},
        status=opt_run.status,
        objective_value=opt_run.objective_value,
        solve_time=opt_run.solve_time,
        iterations=opt_run.iterations,
        nodes=opt_run.nodes,
        gap=opt_run.gap,
        solver_output=opt_run.solver_output,
        sensitivity_data=opt_run.sensitivity_data,
        error_message=opt_run.error_message,
        started_at=opt_run.started_at,
        completed_at=opt_run.completed_at,
        created_at=opt_run.created_at,
    )


@router.get("/results", response_model=SolverResultList)
async def list_results(
    skip: int = 0,
    limit: int = 50,
    model_id: int | None = None,
    db: Session = Depends(get_db),
):
    """List persisted optimization results."""
    query = db.query(OptimizationRun)
    if model_id is not None:
        query = query.filter(OptimizationRun.model_id == model_id)

    total = query.with_entities(func.count(OptimizationRun.id)).scalar() or 0
    runs = (
        query.order_by(OptimizationRun.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return SolverResultList(total=total, items=[_serialize_run(run) for run in runs])


@router.get("/results/{result_id}", response_model=SolverResultSummary)
async def get_result(result_id: int, db: Session = Depends(get_db)):
    """Get a specific optimization result."""
    run = db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Result not found")
    return _serialize_run(run)


async def _execute_solver(
    job_id: str,
    run_id: int,
    model_content: str,
    data_content: str | None,
    solver: str,
    options: dict,
    timeout: int,
):
    """Background task to execute the solver."""
    from app.db.database import SessionLocal

    db = SessionLocal()

    try:
        # Update status
        _job_status[job_id]["status"] = "running"

        opt_run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
        opt_run.status = "running"
        opt_run.started_at = datetime.utcnow()
        db.commit()

        # Define progress callback
        def progress_callback(progress: dict):
            _job_status[job_id]["progress"] = progress

        # Execute solver
        result = await ampl_engine.solve_model(
            model_content=model_content,
            data_content=data_content,
            solver=solver,
            options=options,
            timeout=timeout,
            progress_callback=progress_callback,
        )

        # Update optimization run with results
        normalized_status = "error" if result.status == "error" else result.status
        opt_run.status = normalized_status
        opt_run.objective_value = result.objective_value
        opt_run.solve_time = result.solve_time
        opt_run.iterations = result.iterations
        opt_run.nodes = result.nodes
        opt_run.gap = result.gap
        opt_run.solver_output = result.solver_output
        opt_run.error_message = result.error_message
        opt_run.completed_at = datetime.utcnow()

        if normalized_status == "error":
            db.commit()
            _job_status[job_id]["status"] = "failed"
            _job_status[job_id]["result_id"] = run_id
            _job_status[job_id]["error"] = result.error_message or "Solver execution failed"
            return

        # Store variable results
        for var_name, var_data in result.variables.items():
            for v in var_data:
                var_result = VariableResult(
                    optimization_run_id=run_id,
                    variable_name=var_name,
                    indices=v.get("index"),
                    value=v.get("value"),
                    reduced_cost=v.get("rc"),
                    lower_bound=v.get("lb"),
                    upper_bound=v.get("ub"),
                )
                db.add(var_result)

        # Store constraint results
        for con_name, con_data in result.constraints.items():
            for c in con_data:
                con_result = ConstraintResult(
                    optimization_run_id=run_id,
                    constraint_name=con_name,
                    indices=c.get("index"),
                    body=c.get("body"),
                    dual=c.get("dual"),
                    slack=c.get("slack"),
                    lower_bound=c.get("lb"),
                    upper_bound=c.get("ub"),
                )
                db.add(con_result)

        db.commit()

        # Update job status
        _job_status[job_id]["status"] = "completed"
        _job_status[job_id]["result_id"] = run_id

    except Exception as e:
        _job_status[job_id]["status"] = "failed"
        _job_status[job_id]["error"] = str(e)

        opt_run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
        if opt_run:
            opt_run.status = "error"
            opt_run.error_message = str(e)
            opt_run.completed_at = datetime.utcnow()
            db.commit()

    finally:
        db.close()


@router.get("/status/{job_id}", response_model=SolverStatus)
async def get_job_status(job_id: str):
    """Get the status of a solver job."""
    if job_id not in _job_status:
        raise HTTPException(status_code=404, detail="Job not found")

    status = _job_status[job_id]
    return SolverStatus(
        job_id=job_id,
        status=status["status"],
        progress=status["progress"],
        result_id=status["result_id"],
        error=status["error"],
    )


@router.post("/cancel/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running solver job."""
    if job_id not in _job_status:
        raise HTTPException(status_code=404, detail="Job not found")

    # Note: Full cancellation requires more complex job management
    _job_status[job_id]["status"] = "cancelled"
    return {"message": "Cancellation requested"}
