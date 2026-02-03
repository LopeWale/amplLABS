from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Application configuration settings."""

    APP_NAME: str = "AMPL Learning Tool"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite:///./amplLABS.db"

    # AMPL
    AMPL_PATH: str | None = None  # Path to AMPL installation, None for default
    DEFAULT_SOLVER: str = "highs"
    SOLVER_TIMEOUT: int = 300  # 5 minutes default timeout

    # OpenAI API for AI Tutor
    # Available models: gpt-5.2, gpt-5.2-codex, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4.1-mini
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"  # Good balance of performance and cost

    # Available solvers (will be auto-detected)
    AVAILABLE_SOLVERS: list[str] = [
        "highs", "cplex", "gurobi", "cbc", "glpk", "xpress"
    ]

    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    CONTENT_DIR: Path = BASE_DIR / "content"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
