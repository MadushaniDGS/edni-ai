"""
Database Seed Script (v2.0)
============================
Seeds the PostgreSQL database with diagnostic questions
from data/edni_question_bank.json (converted format).

Handles the v2.0 JSON format with standardized field names:
{
  "question_id":   "DSA_001",        ← standardised ID
  "concept":       "Array Indexing",
  "learning_area": "Data Structures and Algorithms",  ← already normalised
  "bloom_level":   1,                ← integer (1–6), not string
  "knowledge_type": "Factual",       ← optional metadata
  "difficulty":    "easy",
  "irt_a": 0.8, "irt_b": -2.0, "irt_c": 0.25,
  "question_text": "...",            ← mapped to title
  "options": {"A":"..","B":"..","C":"..","D":".."}, ← dict format
  "correct_option": "B",             ← standardised field name
  "explanation":   "..."
}

Usage:
    python scripts/seed_db_v2.py            # seed all questions
    python scripts/seed_db_v2.py --clear    # clear table first then seed
    python scripts/seed_db_v2.py --dry-run  # validate JSON only, no DB changes
"""

import asyncio
import sys
import os
import json
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

from db.models.models import Base, DiagnosticQuestion
from core.config import settings


# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUESTION_FILE = os.path.join(BASE_DIR, "data", "edni_question_bank.json")


# ─── Bloom level constants ────────────────────────────────────────────────────

BLOOM_INT_TO_LABEL = {
    1: "Remember", 2: "Understand", 3: "Apply",
    4: "Analyze",  5: "Evaluate",   6: "Create",
}

# ─── Learning area validation ─────────────────────────────────────────────────

VALID_LEARNING_AREAS = {
    "Data Structures and Algorithms",
    "Software Quality Assurance",
    "Software Engineering",
    "Programming Languages",
    "Database Systems",
    # Add more canonical areas as needed
}

DIFFICULTY_MAP = {
    "easy":   "Easy",
    "medium": "Medium",
    "hard":   "Hard",
}


# ─── Field transformers ───────────────────────────────────────────────────────

def validate_bloom_level(bloom_level) -> int:
    """Ensure bloom_level is a valid integer (1–6)."""
    if isinstance(bloom_level, int):
        if 1 <= bloom_level <= 6:
            return bloom_level
        raise ValueError(f"bloom_level out of range: {bloom_level}")
    raise ValueError(f"bloom_level must be int, got {type(bloom_level)}: {bloom_level}")


def validate_learning_area(learning_area: str) -> str:
    """Ensure learning_area is valid; fallback to first found area."""
    if not learning_area:
        return "General"
    
    area = learning_area.strip()
    # If already valid, return it
    if area in VALID_LEARNING_AREAS:
        return area
    
    # Log warning but accept it
    logger.warning(f"Unknown learning_area: '{area}' — using as-is")
    return area


def parse_options(raw_options) -> list:
    """
    Convert options dict to model's list format:
    [{"id": "a", "label": "Option text", "desc": ""}]

    Handles:
      {"A": "text", "B": "text", ...}        ← dict format (your JSON)
      [{"id":"a","label":"..","desc":".."}]  ← already correct format
      ["option1", "option2", ...]            ← plain list
    """
    if isinstance(raw_options, dict):
        return [
            {
                "id":    key.lower(),
                "label": str(val),
                "desc":  str(val),
            }
            for key, val in raw_options.items()
        ]

    if isinstance(raw_options, list):
        normalised = []
        for i, item in enumerate(raw_options):
            if isinstance(item, dict):
                normalised.append({
                    "id":    str(item.get("id", chr(97 + i))).lower(),
                    "label": str(item.get("label", item.get("text", ""))),
                    "desc":  str(item.get("desc",  item.get("label", item.get("text", "")))),
                })
            elif isinstance(item, str):
                normalised.append({
                    "id":    chr(97 + i),
                    "label": item,
                    "desc":  item,
                })
        return normalised

    raise ValueError(f"Cannot parse options: {type(raw_options)}")


