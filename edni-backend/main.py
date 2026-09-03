"""
Edni AI — FastAPI Main Application
===================================
Entry point for the agentic backend.
Run with: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from loguru import logger

from core.config import settings
from db.session import init_db
from api.routes.routes import (
    auth_router,
    user_router,
    diagnostic_router,
    planner_router,
    tasks_router,
    notif_router,
    analytics_router,
    modules_router,
    resources_router,
    mentor_router,
    knowledge_profile_router,
)


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting Edni AI Backend...")

    # Init PostgreSQL tables
    await init_db()
    logger.success("✅ Database tables ready")

    # Verify Pinecone connection
    try:
        from pinecone import Pinecone
        pc    = Pinecone(api_key=settings.PINECONE_API_KEY)
        index = pc.Index(settings.PINECONE_INDEX)
        stats = index.describe_index_stats()
        logger.success(f"✅ Pinecone connected — {stats.total_vector_count} vectors indexed")
    except Exception as e:
        logger.warning(f"⚠️  Pinecone not connected: {e} — RAG will use fallback")

    # Verify Redis connection
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        logger.success("✅ Redis connected")
    except Exception as e:
        logger.warning(f"⚠️  Redis not connected: {e} — caching disabled")

    # Verify Groq LLM
    try:
        from langchain_groq import ChatGroq
        llm = ChatGroq(api_key=settings.GROQ_API_KEY, model_name=settings.GROQ_MODEL)
        await llm.ainvoke("ping")
        logger.success(f"✅ LLM ready — {settings.GROQ_MODEL}")
    except Exception as e:
        logger.warning(f"⚠️  LLM not connected: {e} — agent will use fallback responses")

    logger.success("🎓 Edni AI Backend ready!")
    yield

    logger.info("👋 Shutting down Edni AI Backend...")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.APP_VERSION,
    description = (
        "Agentic LLM Framework for Adaptive Academic Planning. "
        "Bloom's Taxonomy + 3PL IRT + LangGraph + RAG (Pinecone + Cohere)."
    ),
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    lifespan    = lifespan,
    redirect_slashes=False,
)

# ─── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ─── Routers ──────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth_router,       prefix=PREFIX)
app.include_router(user_router,       prefix=PREFIX)
app.include_router(diagnostic_router, prefix=PREFIX)
app.include_router(knowledge_profile_router,prefix=PREFIX)
app.include_router(planner_router,    prefix=PREFIX)
app.include_router(tasks_router,      prefix=PREFIX)
app.include_router(notif_router,      prefix=PREFIX)
app.include_router(analytics_router,  prefix=PREFIX)
app.include_router(modules_router,    prefix=PREFIX)
app.include_router(resources_router,  prefix=PREFIX)
app.include_router(mentor_router,     prefix=PREFIX)


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status":  "healthy",
        "version": settings.APP_VERSION,
        "env":     settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Edni AI — Agentic Academic Planning API",
        "docs":    "/docs",
        "version": settings.APP_VERSION,
    }
