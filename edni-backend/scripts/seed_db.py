"""
Database Seed Script
====================
Seeds the PostgreSQL database with diagnostic questions
from data/edni_question_bank.json.

Handles the JSON format:
{
  "topic":         "Arrays",
  "concept":       "Dynamic Arrays",
  "bloom_level":   "Apply",          ← string, converted to int
  "knowledge_type":"Procedural",     ← ignored (not in model)
  "difficulty":    "medium",         ← capitalised to "Medium"
  "irt_a": 1.2, "irt_b": 0.0, "irt_c": 0.2,
  "question_text": "...",            ← mapped to title
  "options":       {"A":"..","B":"..","C":"..","D":".."},  ← dict converted to list
  "correct_answer":"D",              ← mapped to correct (lowercased)
  "explanation":   "...",
  "id":            "DSA_003",        ← ignored (model uses autoincrement int)
  "subject":       "Data Structures and Algorithms"  ← mapped to learning_area
}

Usage:
    python scripts/seed_db.py            # seed all questions
    python scripts/seed_db.py --clear    # clear table first then seed
    python scripts/seed_db.py --count    # just print count, no seeding
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


# ─── Bloom level mappings ─────────────────────────────────────────────────────

BLOOM_STR_TO_INT = {
    # full names
    "remember":   1, "understand": 2, "apply":    3,
    "analyse":    4, "analyze":    4, "evaluate": 5, "create":    6,
    # abbreviations
    "rem": 1, "und": 2, "app": 3, "ana": 4, "eva": 5, "cre": 6,
    # numeric strings
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
}

BLOOM_INT_TO_LABEL = {
    1: "Remember", 2: "Understand", 3: "Apply",
    4: "Analyze",  5: "Evaluate",   6: "Create",
}

# ─── Subject → learning area normalisation ────────────────────────────────────

SUBJECT_TO_LEARNING_AREA = {
    # common subject names → canonical learning areas
    "data structures and algorithms": "Data Structures",
    "data structures & algorithms":   "Data Structures",
    "data structures":                "Data Structures",
    "algorithms":                     "Algorithms & Complexity",
    "algorithms and complexity":      "Algorithms & Complexity",
    "algorithms & complexity":        "Algorithms & Complexity",
    "object-oriented programming":    "Object-Oriented Programming",
    "object oriented programming":    "Object-Oriented Programming",
    "oop":                            "Object-Oriented Programming",
    "databases":                      "Databases & SQL",
    "databases and sql":              "Databases & SQL",
    "databases & sql":                "Databases & SQL",
    "sql":                            "Databases & SQL",
    "operating systems":              "Operating Systems & Networks",
    "os and networks":                "Operating Systems & Networks",
    "os & networks":                  "Operating Systems & Networks",
    "networks":                       "Operating Systems & Networks",
    "software engineering":           "Software Engineering",
    "machine learning":               "Machine Learning & AI",
    "machine learning and ai":        "Machine Learning & AI",
    "machine learning & ai":          "Machine Learning & AI",
    "artificial intelligence":        "Machine Learning & AI",
    "ai":                             "Machine Learning & AI",
    "web development":                "Web Development",
    "web dev":                        "Web Development",
    "programming":                    "Foundations & Programming Basics",
    "programming basics":             "Foundations & Programming Basics",
    "foundations":                    "Foundations & Programming Basics",
    "foundations and programming":    "Foundations & Programming Basics",
    "foundations & programming basics": "Foundations & Programming Basics",
}

VALID_LEARNING_AREAS = {
    "Foundations & Programming Basics",
    "Data Structures",
    "Algorithms & Complexity",
    "Object-Oriented Programming",
    "Databases & SQL",
    "Operating Systems & Networks",
    "Software Engineering",
    "Machine Learning & AI",
    "Web Development",
}

DIFFICULTY_MAP = {
    "easy":   "Easy",
    "medium": "Medium",
    "hard":   "Hard",
    "low":    "Easy",
    "high":   "Hard",
}


# ─── Field transformers ───────────────────────────────────────────────────────

def parse_bloom_level(raw) -> int:
    """Convert any bloom_level representation to 1–6 integer."""
    if isinstance(raw, int):
        if 1 <= raw <= 6:
            return raw
        raise ValueError(f"bloom_level int out of range: {raw}")
    if isinstance(raw, str):
        key = raw.strip().lower()
        if key in BLOOM_STR_TO_INT:
            return BLOOM_STR_TO_INT[key]
    raise ValueError(f"Cannot parse bloom_level: {repr(raw)}")


def parse_learning_area(raw_subject: str, raw_learning_area: str = "") -> str:
    """
    Map subject / learning_area string to canonical learning area.
    Tries learning_area first, then subject.
    """
    for raw in [raw_learning_area, raw_subject]:
        if not raw:
            continue
        normalised = raw.strip().lower()
        if normalised in SUBJECT_TO_LEARNING_AREA:
            return SUBJECT_TO_LEARNING_AREA[normalised]
        # check if already a valid canonical area
        for area in VALID_LEARNING_AREAS:
            if normalised == area.lower():
                return area
    # fallback — return raw_subject capitalised
    logger.warning(f"Unknown subject/learning_area: '{raw_subject}' — using as-is")
    return raw_subject.strip() if raw_subject else "General"


def parse_options(raw_options) -> list:
    """
    Convert any options format to the model's list format:
    [{"id": "a", "label": "Option text", "desc": ""}]

    Handles:
      {"A": "text", "B": "text", ...}        ← dict format (your JSON)
      [{"id":"a","label":"..","desc":".."}]   ← already correct format
      ["option1", "option2", ...]             ← plain list
    """
    if isinstance(raw_options, dict):
        return [
            {
                "id":    key.lower(),
                "label": str(val),
                "desc":  str(val),   # desc same as label when not provided
            }
            for key, val in raw_options.items()
        ]

    if isinstance(raw_options, list):
        normalised = []
        for i, item in enumerate(raw_options):
            if isinstance(item, dict):
                # already in correct format — ensure lowercase id
                normalised.append({
                    "id":    str(item.get("id", chr(97 + i))).lower(),
                    "label": str(item.get("label", item.get("text", ""))),
                    "desc":  str(item.get("desc",  item.get("label", item.get("text", "")))),
                })
            elif isinstance(item, str):
                normalised.append({
                    "id":    chr(97 + i),   # a, b, c, d
                    "label": item,
                    "desc":  item,
                })
        return normalised

    raise ValueError(f"Cannot parse options: {type(raw_options)}")


def parse_correct(raw_correct) -> str:
    """
    Normalise correct answer to lowercase single letter.
    Handles: "D", "d", "option_d", "D)", "(D)", "4"
    """
    if raw_correct is None:
        raise ValueError("correct_answer is None")
    s = str(raw_correct).strip().lower()
    # strip punctuation/prefixes: "d)" → "d", "(d)" → "d", "option_d" → "d"
    s = s.strip("()). ").replace("option_", "").replace("option ", "")
    # if it is a digit (1→a, 2→b, ...)
    if s.isdigit():
        idx = int(s) - 1
        s   = chr(97 + idx)
    return s[0] if s else "a"   # take first char


def parse_difficulty(raw) -> str:
    """Normalise difficulty to Easy / Medium / Hard."""
    if not raw:
        return "Medium"
    return DIFFICULTY_MAP.get(str(raw).strip().lower(), "Medium")


def build_subtitle(q: dict) -> str:
    """
    Generate a subtitle from available fields.
    Uses concept, knowledge_type, or a generic prompt.
    """
    parts = []
    if q.get("concept"):
        parts.append(f"Concept: {q['concept']}")
    if q.get("knowledge_type"):
        parts.append(f"Type: {q['knowledge_type']}")
    if parts:
        return " | ".join(parts)
    return "Select the most accurate answer."


def build_tags(q: dict, bloom_level: int, learning_area: str) -> list:
    """Auto-generate tags from available JSON fields."""
    tags = set()
    tags.add(BLOOM_INT_TO_LABEL[bloom_level].lower())
    tags.add(learning_area.lower().replace(" ", "-").replace("&", "and"))
    if q.get("topic"):
        tags.add(q["topic"].lower().replace(" ", "-"))
    if q.get("concept"):
        tags.add(q["concept"].lower().replace(" ", "-"))
    if q.get("knowledge_type"):
        tags.add(q["knowledge_type"].lower())
    return sorted(tags)


# ─── Main transform ───────────────────────────────────────────────────────────

def transform_question(q: dict, order: int) -> dict | None:
    """
    Transform a raw JSON question into the DiagnosticQuestion model fields.
    Returns None if the question is invalid and should be skipped.
    """
    errors = []

    # ── bloom_level ──────────────────────────────────────────────────────────
    raw_bloom = q.get("bloom_level") or q.get("bloom") or q.get("cognitive_level")
    try:
        bloom_level = parse_bloom_level(raw_bloom)
    except ValueError as e:
        errors.append(str(e))
        bloom_level = None

    # ── learning_area ─────────────────────────────────────────────────────────
    learning_area = parse_learning_area(
        raw_subject      = q.get("subject", ""),
        raw_learning_area= q.get("learning_area", ""),
    )

    # ── title (question text) ─────────────────────────────────────────────────
    title = (
        q.get("question_text") or
        q.get("title")         or
        q.get("question")      or
        q.get("stem")          or ""
    ).strip()
    if not title:
        errors.append("No question text found")

    # ── options ───────────────────────────────────────────────────────────────
    raw_options = q.get("options") or q.get("choices") or []
    try:
        options = parse_options(raw_options)
    except ValueError as e:
        errors.append(str(e))
        options = []

    if len(options) < 2:
        errors.append(f"Too few options: {len(options)}")

    # ── correct answer ────────────────────────────────────────────────────────
    raw_correct = (
        q.get("correct_answer") or
        q.get("correct")        or
        q.get("answer")         or
        q.get("key")            or None
    )
    try:
        correct = parse_correct(raw_correct)
    except ValueError as e:
        errors.append(str(e))
        correct = "a"

    # ── topic ─────────────────────────────────────────────────────────────────
    topic = (
        q.get("topic")   or
        q.get("concept") or
        q.get("category")or learning_area
    ).strip()

    # ── difficulty ────────────────────────────────────────────────────────────
    difficulty = parse_difficulty(q.get("difficulty"))

    # ── IRT params ────────────────────────────────────────────────────────────
    irt_a = float(q.get("irt_a", 1.0))
    irt_b = float(q.get("irt_b", 0.0))
    irt_c = float(q.get("irt_c", 0.25))

    # Clamp to valid ranges
    irt_a = max(0.5, min(3.0,  irt_a))
    irt_b = max(-4.0, min(4.0, irt_b))
    irt_c = max(0.0,  min(0.35, irt_c))

    # ── Skip invalid questions ────────────────────────────────────────────────
    if errors:
        logger.warning(f"  Skipping Q#{order} (id={q.get('id','?')}): {'; '.join(errors)}")
        return None

    # ── Build subtitle and tags ───────────────────────────────────────────────
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
        "code":          q.get("code") or None,
        "options":       options,
        "correct":       correct,
        "explanation":   (q.get("explanation") or q.get("rationale") or "").strip(),
        "tags":          tags,
        "irt_a":         irt_a,
        "irt_b":         irt_b,
        "irt_c":         irt_c,
        "order":         order,
        "is_active":     True,
    }


# ─── Load and validate ────────────────────────────────────────────────────────

def load_questions() -> list[dict]:
    """Load raw questions from JSON file."""
    if not os.path.exists(QUESTION_FILE):
        raise FileNotFoundError(
            f"Question bank not found: {QUESTION_FILE}\n"
            f"Expected path: {QUESTION_FILE}"
        )

    logger.info(f"📚 Loading: {QUESTION_FILE}")

    with open(QUESTION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "questions" in data:
        return data["questions"]

    raise ValueError(
        "Invalid JSON format. "
        "Expected a JSON array or an object with a 'questions' key."
    )


def validate_and_transform(raw_questions: list) -> tuple[list, list]:
    """
    Transform all questions. Returns (valid_list, skipped_list).
    """
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
    logger.info("🌱 Starting database seed...")

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
    parser = argparse.ArgumentParser(description="Seed Edni AI diagnostic question bank")
    parser.add_argument("--clear",   action="store_true", help="Clear existing questions before seeding")
    parser.add_argument("--dry-run", action="store_true", help="Validate JSON only — no DB changes")
    args = parser.parse_args()

    asyncio.run(seed(
        clear_first = args.clear,
        dry_run     = args.dry_run,
    ))
