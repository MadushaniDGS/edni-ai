from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────
    APP_NAME:    str = "Edni AI Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG:       bool = False
    ENVIRONMENT: str = "development"

    # ── Security ──────────────────────────────────────────────────────
    SECRET_KEY:            str = "change-me-in-production"
    JWT_ACCESS_EXPIRE_MIN: int = 60 * 24 * 30  # 30 days
    JWT_REFRESH_EXPIRE_DAYS: int = 30
    ALGORITHM:             str = "HS256"

    # ── Databases ─────────────────────────────────────────────────────
    DATABASE_URL:       str = "postgresql+asyncpg://user:pass@localhost:5432/edni"
    REDIS_URL:          str = "redis://localhost:6379/0"
    MONGODB_URL:        str = "mongodb://localhost:27017"
    MONGODB_DB:         str = "edni_logs"

    # ── LLM ───────────────────────────────────────────────────────────
    GROQ_API_KEY:       str = ""
    GROQ_MODEL:         str = "openai/gpt-oss-120b"
    OPENAI_API_KEY:     str = ""          # fallback
    LLM_TEMPERATURE:    float = 0.2
    LLM_MAX_TOKENS:     int = 2048

    # ── RAG ───────────────────────────────────────────────────────────
    PINECONE_API_KEY:   str = ""
    PINECONE_INDEX:     str = "edni-oer"
    PINECONE_DIMENSION: int = 768
    COHERE_API_KEY:     str = ""
    COHERE_MODEL:       str = "rerank-english-v3.0"
    TOP_K_RETRIEVE:     int = 20
    TOP_N_RERANK:       int = 5

    # ── IRT ───────────────────────────────────────────────────────────
    IRT_MAX_ITERATIONS: int = 50
    IRT_CONVERGENCE:    float = 1e-6
    THETA_MIN:          float = -4.0
    THETA_MAX:          float = 4.0

    # ── Agent ─────────────────────────────────────────────────────────
    MAX_FEEDBACK_CYCLES: int = 3
    PLATEAU_THRESHOLD:   float = 0.05   # mastery gain below this triggers re-diagnosis
    PLATEAU_WEEKS:       int = 2
    REFLEXION_ROUNDS:    int = 2        # Planner self-critique rounds

    # ── Study Plan ────────────────────────────────────────────────────
    SEMESTER_WEEKS:     int = 16
    MAX_HOURS_PER_WEEK: int = 20

    # ── CORS ──────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
