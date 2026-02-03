# AMPL Learning & Visualization Tool

A full-stack web application for DSA 5113 (Advanced Analytics and Metaheuristics) that helps you work with AMPL optimization models.

## Features

- **Model Editor** - Write and edit AMPL models with syntax highlighting and autocomplete
- **Solver Integration** - Run models with HiGHS, Gurobi, CPLEX, and other solvers
- **Visualization** - Interactive network graphs, sensitivity analysis charts
- **Learning Hub** - Tutorials on LP, MIP, NLP, and metaheuristics
- **Data Management** - Import from Excel, export results

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Code Editor | Monaco Editor |
| Charts | Recharts |
| Network Graphs | Cytoscape.js |
| Backend | FastAPI (Python) |
| Database | SQLite + SQLAlchemy |
| AMPL Integration | amplpy |

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- AMPL (Community Edition or licensed version)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install AMPL solvers (using amplpy)
python -c "from amplpy import modules; modules.install('highs')"
# Optionally install more solvers:
# modules.install('gurobi')
# modules.install('cplex')

# Run the backend
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at http://localhost:5173

### Using Docker (Alternative)

```bash
# From the root directory
docker-compose up
```

## Project Structure

```
amplLABS/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # REST API endpoints
│   │   ├── core/            # AMPL engine, metaheuristics
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── main.py          # FastAPI app
│   ├── content/             # Learning tutorials & examples
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand state
│   │   └── api/             # API client
│   └── package.json
│
└── docker-compose.yml
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/models` | GET, POST | List/create models |
| `/api/v1/models/{id}` | GET, PUT, DELETE | Model CRUD |
| `/api/v1/solver/run` | POST | Run optimization |
| `/api/v1/solver/solvers` | GET | List available solvers |
| `/api/v1/data/import/excel` | POST | Import Excel to .dat |
| `/api/v1/learning/modules` | GET | List learning modules |
| `/api/v1/visualization/network/{id}` | GET | Network graph data |

## Usage

### Creating a Model

1. Go to **Model Editor**
2. Write your AMPL model in the .mod tab
3. Add data in the .dat tab
4. Click **Run** to optimize

### Example Model

```ampl
# Transportation Problem
set ORIGINS;
set DESTINATIONS;

param supply {ORIGINS} >= 0;
param demand {DESTINATIONS} >= 0;
param cost {ORIGINS, DESTINATIONS} >= 0;

var ship {i in ORIGINS, j in DESTINATIONS} >= 0;

minimize TotalCost:
    sum {i in ORIGINS, j in DESTINATIONS} cost[i,j] * ship[i,j];

subject to Supply {i in ORIGINS}:
    sum {j in DESTINATIONS} ship[i,j] <= supply[i];

subject to Demand {j in DESTINATIONS}:
    sum {i in ORIGINS} ship[i,j] >= demand[j];
```

### Visualizing Results

1. After running a model, click **Visualize**
2. View network flow on the **Network Graph** tab
3. Check **Sensitivity Analysis** for shadow prices
4. Export results to Excel

## Learning Modules

1. **Linear Programming Fundamentals** - LP basics and AMPL syntax
2. **Mixed-Integer Programming** - Integer variables and MIP formulations
3. **Nonlinear Programming** - NLP and convexity
4. **Metaheuristics** - GA, simulated annealing, tabu search

## Development

### Adding a New API Route

1. Create route file in `backend/app/api/routes/`
2. Add router to `backend/app/main.py`
3. Create corresponding schemas in `backend/app/schemas/`

### Adding a New Component

1. Create component in `frontend/src/components/`
2. Import and use in pages

## License

MIT - For educational use in DSA 5113

## Support

For issues related to:
- **AMPL**: See [AMPL Documentation](https://ampl.com/resources/)
- **This tool**: Open an issue in the repository
