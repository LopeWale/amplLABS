"""API routes for visualization data."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import OptimizationRun, VariableResult, ConstraintResult

router = APIRouter()


@router.get("/network/{result_id}")
async def get_network_data(result_id: int, db: Session = Depends(get_db)):
    """Get network graph data for visualization.

    Transforms optimization results into nodes and edges for network visualization.
    Works best with transportation, assignment, and network flow problems.
    """
    opt_run = db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
    if not opt_run:
        raise HTTPException(status_code=404, detail="Result not found")

    # Get variable results
    var_results = (
        db.query(VariableResult)
        .filter(VariableResult.optimization_run_id == result_id)
        .all()
    )

    nodes = {}
    edges = []

    for var in var_results:
        if var.indices and len(var.indices) == 2:
            # Two-index variable likely represents flow between nodes
            source, target = var.indices

            # Add nodes if not seen
            if source not in nodes:
                nodes[source] = {
                    "id": str(source),
                    "label": str(source),
                    "type": "source",
                }
            if target not in nodes:
                nodes[target] = {
                    "id": str(target),
                    "label": str(target),
                    "type": "sink",
                }

            # Add edge if flow > 0
            if var.value and var.value > 0.001:
                edges.append({
                    "source": str(source),
                    "target": str(target),
                    "flow": var.value,
                    "capacity": var.upper_bound or var.value * 2,
                    "variable": var.variable_name,
                })

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "reason": (
            "No 2-index flow variables with positive values were found."
            if not edges
            else None
        ),
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "total_flow": sum(e["flow"] for e in edges),
        },
    }


@router.get("/sensitivity/{result_id}")
async def get_sensitivity_data(result_id: int, db: Session = Depends(get_db)):
    """Get sensitivity analysis data for charts.

    Returns shadow prices (dual values) and reduced costs.
    """
    opt_run = db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
    if not opt_run:
        raise HTTPException(status_code=404, detail="Result not found")

    # Get constraint results (for shadow prices)
    con_results = (
        db.query(ConstraintResult)
        .filter(ConstraintResult.optimization_run_id == result_id)
        .all()
    )

    # Get variable results (for reduced costs)
    var_results = (
        db.query(VariableResult)
        .filter(VariableResult.optimization_run_id == result_id)
        .all()
    )

    shadow_prices = []
    for con in con_results:
        if con.dual is not None and con.dual != 0:
            shadow_prices.append({
                "constraint": con.constraint_name,
                "index": con.indices,
                "dual": con.dual,
                "slack": con.slack,
            })

    reduced_costs = []
    for var in var_results:
        if var.reduced_cost is not None and var.reduced_cost != 0:
            reduced_costs.append({
                "variable": var.variable_name,
                "index": var.indices,
                "value": var.value,
                "reduced_cost": var.reduced_cost,
            })

    return {
        "shadow_prices": shadow_prices,
        "reduced_costs": reduced_costs,
        "binding_constraints": [
            sp for sp in shadow_prices if sp["slack"] == 0 or abs(sp["dual"]) > 0.001
        ],
    }


@router.get("/comparison")
async def get_solver_comparison(
    result_ids: str,  # Comma-separated list of result IDs
    db: Session = Depends(get_db),
):
    """Compare results from multiple solver runs."""
    ids = [int(id.strip()) for id in result_ids.split(",")]

    results = []
    for result_id in ids:
        opt_run = (
            db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
        )
        if opt_run:
            results.append({
                "id": opt_run.id,
                "solver": opt_run.solver_name,
                "status": opt_run.status,
                "objective": opt_run.objective_value,
                "solve_time": opt_run.solve_time,
                "iterations": opt_run.iterations,
                "gap": opt_run.gap,
            })

    return {
        "results": results,
        "best_objective": max(
            (r["objective"] for r in results if r["objective"]),
            default=None,
        ),
        "fastest_solver": min(
            results,
            key=lambda r: r["solve_time"] or float("inf"),
            default=None,
        ),
    }


@router.get("/variables/{result_id}")
async def get_variables_chart_data(
    result_id: int,
    variable_name: str | None = None,
    db: Session = Depends(get_db),
):
    """Get variable values formatted for charting."""
    opt_run = db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
    if not opt_run:
        raise HTTPException(status_code=404, detail="Result not found")

    query = db.query(VariableResult).filter(
        VariableResult.optimization_run_id == result_id
    )

    if variable_name:
        query = query.filter(VariableResult.variable_name == variable_name)

    var_results = query.all()

    # Group by variable name
    variables = {}
    for var in var_results:
        if var.variable_name not in variables:
            variables[var.variable_name] = []

        variables[var.variable_name].append({
            "index": var.indices if var.indices else ["scalar"],
            "value": var.value,
            "label": (
                ", ".join(str(i) for i in var.indices) if var.indices else var.variable_name
            ),
        })

    return {"variables": variables}
