"""
Resolution Lab - Configuration Settings
Loads environment variables and provides typed configuration.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "Resolution Lab"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    
    # Opik (Comet)
    opik_api_key: str = ""
    opik_workspace: str = ""
    opik_project_name: str = "resolution-lab"
    
    # LLM - Google Gemini
    google_api_key: str = ""
    llm_model: str = "gemini/gemini-1.5-flash"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