def parse_correct(raw_correct) -> str:
    """Normalise correct answer to lowercase single letter (a, b, c, d, ...)."""
    if raw_correct is None:
        raise ValueError("correct_option is None")
    s = str(raw_correct).strip().lower()
    # Handle various formats: "D", "d", "(D)", "D)", "option_d"
    s = s.strip("()). ").replace("option_", "").replace("option ", "")
    # If numeric (1→a, 2→b)
    if s.isdigit():
        idx = int(s) - 1
        s   = chr(97 + idx)
    return s[0] if s else "a"


def parse_difficulty(raw) -> str:
    """Normalise difficulty to Easy / Medium / Hard."""
    if not raw:
        return "Medium"
    return DIFFICULTY_MAP.get(str(raw).strip().lower(), "Medium")


def build_subtitle(q: dict) -> str:
    """Generate subtitle from concept and knowledge_type."""
    parts = []
    if q.get("concept"):
        parts.append(f"Concept: {q['concept']}")
    if q.get("knowledge_type"):
        parts.append(f"Type: {q['knowledge_type']}")
    if parts:
        return " | ".join(parts)
    return "Select the most accurate answer."


def build_tags(q: dict, bloom_level: int, learning_area: str) -> list:
    """Auto-generate tags from question metadata."""
    tags = set()
    tags.add(BLOOM_INT_TO_LABEL[bloom_level].lower())
    tags.add(learning_area.lower().replace(" ", "-").replace("&", "and"))
    if q.get("concept"):
        tags.add(q["concept"].lower().replace(" ", "-"))
    if q.get("knowledge_type"):
        tags.add(q["knowledge_type"].lower())
    return sorted(tags)


# ─── Main transform ───────────────────────────────────────────────────────────

def transform_question(q: dict, order: int) -> dict | None:
    """
    Transform a v2.0 JSON question into DiagnosticQuestion model fields.
    Returns None if invalid.
    """
    errors = []

    # ── bloom_level (already integer) ──────────────────────────────────────────
    raw_bloom = q.get("bloom_level")
    try:
        bloom_level = validate_bloom_level(raw_bloom)
    except ValueError as e:
        errors.append(str(e))
        bloom_level = 1

    # ── learning_area (already normalised) ──────────────────────────────────────
    learning_area = validate_learning_area(q.get("learning_area", ""))

    # ── title ──────────────────────────────────────────────────────────────────
    title = (q.get("question_text") or "").strip()
    if not title:
        errors.append("No question_text found")

    # ── options ────────────────────────────────────────────────────────────────
    raw_options = q.get("options", {})
    try:
        options = parse_options(raw_options)
    except ValueError as e:
        errors.append(str(e))
        options = []

    if len(options) < 2:
        errors.append(f"Too few options: {len(options)}")

    # ── correct answer (correct_option → correct) ──────────────────────────────
    raw_correct = q.get("correct_option")
    try:
        correct = parse_correct(raw_correct)
    except ValueError as e:
        errors.append(str(e))
        correct = "a"

    # ── concept ────────────────────────────────────────────────────────────────
    topic = (q.get("concept") or q.get("question_id", "")).strip()

    # ── difficulty ────────────────────────────────────────────────────────────
    difficulty = parse_difficulty(q.get("difficulty"))

    # ── IRT parameters (clamp to valid ranges) ────────────────────────────────
    irt_a = float(q.get("irt_a", 1.0))
    irt_b = float(q.get("irt_b", 0.0))
    irt_c = float(q.get("irt_c", 0.25))

    irt_a = max(0.5, min(3.0,  irt_a))
    irt_b = max(-4.0, min(4.0, irt_b))
    irt_c = max(0.0,  min(0.35, irt_c))

    # ── Skip if invalid ────────────────────────────────────────────────────────
    if errors:
        q_id = q.get("question_id", f"Q#{order}")
        logger.warning(f"  Skipping {q_id}: {'; '.join(errors)}")
        return None

    # ── Build subtitle and tags ────────────────────────────────────────────────
    subtitle = build_subtitle(q)
    tags     = build_tags(q, bloom_level, learning_area)

    return {
        "topic":         topic,
        "learning_area": learning_area,
        "bloom_level":   bloom_level,
        "bloom_label":   BLOOM_INT_TO_LABEL[bloom_level],
        "difficulty":    difficulty,
        "title":         title,
        "subtitle":      subtitle,
        "code":          q.get("code"),
        "options":       options,
        "correct":       correct,
        "explanation":   (q.get("explanation") or "").strip(),
        "tags":          tags,
        "irt_a":         irt_a,
        "irt_b":         irt_b,
        "irt_c":         irt_c,
        "order":         order,
        "is_active":     True,
    }


