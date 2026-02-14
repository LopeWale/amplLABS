from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base, get_db
from app.models import AMPLModel, OptimizationRun
from app.api.routes import solver


def _build_test_client(tmp_path):
    db_path = tmp_path / "solver-results.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    app = FastAPI()
    app.include_router(solver.router, prefix="/api/v1/solver")

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), testing_session_local


def _seed_results(session):
    model = AMPLModel(name="History Model", model_content="var x; minimize z: x;")
    session.add(model)
    session.commit()
    session.refresh(model)

    run_1 = OptimizationRun(
        model_id=model.id,
        solver_name="highs",
        solver_options={},
        status="optimal",
        objective_value=10.0,
    )
    run_2 = OptimizationRun(
        model_id=model.id,
        solver_name="highs",
        solver_options={},
        status="infeasible",
    )
    session.add_all([run_1, run_2])
    session.commit()
    session.refresh(run_1)
    session.refresh(run_2)
    return model, run_1, run_2


def test_list_results_returns_paginated_items(tmp_path):
    client, session_local = _build_test_client(tmp_path)
    session = session_local()
    model, _, _ = _seed_results(session)

    response = client.get("/api/v1/solver/results")
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert len(payload["items"]) == 2
    assert payload["items"][0]["model_name"] == model.name
    session.close()


def test_get_result_returns_single_run(tmp_path):
    client, session_local = _build_test_client(tmp_path)
    session = session_local()
    _, run_1, _ = _seed_results(session)

    response = client.get(f"/api/v1/solver/results/{run_1.id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == run_1.id
    assert payload["status"] == "optimal"
    assert payload["objective_value"] == 10.0
    session.close()
