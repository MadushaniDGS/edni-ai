from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from core.config import settings
from db.models.models import Base

# ── Async engine ──────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo        = settings.DEBUG,
    poolclass   = NullPool,   # required for asyncpg
    future      = True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_          = AsyncSession,
    expire_on_commit = False,
    autocommit      = False,
    autoflush       = False,
)


async def init_db() -> None:
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
