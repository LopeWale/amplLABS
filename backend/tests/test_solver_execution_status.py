import asyncio

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.db.database as database
from app.db.database import Base
from app.models import AMPLModel, OptimizationRun
from app.api.routes import solver
from app.core.ampl_engine import SolveResult


def _configure_test_db(tmp_path, monkeypatch):
    db_path = tmp_path / "solver-status.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(database, "SessionLocal", testing_session_local)
    return testing_session_local


def _seed_run(session) -> OptimizationRun:
    model = AMPLModel(name="Test Model", model_content="var x; minimize z: x;")
    session.add(model)
    session.commit()
    session.refresh(model)

    run = OptimizationRun(
        model_id=model.id,
        data_file_id=None,
        solver_name="highs",
        solver_options={},
        status="queued",
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def test_execute_solver_marks_failed_on_engine_error(tmp_path, monkeypatch):
    testing_session_local = _configure_test_db(tmp_path, monkeypatch)
    session = testing_session_local()
    run = _seed_run(session)

    job_id = "job-failed"
    solver._job_status[job_id] = {"status": "queued", "progress": None, "result_id": None, "error": None}

    async def fake_solve_model(**_kwargs):
        return SolveResult(status="error", error_message="solver crashed", solver_output="solver crashed")

    monkeypatch.setattr(solver.ampl_engine, "solve_model", fake_solve_model)

    asyncio.run(
        solver._execute_solver(
            job_id=job_id,
            run_id=run.id,
            model_content="var x; minimize z: x;",
            data_content=None,
            solver="highs",
            options={},
            timeout=60,
        )
    )

    session.expire_all()
    updated = session.query(OptimizationRun).filter(OptimizationRun.id == run.id).one()
    assert updated.status == "error"
    assert "solver crashed" in (updated.error_message or "")
    assert solver._job_status[job_id]["status"] == "failed"
    assert solver._job_status[job_id]["result_id"] == run.id
    session.close()


def test_execute_solver_marks_completed_for_terminal_success(tmp_path, monkeypatch):
    testing_session_local = _configure_test_db(tmp_path, monkeypatch)
    session = testing_session_local()
    run = _seed_run(session)

    job_id = "job-completed"
    solver._job_status[job_id] = {"status": "queued", "progress": None, "result_id": None, "error": None}

    async def fake_solve_model(**_kwargs):
        return SolveResult(
            status="optimal",
            objective_value=42.0,
            solve_time=0.1,
            variables={},
            constraints={},
            solver_output="ok",
        )

    monkeypatch.setattr(solver.ampl_engine, "solve_model", fake_solve_model)

    asyncio.run(
        solver._execute_solver(
            job_id=job_id,
            run_id=run.id,
            model_content="var x; minimize z: x;",
            data_content=None,
            solver="highs",
            options={},
            timeout=60,
        )
    )

    session.expire_all()
    updated = session.query(OptimizationRun).filter(OptimizationRun.id == run.id).one()
    assert updated.status == "optimal"
    assert updated.objective_value == 42.0
    assert solver._job_status[job_id]["status"] == "completed"
    assert solver._job_status[job_id]["result_id"] == run.id
    session.close()
