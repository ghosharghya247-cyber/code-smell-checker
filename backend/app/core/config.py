from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    database_url: str = "postgresql://codesmell:codesmell@localhost:5432/codesmell"
    jwt_secret: str = "dev-secret-key"
    environment: str = "development"
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    max_code_size: int = 1024 * 1024  # 1MB
    ai_provider: str = "openai"
    ai_model: str = "gpt-4o-mini"
    ai_api_key: str = ""
    max_chat_history: int = 10
    max_context_lines: int = 200
    streaming_enabled: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()
