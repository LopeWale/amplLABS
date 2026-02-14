"""API routes for AI Tutor functionality with OpenAI integration."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging
import re
from sqlalchemy.orm import Session

from app.config import settings
from app.db.database import get_db
from app.models import OptimizationRun, VariableResult, ConstraintResult

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize OpenAI client (lazy loading)
_openai_client = None


def get_openai_client():
    """Get or create OpenAI client."""
    global _openai_client
    if _openai_client is None:
        if settings.openai_api_key:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


class TutorMessage(BaseModel):
    """Message to the AI tutor."""
    message: str
    context: Optional[str] = None  # Current model code or learning context
    topic: Optional[str] = None  # LP, MIP, NLP, metaheuristics, AMPL syntax
    result_id: Optional[int] = None
    analysis_focus: Optional[str] = None  # network|sensitivity|variables|overall
    include_visualization_context: bool = False


class TutorResponse(BaseModel):
    """Response from the AI tutor."""
    response: str
    suggestions: list[str] = []
    related_topics: list[str] = []
    code_example: Optional[str] = None


class CodeExplainRequest(BaseModel):
    """Request to explain AMPL code."""
    code: str


# AMPL knowledge base for system context
AMPL_KNOWLEDGE_BASE = """
# AMPL (A Mathematical Programming Language) Reference

## Sets
Sets define indices for your model. Declaration:
- `set PRODUCTS;` - simple set
- `set NODES ordered;` - ordered set
- `set ARCS within {NODES, NODES};` - subset relationship

## Parameters
Parameters hold input data:
- `param demand {CUSTOMERS} >= 0;` - indexed parameter with bounds
- `param cost {ORIGINS, DESTINATIONS} >= 0;` - 2D parameter
- `param big_M := 10000;` - scalar parameter

## Variables
Decision variables the solver determines:
- `var x {PRODUCTS} >= 0;` - continuous non-negative
- `var y {JOBS} binary;` - binary (0 or 1)
- `var z {ITEMS} integer >= 0;` - non-negative integer

## Objectives
- `maximize TotalProfit: sum {p in PRODUCTS} profit[p] * x[p];`
- `minimize TotalCost: sum {i,j in ARCS} cost[i,j] * flow[i,j];`

## Constraints
- `subject to Capacity {m in MACHINES}: sum {p in PRODUCTS} time[p,m] * produce[p] <= available[m];`
- `subject to FlowBalance {n in NODES}: sum {(i,n) in ARCS} flow[i,n] = sum {(n,j) in ARCS} flow[n,j];`

## Common Problem Types
- LP (Linear Programming): Continuous variables, linear objective and constraints
- MIP (Mixed-Integer Programming): Includes binary/integer variables
- NLP (Nonlinear Programming): Nonlinear objective or constraints
- Transportation: Minimize shipping cost from origins to destinations
- Assignment: Assign resources to tasks (binary decisions)
- Network Flow: Flow conservation at nodes, capacity on arcs

## Sensitivity Analysis
- Shadow prices: `display ConstraintName.dual;` - value of relaxing constraint by 1 unit
- Reduced costs: `display VariableName.rc;` - cost improvement needed to enter solution
- Slack: `display ConstraintName.slack;` - unused capacity

## Common Solvers
- HiGHS: Open-source LP/MIP solver (default)
- Gurobi: Commercial LP/MIP/QP solver (university license available)
- CPLEX: IBM commercial solver (university license available)
- CBC: Open-source MIP solver from COIN-OR
- IPOPT: Interior point optimizer for NLP
"""

SYSTEM_PROMPT = """You are an expert AMPL tutor helping a graduate student in DSA 5113 (Advanced Analytics and Metaheuristics).

Your role:
1. Explain AMPL syntax and optimization concepts clearly
2. Help debug AMPL code errors
3. Provide working code examples when helpful
4. Explain the math behind optimization when asked
5. Guide students through formulating problems

