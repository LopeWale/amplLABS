"""API routes for learning modules."""

import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.models import LearningProgress
from app.config import settings

router = APIRouter()


def _load_tutorials() -> list[dict]:
    """Load tutorial content from JSON files."""
    tutorials_dir = settings.CONTENT_DIR / "tutorials"
    tutorials = []

    if tutorials_dir.exists():
        for file_path in tutorials_dir.glob("*.json"):
            try:
                with open(file_path) as f:
                    tutorials.append(json.load(f))
            except Exception:
                continue

    return tutorials


@router.get("/modules")
async def list_modules(db: Session = Depends(get_db)):
    """List all learning modules with progress."""
    tutorials = _load_tutorials()

    # If no tutorial files exist, return built-in module list
    if not tutorials:
        tutorials = [
            {
                "id": "lp_basics",
                "title": "Linear Programming Fundamentals",
                "description": "Learn the basics of linear programming and AMPL syntax",
                "difficulty": "beginner",
                "lessons": ["intro", "syntax", "example"],
            },
            {
                "id": "mip_intro",
                "title": "Mixed-Integer Programming",
                "description": "Introduction to integer variables and MIP formulations",
                "difficulty": "intermediate",
                "lessons": ["intro", "branching", "cutting_planes"],
            },
            {
                "id": "nlp_fundamentals",
                "title": "Nonlinear Programming",
                "description": "Nonlinear objectives and constraints",
                "difficulty": "intermediate",
                "lessons": ["intro", "convexity", "solvers"],
            },
            {
                "id": "metaheuristics",
                "title": "Metaheuristic Algorithms",
                "description": "Genetic algorithms, simulated annealing, and tabu search",
                "difficulty": "advanced",
                "lessons": ["genetic", "annealing", "tabu"],
            },
        ]

    # Get progress for each module
    for module in tutorials:
        progress = (
            db.query(LearningProgress)
            .filter(LearningProgress.module_id == module["id"])
            .all()
        )

        completed = sum(1 for p in progress if p.status == "completed")
        total = len(module.get("lessons", []))

        module["progress"] = {
            "completed": completed,
            "total": total,
            "percentage": int((completed / total) * 100) if total > 0 else 0,
        }

    return tutorials


@router.get("/modules/{module_id}")
async def get_module(module_id: str, db: Session = Depends(get_db)):
    """Get detailed content for a learning module."""
    tutorials = _load_tutorials()

    module = next((t for t in tutorials if t["id"] == module_id), None)

    if not module:
        # Return a placeholder for built-in modules
        module = _get_builtin_module(module_id)
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")

    # Get progress for each lesson
    for lesson in module.get("lessons", []):
        if isinstance(lesson, dict):
            progress = (
                db.query(LearningProgress)
                .filter(
                    LearningProgress.module_id == module_id,
                    LearningProgress.lesson_id == lesson["id"],
                )
                .first()
            )
            lesson["status"] = progress.status if progress else "not_started"

    return module


