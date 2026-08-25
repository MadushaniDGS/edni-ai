"""
Resource Seed Script
=====================
Seeds sample OER learning resources into the Resource table.
This is the SQL fallback used by GET /resources/ — separate from the
Pinecone vector index used by the RemediationAgent for RAG retrieval.

Usage:
    python scripts/seed_resources.py
"""

import asyncio
import sys
import os
from dotenv import load_dotenv
load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from db.models.models import Base, Resource
from core.config import settings


RESOURCES = [
    {"type": "Video", "difficulty": "Easy", "title": "Binary Search Trees — Visual Introduction",
     "description": "A visual walkthrough of BST structure, insertion, and traversal.",
     "concept": "Trees & BST", "learning_area": "Data Structures", "bloom_levels": [1, 2],
     "external_url": "https://example.com/bst-intro", "thumbnail": "tree", "duration_minutes": 25},
    {"type": "Article", "difficulty": "Medium", "title": "BST Implementation in Python — Step by Step",
     "description": "Implement insert, search, and traversal methods for a BST class.",
     "concept": "Trees & BST", "learning_area": "Data Structures", "bloom_levels": [3, 4],
     "external_url": "https://example.com/bst-python", "thumbnail": "code", "duration_minutes": 40},
    {"type": "Video", "difficulty": "Medium", "title": "Recursion Masterclass — Base Cases & Call Stacks",
     "description": "Understand recursive functions, base cases, and the call stack.",
     "concept": "Recursion", "learning_area": "Algorithms & Complexity", "bloom_levels": [1, 2, 3],
     "external_url": "https://example.com/recursion", "thumbnail": "loop", "duration_minutes": 35},
    {"type": "Article", "difficulty": "Medium", "title": "Hash Tables — Collision Resolution Strategies",
     "description": "Chaining vs open addressing, load factors, and rehashing.",
     "concept": "Hash Tables", "learning_area": "Data Structures", "bloom_levels": [2, 3, 4],
     "external_url": "https://example.com/hash", "thumbnail": "grid", "duration_minutes": 30},
    {"type": "Video", "difficulty": "Medium", "title": "Graph BFS and DFS — Animated Walkthrough",
     "description": "BFS and DFS traversal animated with queue/stack visualisation.",
     "concept": "Graphs", "learning_area": "Data Structures", "bloom_levels": [1, 2, 3],
     "external_url": "https://example.com/graph-traversal", "thumbnail": "graph", "duration_minutes": 30},
    {"type": "Book", "difficulty": "Hard", "title": "Dynamic Programming — From Recursion to Memoisation",
     "description": "DP fundamentals: Fibonacci, Knapsack, LCS, Coin Change.",
     "concept": "Dynamic Programming", "learning_area": "Algorithms & Complexity", "bloom_levels": [3, 4, 5],
     "external_url": "https://example.com/dp-book", "thumbnail": "book", "duration_minutes": 90},
    {"type": "Article", "difficulty": "Easy", "title": "Big O Notation — Time and Space Complexity",
     "description": "Understand growth rates: O(1), O(log n), O(n), O(n log n), O(n²).",
     "concept": "Big O Notation", "learning_area": "Algorithms & Complexity", "bloom_levels": [1, 2],
     "external_url": "https://example.com/big-o", "thumbnail": "chart", "duration_minutes": 20},
    {"type": "Article", "difficulty": "Medium", "title": "SOLID Principles with Python Examples",
     "description": "SRP, OCP, LSP, ISP, DIP explained with refactoring examples.",
     "concept": "SOLID Principles", "learning_area": "Object-Oriented Programming", "bloom_levels": [2, 3, 4],
     "external_url": "https://example.com/solid", "thumbnail": "puzzle", "duration_minutes": 35},
    {"type": "Video", "difficulty": "Hard", "title": "SQL Window Functions — RANK, LEAD, LAG",
     "description": "Advanced SQL analytics functions for ranking and running totals.",
     "concept": "Advanced SQL", "learning_area": "Databases & SQL", "bloom_levels": [3, 4],
     "external_url": "https://example.com/sql-window", "thumbnail": "database", "duration_minutes": 40},
    {"type": "Article", "difficulty": "Medium", "title": "Database Normalisation — 1NF to BCNF",
     "description": "Step-by-step normalisation from 1NF through BCNF with examples.",
     "concept": "Database Normalisation", "learning_area": "Databases & SQL", "bloom_levels": [2, 4, 5],
     "external_url": "https://example.com/normalisation", "thumbnail": "database", "duration_minutes": 45},
    {"type": "Video", "difficulty": "Medium", "title": "React Hooks — useState, useEffect, useContext",
     "description": "Core React hooks explained with practical examples.",
     "concept": "React Fundamentals", "learning_area": "Web Development", "bloom_levels": [1, 2, 3],
     "external_url": "https://example.com/react-hooks", "thumbnail": "react", "duration_minutes": 50},
    {"type": "Book", "difficulty": "Hard", "title": "Neural Networks from Scratch — NumPy Implementation",
     "description": "Build a neural network from scratch: forward pass, backprop, gradient descent.",
     "concept": "Neural Networks", "learning_area": "Machine Learning & AI", "bloom_levels": [3, 5, 6],
     "external_url": "https://example.com/nn-scratch", "thumbnail": "brain", "duration_minutes": 120},
    {"type": "Article", "difficulty": "Medium", "title": "Overfitting, Regularisation, and Cross-Validation",
     "description": "Diagnose and fix overfitting with L1/L2 regularisation and k-fold CV.",
     "concept": "Bias-Variance Tradeoff", "learning_area": "Machine Learning & AI", "bloom_levels": [2, 4, 5],
     "external_url": "https://example.com/regularisation", "thumbnail": "chart", "duration_minutes": 35},
    {"type": "Article", "difficulty": "Easy", "title": "Git Branching Strategies for Teams",
     "description": "Gitflow, GitHub Flow, and trunk-based development compared.",
     "concept": "Version Control", "learning_area": "Software Engineering", "bloom_levels": [1, 2, 3],
     "external_url": "https://example.com/git-branching", "thumbnail": "git", "duration_minutes": 20},
    {"type": "Video", "difficulty": "Hard", "title": "System Design — URL Shortener at Scale",
     "description": "Design a URL shortener handling billions of redirects per month.",
     "concept": "System Design", "learning_area": "Software Engineering", "bloom_levels": [4, 5, 6],
     "external_url": "https://example.com/system-design-url", "thumbnail": "system", "duration_minutes": 60},
    {"type": "Article", "difficulty": "Medium", "title": "Processes vs Threads — OS Concurrency",
     "description": "Process isolation, thread sharing, race conditions, and locks.",
     "concept": "Processes & Threads", "learning_area": "Operating Systems & Networks", "bloom_levels": [1, 2, 4],
     "external_url": "https://example.com/processes-threads", "thumbnail": "cpu", "duration_minutes": 30},
    {"type": "Exercise", "difficulty": "Easy", "title": "Linked List — Implementation and Operations",
     "description": "Hands-on exercises: insert, delete, reverse, cycle detection.",
     "concept": "Linked Lists", "learning_area": "Data Structures", "bloom_levels": [3],
     "external_url": "https://example.com/linked-list-exercises", "thumbnail": "list", "duration_minutes": 25},
    {"type": "Book", "difficulty": "Hard", "title": "Design Patterns — Factory, Observer, Strategy",
     "description": "Classic GoF patterns applied to real payment and notification systems.",
     "concept": "Design Patterns", "learning_area": "Object-Oriented Programming", "bloom_levels": [3, 5, 6],
     "external_url": "https://example.com/design-patterns", "thumbnail": "pattern", "duration_minutes": 75},
    {"type": "Article", "difficulty": "Easy", "title": "HTTP Status Codes and REST API Best Practices",
     "description": "2xx/4xx/5xx codes, resource-based URLs, pagination, and versioning.",
     "concept": "HTTP & REST", "learning_area": "Operating Systems & Networks", "bloom_levels": [1, 2],
     "external_url": "https://example.com/http-rest", "thumbnail": "web", "duration_minutes": 15},
    {"type": "Article", "difficulty": "Hard", "title": "Authentication Strategies — JWT vs Sessions",
     "description": "Trade-offs between stateless JWT and stateful session authentication.",
     "concept": "API Design", "learning_area": "Web Development", "bloom_levels": [4, 5],
     "external_url": "https://example.com/jwt-vs-sessions", "thumbnail": "lock", "duration_minutes": 30},
]


async def seed_resources():
    logger.info(f"🌱 Seeding {len(RESOURCES)} resources...")

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as session:
        existing_count = await session.scalar(select(Resource))
        # Clear existing to avoid duplicates on re-run
        from sqlalchemy import text
        await session.execute(text("DELETE FROM resources"))
        await session.commit()

        for r in RESOURCES:
            session.add(Resource(**r, cta_label="Open Resource", pinecone_indexed=False))

        await session.commit()
        logger.success(f"✅ Seeded {len(RESOURCES)} resources")

    await engine.dispose()
    logger.success("🎓 Resource seed complete!")


if __name__ == "__main__":
    asyncio.run(seed_resources())
