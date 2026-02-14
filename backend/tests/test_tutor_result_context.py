import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.db.database import Base
from app.models import AMPLModel, OptimizationRun, VariableResult, ConstraintResult
from app.api.routes.tutor import _build_visualization_context


def _build_session(tmp_path):
    db_path = tmp_path / "tutor-context.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return testing_session_local


def test_build_visualization_context_includes_duals_and_variables(tmp_path):
    session_local = _build_session(tmp_path)
    session = session_local()

    model = AMPLModel(name="Tutor Model", model_content="var x; minimize z: x;")
    session.add(model)
    session.commit()
    session.refresh(model)

    run = OptimizationRun(
        model_id=model.id,
        solver_name="highs",
        solver_options={},
        status="optimal",
        objective_value=22.5,
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    session.add(
        VariableResult(
            optimization_run_id=run.id,
            variable_name="ship",
            indices=["A", "B"],
            value=15.0,
            reduced_cost=0.0,
            lower_bound=0.0,
            upper_bound=100.0,
        )
    )
    session.add(
        ConstraintResult(
            optimization_run_id=run.id,
            constraint_name="DemandMet",
            indices=["B"],
            body=15.0,
            dual=2.5,
            slack=0.0,
            lower_bound=15.0,
            upper_bound=None,
        )
    )
    session.commit()

    context = _build_visualization_context(session, run.id, "overall")
    assert f"Result ID: {run.id}" in context
    assert "Top non-zero variables:" in context
    assert "Top shadow prices (dual values):" in context
    assert "DemandMet" in context
    session.close()


def test_build_visualization_context_raises_for_missing_run(tmp_path):
    session_local = _build_session(tmp_path)
    session = session_local()
    with pytest.raises(HTTPException):
        _build_visualization_context(session, 9999, "overall")
    session.close()
