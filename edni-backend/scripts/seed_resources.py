"""
Resources Seed Script
=====================
Seeds the PostgreSQL database with learning resources
mapped to critical gap concepts and learning areas.

Usage:
    python scripts/seed_resources.py            # seed all resources
    python scripts/seed_resources.py --clear    # clear table first then seed
"""

import asyncio
import sys
import os
import argparse

from dotenv import load_dotenv
load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)

from db.models.models import Base, Resource
from core.config import settings


# ─── Learning Resources Data ──────────────────────────────────────────────────

RESOURCES = [
    # ── Data Structures: Arrays & Queues ──
    {
        "type": "video",
        "difficulty": "Easy",
        "title": "Understanding Queues in Data Structures",
        "description": "Learn how queues work, FIFO principle, and common operations like enqueue/dequeue.",
        "concept": "Queue Operations",
        "learning_area": "Data Structures",
        "bloom_levels": [1, 2, 3],
        "external_url": "https://www.youtube.com/watch?v=example_queue",
        "thumbnail": "https://via.placeholder.com/300x200?text=Queues",
        "cta_label": "Watch Video",
        "duration_minutes": 15,
    },
    {
        "type": "interactive",
        "difficulty": "Medium",
        "title": "Queue Implementation Challenge",
        "description": "Interactive coding challenge to implement a queue from scratch.",
        "concept": "Queue Operations",
        "learning_area": "Data Structures",
        "bloom_levels": [3, 4],
        "external_url": "https://www.codechef.com/example_queue",
        "thumbnail": "https://via.placeholder.com/300x200?text=Code+Challenge",
        "cta_label": "Start Coding",
        "duration_minutes": 30,
    },

    # ── Algorithms: Sorting ──
    {
        "type": "video",
        "difficulty": "Medium",
        "title": "Merge Sort Explained: Step by Step",
        "description": "Deep dive into merge sort algorithm, divide-and-conquer approach, and implementation.",
        "concept": "Merge Sort",
        "learning_area": "Algorithms & Complexity",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.youtube.com/watch?v=example_mergesort",
        "thumbnail": "https://via.placeholder.com/300x200?text=Merge+Sort",
        "cta_label": "Watch Video",
        "duration_minutes": 20,
    },
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Merge Sort Analysis and Complexity",
        "description": "Written guide covering merge sort with pseudocode and complexity analysis.",
        "concept": "Merge Sort",
        "learning_area": "Algorithms & Complexity",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://www.geeksforgeeks.org/merge-sort/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Article",
        "cta_label": "Read Article",
        "duration_minutes": 25,
    },

    # ── Complexity Analysis ──
    {
        "type": "video",
        "difficulty": "Easy",
        "title": "Big O Notation: Complete Guide",
        "description": "Introduction to Big O, time complexity, space complexity, and common patterns.",
        "concept": "Big O Notation",
        "learning_area": "Algorithms & Complexity",
        "bloom_levels": [1, 2, 3],
        "external_url": "https://www.youtube.com/watch?v=example_bigo",
        "thumbnail": "https://via.placeholder.com/300x200?text=Big+O",
        "cta_label": "Watch Video",
        "duration_minutes": 18,
    },
    {
        "type": "interactive",
        "difficulty": "Medium",
        "title": "Big O Visualization Tool",
        "description": "Interactive tool to visualize how different algorithms scale with input size.",
        "concept": "Big O Notation",
        "learning_area": "Algorithms & Complexity",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.bigocheatsheet.com/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Visualization",
        "cta_label": "Explore Tool",
        "duration_minutes": 20,
    },
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Space Complexity: Memory Analysis",
        "description": "Guide to analyzing space complexity, auxiliary space, and memory-efficient algorithms.",
        "concept": "Space Complexity",
        "learning_area": "Algorithms & Complexity",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.geeksforgeeks.org/space-complexity/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Space+Complexity",
        "cta_label": "Read Article",
        "duration_minutes": 15,
    },

    # ── Memory Management ──
    {
        "type": "video",
        "difficulty": "Hard",
        "title": "Garbage Collection in Programming Languages",
        "description": "How garbage collection works, mark-and-sweep, generational GC, and optimization.",
        "concept": "Garbage Collection",
        "learning_area": "Programming Languages",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://www.youtube.com/watch?v=example_gc",
        "thumbnail": "https://via.placeholder.com/300x200?text=Garbage+Collection",
        "cta_label": "Watch Video",
        "duration_minutes": 25,
    },
    {
        "type": "article",
        "difficulty": "Hard",
        "title": "Compiled vs Interpreted Languages: Deep Dive",
        "description": "Compare compilation, interpretation, JIT, AOT, and implications for performance.",
        "concept": "Compiled vs Interpreted",
        "learning_area": "Programming Languages",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://www.geeksforgeeks.org/compiled-and-interpreted-languages/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Compiled+Interpreted",
        "cta_label": "Read Article",
        "duration_minutes": 20,
    },

    # ── Databases: Normalization ──
    {
        "type": "video",
        "difficulty": "Medium",
        "title": "Second Normal Form (2NF) Explained",
        "description": "Learn about 2NF, partial dependencies, and how to normalize your database schema.",
        "concept": "2NF",
        "learning_area": "Databases & SQL",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.youtube.com/watch?v=example_2nf",
        "thumbnail": "https://via.placeholder.com/300x200?text=Database+Normalization",
        "cta_label": "Watch Video",
        "duration_minutes": 20,
    },
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Database Indexing Strategy for Performance",
        "description": "Guide to creating, maintaining, and optimizing indexes for query performance.",
        "concept": "Indexing Strategy",
        "learning_area": "Databases & SQL",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://use-the-index-luke.com/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Indexing",
        "cta_label": "Read Guide",
        "duration_minutes": 30,
    },
    {
        "type": "interactive",
        "difficulty": "Hard",
        "title": "Query Optimization with EXPLAIN",
        "description": "Learn to read query plans and use hints to optimize slow queries.",
        "concept": "Query Hints",
        "learning_area": "Databases & SQL",
        "bloom_levels": [4, 5, 6],
        "external_url": "https://www.postgresql.org/docs/current/sql-explain.html",
        "thumbnail": "https://via.placeholder.com/300x200?text=Query+Plans",
        "cta_label": "Learn EXPLAIN",
        "duration_minutes": 25,
    },

    # ── Testing & QA ──
    {
        "type": "video",
        "difficulty": "Easy",
        "title": "Sanity Testing vs Smoke Testing",
        "description": "Understand the difference between sanity testing, smoke testing, and regression testing.",
        "concept": "Sanity Testing",
        "learning_area": "Software Quality Assurance",
        "bloom_levels": [1, 2, 3],
        "external_url": "https://www.youtube.com/watch?v=example_sanity",
        "thumbnail": "https://via.placeholder.com/300x200?text=Testing",
        "cta_label": "Watch Video",
        "duration_minutes": 12,
    },
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Spike Testing in Software QA",
        "description": "Learn stress testing techniques, spike testing, and performance validation.",
        "concept": "Spike Testing",
        "learning_area": "Software Quality Assurance",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.geeksforgeeks.org/spike-testing/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Spike+Testing",
        "cta_label": "Read Article",
        "duration_minutes": 18,
    },
    {
        "type": "video",
        "difficulty": "Easy",
        "title": "Alpha vs Beta Testing Explained",
        "description": "Release testing phases, alpha releases, beta releases, and user acceptance testing.",
        "concept": "Alpha vs Beta Testing",
        "learning_area": "Software Quality Assurance",
        "bloom_levels": [1, 2, 3],
        "external_url": "https://www.youtube.com/watch?v=example_alphabeta",
        "thumbnail": "https://via.placeholder.com/300x200?text=Release+Testing",
        "cta_label": "Watch Video",
        "duration_minutes": 15,
    },
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Boundary Value Analysis in Testing",
        "description": "Test case design technique focusing on boundary conditions and edge cases.",
        "concept": "Boundary Value Analysis",
        "learning_area": "Software Quality Assurance",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.geeksforgeeks.org/boundary-value-analysis/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Boundary+Testing",
        "cta_label": "Read Article",
        "duration_minutes": 20,
    },
    {
        "type": "video",
        "difficulty": "Medium",
        "title": "Code Coverage Metrics Explained",
        "description": "Statement, branch, path coverage and how to measure test effectiveness.",
        "concept": "Code Coverage",
        "learning_area": "Software Quality Assurance",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.youtube.com/watch?v=example_coverage",
        "thumbnail": "https://via.placeholder.com/300x200?text=Coverage",
        "cta_label": "Watch Video",
        "duration_minutes": 17,
    },

    # ── Software Engineering Practices ──
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Test-Driven Development (TDD) Guide",
        "description": "Red-Green-Refactor cycle, benefits, and best practices for TDD.",
        "concept": "TDD",
        "learning_area": "Software Engineering",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.geeksforgeeks.org/test-driven-development/",
        "thumbnail": "https://via.placeholder.com/300x200?text=TDD",
        "cta_label": "Read Guide",
        "duration_minutes": 25,
    },
    {
        "type": "video",
        "difficulty": "Medium",
        "title": "Prototyping Strategies in Software Design",
        "description": "Types of prototypes, when to prototype, and rapid prototyping techniques.",
        "concept": "Prototyping",
        "learning_area": "Software Engineering",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.youtube.com/watch?v=example_prototyping",
        "thumbnail": "https://via.placeholder.com/300x200?text=Prototyping",
        "cta_label": "Watch Video",
        "duration_minutes": 18,
    },

    # ── Data Structures: Trees ──
    {
        "type": "video",
        "difficulty": "Hard",
        "title": "AVL Trees: Self-Balancing BSTs",
        "description": "Balance factors, rotations, insertion/deletion, and complexity analysis.",
        "concept": "AVL Tree",
        "learning_area": "Data Structures",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://www.youtube.com/watch?v=example_avl",
        "thumbnail": "https://via.placeholder.com/300x200?text=AVL+Trees",
        "cta_label": "Watch Video",
        "duration_minutes": 30,
    },
    {
        "type": "interactive",
        "difficulty": "Hard",
        "title": "Tree Traversal Visualization",
        "description": "Visualize DFS (pre-order, in-order, post-order) and BFS (level-order) traversals.",
        "concept": "DFS vs BFS",
        "learning_area": "Data Structures",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://visualgo.net/en/bfs",
        "thumbnail": "https://via.placeholder.com/300x200?text=Traversals",
        "cta_label": "Visualize",
        "duration_minutes": 15,
    },
    {
        "type": "article",
        "difficulty": "Hard",
        "title": "DFS vs BFS: When to Use Each",
        "description": "Depth-first search vs breadth-first search, applications, and space-time tradeoffs.",
        "concept": "DFS vs BFS",
        "learning_area": "Data Structures",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://www.geeksforgeeks.org/difference-between-bfs-and-dfs/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Search+Algorithms",
        "cta_label": "Read Article",
        "duration_minutes": 22,
    },

    # ── Algorithms: Dynamic Programming ──
    {
        "type": "video",
        "difficulty": "Hard",
        "title": "Bottom-Up vs Top-Down DP",
        "description": "Tabulation vs memoization, when to use each, and common DP patterns.",
        "concept": "Bottom-up vs Top-down",
        "learning_area": "Algorithms & Complexity",
        "bloom_levels": [3, 4, 5],
        "external_url": "https://www.youtube.com/watch?v=example_dp",
        "thumbnail": "https://via.placeholder.com/300x200?text=Dynamic+Programming",
        "cta_label": "Watch Video",
        "duration_minutes": 28,
    },

    # ── Type Systems ──
    {
        "type": "article",
        "difficulty": "Medium",
        "title": "Weak vs Strong Typing in Programming",
        "description": "Type safety, static vs dynamic typing, and implications for code reliability.",
        "concept": "Weak vs Strong Typing",
        "learning_area": "Programming Languages",
        "bloom_levels": [2, 3, 4],
        "external_url": "https://www.geeksforgeeks.org/weak-vs-strong-typing/",
        "thumbnail": "https://via.placeholder.com/300x200?text=Type+Systems",
        "cta_label": "Read Article",
        "duration_minutes": 20,
    },
]


