"""Configuration management using pydantic-settings."""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    tavily_api_key: str = Field(..., description="Tavily API key")
    openai_api_key: str = Field(..., description="OpenAI API key")
    groq_api_key: str = Field(..., description="Groq API key")

    # Application URLs
    vite_app_url: str = Field(
        default="http://localhost:5173", description="Frontend URL for CORS"
    )
    backend_url: str = Field(
        default="http://localhost:8080", description="Backend URL"
    )

    # Security Settings
    max_file_size_mb: int = Field(
        default=10, description="Maximum file upload size in MB"
    )
    rate_limit_per_minute: int = Field(
        default=10, description="API rate limit per minute per IP"
    )
    allowed_file_extensions: list[str] = Field(
        default=[".pdf", ".txt", ".md", ".docx", ".csv", ".html"],
        description="Allowed file extensions for upload",
    )

    # Agent Configuration
    max_search_results: int = Field(
        default=10, description="Maximum search results from Tavily"
    )
    crawl_limit: int = Field(default=15, description="Maximum pages to crawl")
    max_conversation_turns: int = Field(
        default=50, description="Maximum turns in a conversation"
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")

    # Database (for future use)
    database_url: Optional[str] = Field(
        default=None, description="Database connection URL"
    )
    redis_url: str = Field(
        default="redis://localhost:6379", description="Redis connection URL for caching"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
