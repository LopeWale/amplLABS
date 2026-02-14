# Changelog

## 2026-02-14 - Visualization Reliability + Tutor Integration (Track A)

### Decisions
- Kept existing staged source changes in `backend/app/api/routes/tutor.py`, `backend/app/api/routes/data.py`, and `frontend/src/pages/ModelEditor.tsx` after review because they were aligned or harmless.
- Reset generated artifacts (`backend/ampl_lab.db`, `backend/app/__pycache__/`) to keep repository state clean.

### Backend
- Hardened AMPL solve flow in `backend/app/core/ampl_engine.py`:
  - Uses explicit data-mode loading for `.dat` content.
  - Replaced fragile no-arg output capture with safe `getOutput("solve;")` + fallback.
  - Added normalized status mapping (`optimal|infeasible|unbounded|error|unknown`).
- Extended solver APIs in `backend/app/api/routes/solver.py`:
  - Added `GET /api/v1/solver/results`.
  - Added `GET /api/v1/solver/results/{result_id}`.
  - Fixed job-state handling so error runs are marked failed and not falsely completed.
- Added solver result response schemas in `backend/app/schemas/solver.py`.
- Extended tutor context in `backend/app/api/routes/tutor.py`:
  - Added optional `result_id`, `analysis_focus`, `include_visualization_context`.
  - Injects persisted run/sensitivity context into tutor prompts.
- Added explicit no-network reason field in `backend/app/api/routes/visualization.py`.

### Frontend
- Added global tutor state store `frontend/src/store/tutorStore.ts`.
- Wired global tutor open/close to store in `frontend/src/App.tsx`.
- Updated tutor component in `frontend/src/components/learning/AITutor.tsx`:
  - Sends optional visualization context to backend.
  - Shows context badge (`Result #id • focus`).
  - Supports seeded question flow for manual Explain action.
- Updated visualization page in `frontend/src/pages/Visualization.tsx`:
  - Added manual **Explain Results** button.
  - Opens tutor with focused result context.
  - Fetches run summary and improves no-data messaging.
- Updated solver store in `frontend/src/store/solverStore.ts`:
  - Fetches full run details after job completion.
  - Fixed options typing for strict TypeScript.
- Connected history page to real solver results endpoint in `frontend/src/pages/History.tsx`.
- Updated API client in `frontend/src/api/index.ts` for new solver/tutor contracts.

### Frontend TypeScript Cleanup
- Removed unused imports/variables and fixed typing issues across components/pages.
- Added module declaration `frontend/src/types/react-cytoscapejs.d.ts`.