# ─── Database Functions ───────────────────────────────────────────────────────

async def seed(clear_first: bool = False):
    """Main seed function."""
    logger.info("🌱 Starting resources seed...")

    # Database
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with SessionLocal() as session:

        if clear_first:
            await session.execute(text("DELETE FROM resources"))
            await session.commit()
            logger.info("🗑️  Cleared existing resources table")

        # Insert resources
        inserted = 0
        for res_data in RESOURCES:
            resource = Resource(**res_data)
            session.add(resource)
            inserted += 1

        await session.commit()
        logger.success(f"✅ Seeded {inserted} learning resources")

        # Print summary
        from collections import Counter
        type_dist = Counter(r["type"] for r in RESOURCES)
        area_dist = Counter(r["learning_area"] for r in RESOURCES)
        concept_dist = Counter(r["concept"] for r in RESOURCES)

        logger.info("\n=== Resource Distribution ===")
        logger.info("\nBy Type:")
        for rtype in sorted(type_dist):
            logger.info(f"  {rtype}: {type_dist[rtype]} resources")

        logger.info("\nBy Learning Area:")
        for area in sorted(area_dist):
            logger.info(f"  {area}: {area_dist[area]} resources")

        logger.info(f"\nBy Concept: {len(concept_dist)} unique concepts")

    await engine.dispose()
    logger.success("🎓 Resources seed complete!")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Edni AI learning resources")
    parser.add_argument("--clear", action="store_true", help="Clear existing resources before seeding")
    args = parser.parse_args()

    asyncio.run(seed(clear_first=args.clear))