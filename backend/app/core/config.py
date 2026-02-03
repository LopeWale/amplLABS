"""Application configuration using environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./ampl_lab.db"

    # AMPL
    ampl_path: str | None = None

    # OpenAI API
    openai_api_key: str | None = None
    openai_model: str = "gpt-4-turbo-preview"

    # Application
    debug: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
