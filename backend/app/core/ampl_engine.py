"""AMPL Engine - Wrapper around amplpy for model execution."""

import asyncio
from datetime import datetime
from typing import Any, Callable
from dataclasses import dataclass, field

from amplpy import AMPL, Environment


@dataclass
class SolveResult:
    """Result of an AMPL solve operation."""

    status: str
    objective_value: float | None = None
    solve_time: float | None = None
    iterations: int | None = None
    nodes: int | None = None
    gap: float | None = None
    variables: dict = field(default_factory=dict)
    constraints: dict = field(default_factory=dict)
    solver_output: str = ""
    error_message: str | None = None


class AMPLEngine:
    """Wrapper around amplpy for managing AMPL model execution."""

    # Solver information
    SOLVER_INFO = {
        "highs": {
            "description": "HiGHS - High-performance open-source LP/MIP solver",
            "supports": ["LP", "MIP"],
        },
        "cplex": {
            "description": "IBM CPLEX - Commercial LP/MIP/QP solver",
            "supports": ["LP", "MIP", "QP", "MIQP"],
        },
        "gurobi": {
            "description": "Gurobi - Commercial LP/MIP/QP solver",
            "supports": ["LP", "MIP", "QP", "MIQP", "QCP"],
        },
        "cbc": {
            "description": "CBC - Open-source MIP solver from COIN-OR",
            "supports": ["LP", "MIP"],
        },
        "glpk": {
            "description": "GLPK - GNU Linear Programming Kit",
            "supports": ["LP", "MIP"],
        },
        "ipopt": {
            "description": "IPOPT - Interior Point Optimizer for NLP",
            "supports": ["NLP"],
        },
        "xpress": {
            "description": "FICO Xpress - Commercial LP/MIP/QP solver",
            "supports": ["LP", "MIP", "QP", "MIQP"],
        },
    }

    def __init__(self, ampl_path: str | None = None):
        """Initialize the AMPL engine.

        Args:
            ampl_path: Optional path to AMPL installation.
        """
        self.ampl_path = ampl_path

    def _create_ampl_instance(self) -> AMPL:
        """Create a new AMPL instance."""
        if self.ampl_path:
            env = Environment(self.ampl_path)
            return AMPL(env)
        return AMPL()

    def get_available_solvers(self) -> list[dict]:
        """Get list of available solvers with their status."""
        ampl = self._create_ampl_instance()
        available_solvers = []

        try:
            for solver_name, info in self.SOLVER_INFO.items():
                try:
                    ampl.setOption("solver", solver_name)
                    available = True
                except Exception:
                    available = False

                available_solvers.append({
                    "name": solver_name,
                    "available": available,
                    "description": info["description"],
                    "supports": info["supports"],
                })
        finally:
            ampl.close()

        return available_solvers

    async def solve_model(
        self,
        model_content: str,
        data_content: str | None = None,
        solver: str = "highs",
        options: dict[str, Any] | None = None,
        timeout: int = 300,
        progress_callback: Callable[[dict], None] | None = None,
    ) -> SolveResult:
        """Execute an AMPL model and return results.

        Args:
            model_content: The .mod file content
            data_content: The .dat file content (optional)
            solver: Solver name (highs, cplex, gurobi, etc.)
            options: Solver-specific options
            timeout: Maximum solve time in seconds
            progress_callback: Callback for progress updates

        Returns:
            SolveResult containing objective value, variables, and statistics
        """
        ampl = self._create_ampl_instance()

        try:
            # Set solver
            ampl.setOption("solver", solver)

            # Apply solver options
            if options:
                for key, value in options.items():
                    option_name = f"{solver}_{key}" if not key.startswith(solver) else key
                    ampl.setOption(option_name, value)

            # Set timeout
            ampl.setOption(f"{solver}_options", f"timelimit={timeout}")

            # Send progress update
            if progress_callback:
                progress_callback({
                    "status": "loading_model",
                    "message": "Loading AMPL model...",
                })

            # Load model
            ampl.eval(model_content)

            # Load data if provided
            if data_content:
                if progress_callback:
                    progress_callback({
                        "status": "loading_data",
                        "message": "Loading data file...",
                    })
                self._load_data_content(ampl, data_content)

            # Solve
            if progress_callback:
                progress_callback({
                    "status": "solving",
                    "message": f"Solving with {solver}...",
                })

            start_time = datetime.now()
            solver_output = await asyncio.to_thread(self._solve_with_output_capture, ampl)
            solve_time = (datetime.now() - start_time).total_seconds()

            # Extract results
            result = SolveResult(
                status=self._get_solve_status(ampl),
                objective_value=self._get_objective_value(ampl),
                solve_time=solve_time,
                variables=self._extract_variables(ampl),
                constraints=self._extract_constraints(ampl),
                solver_output=solver_output,
            )

            # Extract MIP-specific info
            try:
                result.iterations = int(ampl.getValue("_niter") or 0)
            except Exception:
                pass

            return result

        except Exception as e:
            return SolveResult(
                status="error",
                error_message=str(e),
                solver_output=str(e),
            )
        finally:
            ampl.close()

    def _get_solve_status(self, ampl: AMPL) -> str:
        """Extract solve status from AMPL."""
        try:
            solve_result = ampl.getValue("solve_result")
            if solve_result:
                return self._normalize_status(str(solve_result))
        except Exception:
            pass
        return "unknown"

    def _normalize_status(self, raw_status: str) -> str:
        """Normalize AMPL solve status to UI-safe values."""
        status = raw_status.strip().lower()

        if any(token in status for token in ["solved", "optimal", "locally optimal", "globally optimal"]):
            return "optimal"
        if "infeasible" in status:
            return "infeasible"
        if "unbounded" in status:
            return "unbounded"
        if "error" in status or "fail" in status:
            return "error"

        return "unknown"

    def _solve_with_output_capture(self, ampl: AMPL) -> str:
        """Run solve and capture solver output with safe fallback."""
        try:
            return ampl.getOutput("solve;")
        except Exception:
            # Some AMPL builds may not support output capture for solve statements.
            ampl.solve()
            return ""

    def _load_data_content(self, ampl: AMPL, data_content: str) -> None:
        """Load .dat content in AMPL data mode."""
        ampl.eval("data;")
        ampl.eval(data_content)
        ampl.eval("model;")

    def _get_objective_value(self, ampl: AMPL) -> float | None:
        """Get the objective function value."""
        try:
            objectives = list(ampl.getObjectives())
            if objectives:
                return objectives[0][1].value()
        except Exception:
            pass
        return None

    def _extract_variables(self, ampl: AMPL) -> dict[str, list[dict]]:
        """Extract all variable values."""
        variables = {}
        try:
            for name, var in ampl.getVariables():
                var_data = []
                for idx, value in var:
                    try:
                        var_data.append({
                            "index": list(idx) if idx else None,
                            "value": value.value(),
                            "lb": value.lb(),
                            "ub": value.ub(),
                            "rc": getattr(value, "rc", lambda: None)(),
                        })
                    except Exception:
                        continue
                variables[name] = var_data
        except Exception:
            pass
        return variables

    def _extract_constraints(self, ampl: AMPL) -> dict[str, list[dict]]:
        """Extract constraint information including shadow prices."""
        constraints = {}
        try:
            for name, con in ampl.getConstraints():
                con_data = []
                for idx, c in con:
                    try:
                        con_data.append({
                            "index": list(idx) if idx else None,
                            "body": c.body(),
                            "lb": c.lb(),
                            "ub": c.ub(),
                            "dual": getattr(c, "dual", lambda: None)(),
                            "slack": getattr(c, "slack", lambda: None)(),
                        })
                    except Exception:
                        continue
                constraints[name] = con_data
        except Exception:
            pass
        return constraints

    def validate_model(self, model_content: str) -> dict:
        """Validate AMPL model syntax without solving.

        Returns:
            Dictionary with 'valid' boolean and 'errors' list
        """
        ampl = self._create_ampl_instance()

        try:
            ampl.eval(model_content)
            return {"valid": True, "errors": []}
        except Exception as e:
            return {"valid": False, "errors": [str(e)]}
        finally:
            ampl.close()

    def get_model_info(self, model_content: str, data_content: str | None = None) -> dict:
        """Get information about a model (sets, params, vars, constraints).

        Returns:
            Dictionary with model structure information
        """
        ampl = self._create_ampl_instance()

        try:
            ampl.eval(model_content)
            if data_content:
                self._load_data_content(ampl, data_content)

            info = {
                "sets": [],
                "parameters": [],
                "variables": [],
                "objectives": [],
                "constraints": [],
            }

            # Get sets
            for name, s in ampl.getSets():
                info["sets"].append({
                    "name": name,
                    "size": len(list(s.members())),
                })

            # Get parameters
            for name, p in ampl.getParameters():
                info["parameters"].append({"name": name})

            # Get variables
            for name, v in ampl.getVariables():
                info["variables"].append({"name": name})

            # Get objectives
            for name, o in ampl.getObjectives():
                info["objectives"].append({"name": name})

            # Get constraints
            for name, c in ampl.getConstraints():
                info["constraints"].append({"name": name})

            return info

        except Exception as e:
            return {"error": str(e)}
        finally:
            ampl.close()


# Global engine instance
ampl_engine = AMPLEngine()