# ─── Load and validate ─────────────────────────────────────────────────────────

def load_questions() -> list[dict]:
    """Load questions from JSON file."""
    if not os.path.exists(QUESTION_FILE):
        raise FileNotFoundError(
            f"Question bank not found: {QUESTION_FILE}\n"
            f"Expected: {QUESTION_FILE}"
        )

    logger.info(f"📚 Loading: {QUESTION_FILE}")

    with open(QUESTION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "questions" in data:
        return data["questions"]

    raise ValueError(
        "Invalid JSON. Expected array or object with 'questions' key."
    )


def validate_and_transform(raw_questions: list) -> tuple[list, list]:
    """Transform all questions. Returns (valid_list, skipped_indices)."""
    valid   = []
    skipped = []

    for i, q in enumerate(raw_questions, start=1):
        transformed = transform_question(q, order=i)
        if transformed:
            valid.append(transformed)
        else:
            skipped.append(i)

    return valid, skipped


def print_distribution(questions: list):
    """Print Bloom and learning area distribution."""
    from collections import Counter

    bloom_dist = Counter(q["bloom_level"]   for q in questions)
    area_dist  = Counter(q["learning_area"] for q in questions)

    logger.info("\n=== Bloom Level Distribution ===")
    for lvl in sorted(bloom_dist):
        label = BLOOM_INT_TO_LABEL[lvl]
        logger.info(f"  L{lvl} {label}: {bloom_dist[lvl]} questions")

    logger.info("\n=== Learning Area Distribution ===")
    for area in sorted(area_dist):
        logger.info(f"  {area}: {area_dist[area]} questions")


# ─── Seed ─────────────────────────────────────────────────────────────────────

async def seed(clear_first: bool = False, dry_run: bool = False):
    """Main seed function."""
    logger.info("🌱 Starting database seed (v2.0 format)...")

    # Load + transform
    raw   = load_questions()
    valid, skipped = validate_and_transform(raw)

    logger.info(f"\n📊 Validation Summary:")
    logger.info(f"  Total in JSON:  {len(raw)}")
    logger.info(f"  Valid:          {len(valid)}")
    logger.info(f"  Skipped:        {len(skipped)}")
    if skipped:
        logger.warning(f"  Skipped rows:   {skipped}")

    print_distribution(valid)

    if dry_run:
        logger.info("🔍 Dry run — no database changes made.")
        return

    if not valid:
        logger.error("No valid questions to seed. Aborting.")
        return

    # Database
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with SessionLocal() as session:

        if clear_first:
            await session.execute(text("DELETE FROM diagnostic_questions"))
            await session.commit()
            logger.info("🗑️  Cleared existing diagnostic_questions table")

        inserted = 0
        for q_data in valid:
            session.add(DiagnosticQuestion(**q_data))
            inserted += 1

        await session.commit()
        logger.success(f"✅ Seeded {inserted} diagnostic questions")

    await engine.dispose()
    logger.success("🎓 Database seed complete!")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Edni AI diagnostic questions (v2.0)")
    parser.add_argument("--clear",   action="store_true", help="Clear existing questions before seeding")
    parser.add_argument("--dry-run", action="store_true", help="Validate only — no DB changes")
    args = parser.parse_args()

    asyncio.run(seed(
        clear_first = args.clear,
        dry_run     = args.dry_run,
    ))