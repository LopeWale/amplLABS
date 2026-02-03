from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import create_tables
from app.api.routes import models, solver, data, learning, visualization, files, tutor

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AMPL Learning & Visualization Tool for DSA 5113",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup."""
    create_tables()


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """API health check."""
    return {"status": "healthy"}


# Include routers
app.include_router(models.router, prefix="/api/v1/models", tags=["Models"])
app.include_router(solver.router, prefix="/api/v1/solver", tags=["Solver"])
app.include_router(data.router, prefix="/api/v1/data", tags=["Data"])
app.include_router(learning.router, prefix="/api/v1/learning", tags=["Learning"])
app.include_router(visualization.router, prefix="/api/v1/visualization", tags=["Visualization"])
app.include_router(files.router, prefix="/api/v1/files", tags=["Files"])
app.include_router(tutor.router, prefix="/api/v1/tutor", tags=["AI Tutor"])
