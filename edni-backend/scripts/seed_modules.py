"""
Module Seed Script
==================
Seeds the 9 canonical learning area modules into the database.
Run ONCE after seed_db.py.

Usage:
    python scripts/seed_modules.py
"""

import asyncio
import sys
import os

from dotenv import load_dotenv
load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from db.models.models import Base, Module
from core.config import settings


# ─── The 9 canonical modules ──────────────────────────────────────────────────
# One module per learning area — matches question bank exactly

MODULES = [
    {
        "slug":            "foundations",
        "label":           "Foundations & Programming Basics",
        "icon":            "💻",
        "icon_bg":         "#EEF2FF",
        "icon_color":      "#4F46E5",
        "category":        "Core",
        "description":     "Variables, data types, control flow, functions, recursion, error handling, and design patterns.",
        "bloom_level":     3,
        "estimated_hours": 12,
        "order":           1,
    },
    {
        "slug":            "data-structures",
        "label":           "Data Structures",
        "icon":            "🌲",
        "icon_bg":         "#ECFDF5",
        "icon_color":      "#059669",
        "category":        "Core",
        "description":     "Arrays, linked lists, stacks, queues, trees, heaps, hash tables, and graphs.",
        "bloom_level":     4,
        "estimated_hours": 15,
        "order":           2,
    },
    {
        "slug":            "algorithms",
        "label":           "Algorithms & Complexity",
        "icon":            "⚡",
        "icon_bg":         "#FFF7ED",
        "icon_color":      "#EA580C",
        "category":        "Core",
        "description":     "Big O notation, sorting, searching, dynamic programming, greedy algorithms, and graph traversal.",
        "bloom_level":     4,
        "estimated_hours": 18,
        "order":           3,
    },
    {
        "slug":            "oop",
        "label":           "Object-Oriented Programming",
        "icon":            "🧩",
        "icon_bg":         "#F5F3FF",
        "icon_color":      "#7C3AED",
        "category":        "Core",
        "description":     "Encapsulation, inheritance, polymorphism, abstraction, SOLID principles, and design patterns.",
        "bloom_level":     4,
        "estimated_hours": 12,
        "order":           4,
    },
    {
        "slug":            "databases",
        "label":           "Databases & SQL",
        "icon":            "🗄️",
        "icon_bg":         "#FFFBEB",
        "icon_color":      "#D97706",
        "category":        "Applied",
        "description":     "SQL queries, joins, normalisation, indexing, transactions, ACID properties, and schema design.",
        "bloom_level":     4,
        "estimated_hours": 12,
        "order":           5,
    },
    {
        "slug":            "os-networks",
        "label":           "Operating Systems & Networks",
        "icon":            "🌐",
        "icon_bg":         "#FEF2F2",
        "icon_color":      "#DC2626",
        "category":        "Applied",
        "description":     "Processes, threads, concurrency, deadlocks, CPU scheduling, HTTP, REST, and network protocols.",
        "bloom_level":     4,
        "estimated_hours": 10,
        "order":           6,
    },
    {
        "slug":            "software-engineering",
        "label":           "Software Engineering",
        "icon":            "🔧",
        "icon_bg":         "#FDF2F8",
        "icon_color":      "#DB2777",
        "category":        "Applied",
        "description":     "Version control, testing strategies, system design, scaling, SDLC, and agile methodologies.",
        "bloom_level":     5,
        "estimated_hours": 10,
        "order":           7,
    },
    {
        "slug":            "ml-ai",
        "label":           "Machine Learning & AI",
        "icon":            "🤖",
        "icon_bg":         "#EFF6FF",
        "icon_color":      "#2563EB",
        "category":        "Advanced",
        "description":     "Supervised/unsupervised learning, neural networks, bias-variance tradeoff, evaluation metrics, and model design.",
        "bloom_level":     5,
        "estimated_hours": 14,
        "order":           8,
    },
    {
        "slug":            "web-development",
        "label":           "Web Development",
        "icon":            "🌍",
        "icon_bg":         "#F0FDF4",
        "icon_color":      "#16A34A",
        "category":        "Applied",
        "description":     "React, hooks, props/state, REST API design, CORS, authentication (JWT vs sessions), and real-time systems.",
        "bloom_level":     4,
        "estimated_hours": 10,
        "order":           9,
    },
]


async def seed_modules():
    logger.info("🌱 Seeding modules...")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with SessionLocal() as session:
        inserted = 0
        skipped  = 0

        for m in MODULES:
            # Check if already exists
            from sqlalchemy import select
            existing = await session.scalar(
                select(Module).where(Module.slug == m["slug"])
            )
            if existing:
                # Update existing record in case descriptions changed
                for k, v in m.items():
                    setattr(existing, k, v)
                skipped += 1
            else:
                session.add(Module(**m, is_active=True))
                inserted += 1

        await session.commit()
        logger.success(f"✅ Modules: {inserted} inserted, {skipped} updated")

    await engine.dispose()
    logger.success("🎓 Module seed complete!")


if __name__ == "__main__":
    asyncio.run(seed_modules())