def _get_builtin_module(module_id: str) -> dict | None:
    """Get built-in module content."""
    modules = {
        "lp_basics": {
            "id": "lp_basics",
            "title": "Linear Programming Fundamentals",
            "description": "Learn the basics of linear programming and how to formulate LP models in AMPL",
            "difficulty": "beginner",
            "lessons": [
                {
                    "id": "intro",
                    "title": "Introduction to Linear Programming",
                    "content": """## What is Linear Programming?

Linear programming (LP) is a mathematical optimization technique for finding the best outcome in a model whose requirements are represented by linear relationships.

### Components of an LP Model:
1. **Decision Variables**: What we're trying to determine
2. **Objective Function**: What we're trying to optimize (minimize or maximize)
3. **Constraints**: Limitations or requirements that must be satisfied

### Example: Production Planning
A company makes two products (A and B). Each unit of A requires 2 hours of labor and 3 units of material. Each unit of B requires 3 hours of labor and 2 units of material. Available resources: 100 hours of labor, 120 units of material. Profit: $10/unit of A, $15/unit of B.

**Formulation:**
- Decision variables: x_A, x_B (units to produce)
- Objective: Maximize 10x_A + 15x_B
- Constraints: 2x_A + 3x_B <= 100 (labor), 3x_A + 2x_B <= 120 (material)
""",
                },
                {
                    "id": "syntax",
                    "title": "AMPL Syntax Basics",
                    "content": """## AMPL Syntax

AMPL uses a declarative algebraic modeling language that closely resembles mathematical notation.

### Basic Constructs:

```ampl
# Sets define indices
set PRODUCTS;

# Parameters are input data
param profit {PRODUCTS};

# Variables are decision values
var produce {p in PRODUCTS} >= 0;

# Objectives define what to optimize
maximize TotalProfit: sum {p in PRODUCTS} profit[p] * produce[p];

# Constraints define limitations
subject to Limit: sum {p in PRODUCTS} produce[p] <= 100;
```

### Key Points:
- Sets use UPPERCASE by convention
- Parameters hold data values
- Variables are what the solver determines
- The `sum` operator iterates over sets
""",
                    "codeExample": {
                        "mod": "set PRODUCTS;\nparam profit {PRODUCTS};\nvar produce {p in PRODUCTS} >= 0;\nmaximize TotalProfit: sum {p in PRODUCTS} profit[p] * produce[p];",
                        "dat": "set PRODUCTS := A B C;\nparam profit := A 10 B 15 C 12;",
                    },
                },
            ],
        },
        "metaheuristics": {
            "id": "metaheuristics",
            "title": "Metaheuristic Algorithms",
            "description": "Learn about genetic algorithms, simulated annealing, and tabu search",
            "difficulty": "advanced",
            "lessons": [
                {
                    "id": "genetic",
                    "title": "Genetic Algorithms",
                    "content": """## Genetic Algorithms (GA)

Genetic algorithms are optimization algorithms inspired by natural selection.

### Key Components:
1. **Population**: A set of candidate solutions
2. **Fitness Function**: Evaluates solution quality
3. **Selection**: Choose parents based on fitness
4. **Crossover**: Combine parents to create offspring
5. **Mutation**: Random changes for diversity

### Algorithm Steps:
1. Initialize random population
2. Evaluate fitness of each individual
3. Select parents
4. Apply crossover and mutation
5. Replace population with offspring
6. Repeat until convergence
""",
                },
                {
                    "id": "annealing",
                    "title": "Simulated Annealing",
                    "content": """## Simulated Annealing (SA)

Simulated annealing is inspired by the metallurgical annealing process.

### Key Concepts:
- **Temperature**: Controls acceptance of worse solutions
- **Cooling Schedule**: How temperature decreases over time
- **Metropolis Criterion**: Accept worse solutions with probability e^(-ΔE/T)

### Algorithm Steps:
1. Start with initial solution and high temperature
2. Generate neighbor solution
3. If better, accept; if worse, accept with probability
4. Decrease temperature
5. Repeat until frozen (temperature near zero)
""",
                },
            ],
        },
    }

    return modules.get(module_id)


@router.get("/progress")
async def get_progress(db: Session = Depends(get_db)):
    """Get all learning progress."""
    progress = db.query(LearningProgress).all()
    return [
        {
            "module_id": p.module_id,
            "lesson_id": p.lesson_id,
            "status": p.status,
            "score": p.score,
            "completed_at": p.completed_at,
        }
        for p in progress
    ]


@router.post("/progress/{module_id}/{lesson_id}")
async def update_progress(
    module_id: str,
    lesson_id: str,
    status: str,
    score: int | None = None,
    db: Session = Depends(get_db),
):
    """Update progress for a lesson."""
    progress = (
        db.query(LearningProgress)
        .filter(
            LearningProgress.module_id == module_id,
            LearningProgress.lesson_id == lesson_id,
        )
        .first()
    )

    if progress:
        progress.status = status
        if score is not None:
            progress.score = score
        if status == "completed":
            progress.completed_at = datetime.utcnow()
    else:
        progress = LearningProgress(
            module_id=module_id,
            lesson_id=lesson_id,
            status=status,
            score=score,
            completed_at=datetime.utcnow() if status == "completed" else None,
        )
        db.add(progress)

    db.commit()
    return {"message": "Progress updated"}