Guidelines:
- Be concise but thorough
- Use markdown formatting for code blocks (use ```ampl for AMPL code)
- Provide practical examples from transportation, assignment, scheduling problems
- When showing code, ensure it's syntactically correct AMPL
- If the student shares code, analyze it for issues
- Explain both the syntax AND the optimization concepts

AMPL Reference:
""" + AMPL_KNOWLEDGE_BASE


# Fallback knowledge base for offline mode
FALLBACK_KNOWLEDGE = {
    "set": {
        "response": """**Sets in AMPL**

Sets define the indices used in your model. They represent collections of elements like products, locations, or time periods.

**Declaration:**
```ampl
set PRODUCTS;
set NODES ordered;
set ARCS within {NODES, NODES};
```

**Key attributes:**
- `ordered`: Elements have a defined order
- `circular`: Like ordered, but wraps around
- `within`: Subset relationship

**Operations:**
- `union`, `inter`, `diff`: Set operations
- `cross`: Cartesian product""",
        "code_example": """set CITIES;
set ROUTES within {CITIES, CITIES};
set PERIODS ordered := 1..12;
set WAREHOUSES within CITIES;"""
    },
    "param": {
        "response": """**Parameters in AMPL**

Parameters hold the input data for your model - costs, capacities, demands, etc.

```ampl
param demand {CUSTOMERS} >= 0;
param cost {ORIGINS, DESTINATIONS} >= 0;
param big_M := 10000;
```

Parameters can be indexed, have bounds, have default values, or be computed from other parameters.""",
        "code_example": """param n_products integer > 0;
param profit {PRODUCTS} >= 0;
param capacity {MACHINES} >= 0 default 100;"""
    },
    "var": {
        "response": """**Decision Variables in AMPL**

Variables are what the solver determines - the decisions you're optimizing.

```ampl
var x {PRODUCTS} >= 0;           # Continuous
var y {JOBS} binary;              # Binary (0 or 1)
var z {ITEMS} integer >= 0;       # Integer
```""",
        "code_example": """var produce {p in PRODUCTS} >= 0, <= max_production[p];
var assign {WORKERS, TASKS} binary;
var inventory {PERIODS} >= -100;"""
    },
    "constraint": {
        "response": """**Constraints in AMPL**

Constraints define limitations and requirements.

```ampl
subject to Capacity {m in MACHINES}:
    sum {p in PRODUCTS} time[p,m] * produce[p] <= available[m];
```

Types: `<=`, `>=`, `=`""",
        "code_example": """subject to MeetDemand {c in CUSTOMERS}:
    sum {w in WAREHOUSES} ship[w,c] >= demand[c];

subject to FlowBalance {n in NODES}:
    sum {(i,n) in ARCS} flow[i,n] = sum {(n,j) in ARCS} flow[n,j];"""
    },
    "transport": {
        "response": """**Transportation Problem**

Minimizes shipping costs from supply points to demand points.

**Structure:** Origins (supply), Destinations (demand), cost per unit shipped.""",
        "code_example": """set ORIGINS;
set DESTINATIONS;
param supply {ORIGINS} >= 0;
param demand {DESTINATIONS} >= 0;
param cost {ORIGINS, DESTINATIONS} >= 0;
var ship {ORIGINS, DESTINATIONS} >= 0;

minimize TotalCost:
    sum {i in ORIGINS, j in DESTINATIONS} cost[i,j] * ship[i,j];

subject to SupplyLimit {i in ORIGINS}:
    sum {j in DESTINATIONS} ship[i,j] <= supply[i];

subject to DemandMet {j in DESTINATIONS}:
    sum {i in ORIGINS} ship[i,j] >= demand[j];"""
    },
    "mip": {
        "response": """**Mixed-Integer Programming (MIP)**

MIP problems include integer or binary variables for discrete decisions.

**When to use:**
- Yes/no decisions (open a facility?)
- Assignment problems
- Scheduling with indivisible units
- Fixed costs (setup costs)

**Key concepts:**
- Binary variables: `var y binary;`
- Big-M constraints for logical conditions
- Branch and bound algorithm""",
        "code_example": """var open {FACILITIES} binary;
var serve {FACILITIES, CUSTOMERS} >= 0;

minimize TotalCost:
    sum {f in FACILITIES} fixed_cost[f] * open[f]
    + sum {f in FACILITIES, c in CUSTOMERS} cost[f,c] * serve[f,c];

subject to OpenToServe {f in FACILITIES, c in CUSTOMERS}:
    serve[f,c] <= demand[c] * open[f];"""
    },
    "sensitivity": {
        "response": """**Sensitivity Analysis**

Tells you how the optimal solution changes with parameter changes.

**Shadow Prices (Dual Values):**
- How much objective improves if constraint relaxed by 1 unit
- Zero for non-binding constraints

**Reduced Costs:**
- How much coefficient must improve to enter solution
- Zero for basic variables

**AMPL Commands:**
```ampl
display ConstraintName.dual;  # Shadow prices
display VariableName.rc;      # Reduced costs
display ConstraintName.slack; # Unused capacity
```""",
        "code_example": """# After solving
display Capacity.dual;
display MeetDemand.dual;
display produce.rc;"""
    },
}


def _build_visualization_context(
    db: Session,
    result_id: int,
    analysis_focus: str | None,
) -> str:
    """Build result-aware context for tutoring explanations."""
    run = db.query(OptimizationRun).filter(OptimizationRun.id == result_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Result not found")

    focus = (analysis_focus or "overall").lower()
    lines = [
        f"Result ID: {run.id}",
        f"Model ID: {run.model_id}",
        f"Solver: {run.solver_name}",
        f"Status: {run.status}",
        f"Objective value: {run.objective_value}",
        f"Solve time (s): {run.solve_time}",
        f"Focus requested: {focus}",
    ]

    # Include strongest variable values for actionable model edits.
    if focus in {"variables", "overall", "network"}:
        vars_q = (
            db.query(VariableResult)
            .filter(VariableResult.optimization_run_id == result_id)
            .all()
        )
        nonzero_vars = [v for v in vars_q if v.value is not None and abs(v.value) > 1e-9]
        sample_vars = nonzero_vars[:15]
        if sample_vars:
            lines.append("Top non-zero variables:")
            for var in sample_vars:
                idx = ", ".join(str(i) for i in var.indices) if var.indices else "scalar"
                lines.append(f"- {var.variable_name}[{idx}] = {var.value}")
        else:
            lines.append("No non-zero variable values were found for this run.")

    # Include dual/slack context for sensitivity analysis.
    if focus in {"sensitivity", "overall"}:
        cons_q = (
            db.query(ConstraintResult)
            .filter(ConstraintResult.optimization_run_id == result_id)
            .all()
        )
        dual_cons = [c for c in cons_q if c.dual is not None and abs(c.dual) > 1e-9]
        sample_cons = dual_cons[:15]
        if sample_cons:
            lines.append("Top shadow prices (dual values):")
            for con in sample_cons:
                idx = ", ".join(str(i) for i in con.indices) if con.indices else "scalar"
                lines.append(f"- {con.constraint_name}[{idx}] dual={con.dual}, slack={con.slack}")
        else:
            lines.append("No non-zero dual values were found for this run.")

    if run.error_message:
        lines.append(f"Run error message: {run.error_message}")
    elif run.solver_output:
        lines.append(f"Solver output excerpt: {run.solver_output[:1200]}")

    return "\n".join(lines)


@router.post("/ask", response_model=TutorResponse)
async def ask_tutor(message: TutorMessage, db: Session = Depends(get_db)):
    """Ask the AI tutor a question about AMPL or optimization."""

    client = get_openai_client()

    # Check if OpenAI is configured
    if client is None:
        logger.info("OpenAI not configured, using fallback mode")
        return _fallback_response(message, db)

    # Build messages for OpenAI
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if message.include_visualization_context and message.result_id is not None:
        visualization_context = _build_visualization_context(
            db=db,
            result_id=message.result_id,
            analysis_focus=message.analysis_focus,
        )
        messages.append({
            "role": "user",
            "content": (
                "Use this optimization result context to interpret behavior and suggest concrete "
                "AMPL/.dat edits.\n\n"
                f"{visualization_context}"
            ),
        })
        messages.append({
            "role": "assistant",
            "content": (
                "I will explain the result in context and propose concrete model/data edits "
                "to improve or fix the formulation."
            ),
        })

    # Add context if provided (current code the student is working on)
    if message.context:
        messages.append({
            "role": "user",
            "content": f"Here is the code I'm currently working on:\n```ampl\n{message.context}\n```"
        })
        messages.append({
            "role": "assistant",
            "content": "I see your AMPL code. What would you like help with?"
        })

    # Add the user's question
    user_content = message.message
    if message.topic:
        user_content = f"[Topic: {message.topic}] {user_content}"
    if message.analysis_focus:
        user_content = f"[Analysis Focus: {message.analysis_focus}] {user_content}"
    messages.append({"role": "user", "content": user_content})

    try:
        # Call OpenAI API
        completion = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=0.7,
            max_completion_tokens=1500,
        )

        response_text = completion.choices[0].message.content

        # Extract code example if present in response
        code_example = None
        code_match = re.search(r"```ampl\n(.*?)```", response_text, re.DOTALL)
        if code_match:
            code_example = code_match.group(1).strip()

        # Generate suggestions based on the conversation
        suggestions = _generate_suggestions(message.message)
        related = _find_related_topics(message.message)

        return TutorResponse(
            response=response_text,
            suggestions=suggestions,
            related_topics=related,
            code_example=code_example,
        )

    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        # Fallback to knowledge base on error
        return _fallback_response(message, db)


def _fallback_response(message: TutorMessage, db: Session) -> TutorResponse:
    """Fallback to knowledge-base response when OpenAI is unavailable."""
    query = message.message.lower()

    visualization_note = ""
    if message.include_visualization_context and message.result_id is not None:
        try:
            context = _build_visualization_context(db, message.result_id, message.analysis_focus)
            visualization_note = (
                "\n\n**Result Context (offline):**\n"
                f"```\n{context[:1600]}\n```"
                "\nUse this to refine your model and data formulation."
            )
        except HTTPException as exc:
            visualization_note = f"\n\n*Result context unavailable: {exc.detail}.*"

    # Find matching topic
    for keyword, content in FALLBACK_KNOWLEDGE.items():
        if keyword in query:
            return TutorResponse(
                response=(
                    content["response"]
                    + visualization_note
                    + "\n\n*Note: AI tutor is running in offline mode. "
                    "Set OPENAI_API_KEY environment variable for full AI functionality.*"
                ),
                code_example=content.get("code_example"),
                suggestions=_generate_suggestions(query),
                related_topics=_find_related_topics(query),
            )

    # Default response
    return TutorResponse(
        response="""I can help with AMPL and optimization! Topics I cover:

- AMPL syntax (sets, params, vars, constraints)
- Problem formulations (transportation, assignment, scheduling)
- Debugging model errors
- Understanding results and sensitivity analysis

*Note: AI tutor is running in offline mode. Set OPENAI_API_KEY environment variable for full AI functionality.*

What would you like to learn about?"""
        + visualization_note,
        suggestions=["Explain sets", "How to write constraints", "Transportation problem example"],
        related_topics=["set", "param", "var", "constraint"],
    )


@router.get("/topics")
async def list_topics():
    """List available help topics."""
    return {
        "topics": [
            {"id": "set", "name": "Sets", "description": "Defining index sets"},
            {"id": "param", "name": "Parameters", "description": "Input data"},
            {"id": "var", "name": "Variables", "description": "Decision variables"},
            {"id": "objective", "name": "Objectives", "description": "Minimize/maximize"},
            {"id": "constraint", "name": "Constraints", "description": "Limitations"},
            {"id": "transportation", "name": "Transportation", "description": "Classic problem"},
            {"id": "mip", "name": "MIP", "description": "Integer programming"},
            {"id": "sensitivity", "name": "Sensitivity", "description": "Post-optimal analysis"},
        ]
    }


@router.get("/topic/{topic_id}")
async def get_topic(topic_id: str):
    """Get detailed information about a specific topic."""
    if topic_id not in FALLBACK_KNOWLEDGE:
        raise HTTPException(status_code=404, detail="Topic not found")
    return FALLBACK_KNOWLEDGE[topic_id]


@router.post("/explain-code")
async def explain_code(request: CodeExplainRequest):
    """Explain what AMPL code does using AI."""
    client = get_openai_client()

    if client is None:
        # Fallback to simple parsing
        return _simple_code_explanation(request.code)

    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Please explain this AMPL code line by line:\n```ampl\n{request.code}\n```"}
            ],
            temperature=0.5,
            max_completion_tokens=1000,
        )

        return {
            "code": request.code,
            "explanation": completion.choices[0].message.content,
        }

    except Exception as e:
        logger.error(f"OpenAI error in explain-code: {e}")
        return _simple_code_explanation(request.code)


def _simple_code_explanation(code: str) -> dict:
    """Simple code explanation without AI."""
    lines = code.strip().split('\n')
    explanations = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue

        if line.startswith('set '):
            explanations.append("**Set declaration:** Defines an index set")
        elif line.startswith('param '):
            explanations.append("**Parameter:** Declares input data")
        elif line.startswith('var '):
            explanations.append("**Variable:** Defines a decision variable")
        elif line.startswith('maximize ') or line.startswith('minimize '):
            explanations.append("**Objective:** Defines what to optimize")
        elif line.startswith('subject to ') or line.startswith('s.t. '):
            explanations.append("**Constraint:** Defines a limitation")

    return {
        "code": code,
        "explanation": "\n".join(explanations) if explanations else "Could not parse the code structure.",
        "note": "Set OPENAI_API_KEY for detailed AI explanations."
    }


def _generate_suggestions(query: str) -> list[str]:
    """Generate helpful suggestions based on the query."""
    suggestions = []
    query_lower = query.lower()

    if "transport" in query_lower:
        suggestions = ["Try the Transportation Problem template", "Make sure supply >= demand"]
    elif "infeasible" in query_lower:
        suggestions = ["Check if constraints are too restrictive", "Verify demand doesn't exceed supply"]
    elif "slow" in query_lower or "performance" in query_lower:
        suggestions = ["Try Gurobi/CPLEX for large MIPs", "Add bounds to variables"]
    elif "error" in query_lower or "debug" in query_lower:
        suggestions = ["Check for missing semicolons", "Verify set/param declarations"]
    else:
        suggestions = ["Review syntax with 'set', 'param', 'var'", "Use 'display' to inspect results"]

    return suggestions[:3]


def _find_related_topics(query: str) -> list[str]:
    """Find topics related to the query."""
    query_lower = query.lower()

    topic_map = {
        "set": ["param", "var", "indexing"],
        "param": ["set", "data", "var"],
        "var": ["param", "constraint", "binary"],
        "constraint": ["var", "objective", "dual"],
        "transport": ["set", "constraint", "network"],
        "mip": ["binary", "integer", "branch"],
        "sensitivity": ["dual", "slack", "reduced cost"],
    }

    for topic, related in topic_map.items():
        if topic in query_lower:
            return related[:4]

    return ["set", "param", "var", "constraint"]
