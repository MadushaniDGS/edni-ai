"""
Question Bank Validator
=======================
Validates edni_question_bank.json before seeding.
Run this BEFORE seed_db.py to catch all issues.

Usage:
    python scripts/validate_questions.py
"""

import json
import os
import sys
from collections import Counter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUESTION_FILE = os.path.join(BASE_DIR, "data", "edni_question_bank.json")

BLOOM_STR_TO_INT = {
    "remember": 1, "understand": 2, "apply": 3,
    "analyse": 4, "analyze": 4, "evaluate": 5, "create": 6,
    "1":1,"2":2,"3":3,"4":4,"5":5,"6":6,
}

BLOOM_INT_TO_LABEL = {
    1:"Remember", 2:"Understand", 3:"Apply",
    4:"Analyze",  5:"Evaluate",   6:"Create",
}

VALID_DIFFICULTIES = {"easy","medium","hard","low","high","Easy","Medium","Hard"}

def check(condition, msg, errors):
    if not condition:
        errors.append(msg)

def validate():
    print(f"\n{'='*60}")
    print("EDNI AI — Question Bank Validator")
    print(f"{'='*60}")
    print(f"File: {QUESTION_FILE}\n")

    if not os.path.exists(QUESTION_FILE):
        print(f"❌ FILE NOT FOUND: {QUESTION_FILE}")
        print(f"\nCreate the data/ folder and place your JSON file there:")
        print(f"  mkdir edni-backend/data")
        print(f"  cp your_questions.json edni-backend/data/edni_question_bank.json")
        return False

    with open(QUESTION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        questions = data
    elif isinstance(data, dict) and "questions" in data:
        questions = data["questions"]
    else:
        print("❌ Invalid JSON format")
        return False

    print(f"✅ JSON loaded — {len(questions)} questions found\n")

    all_errors   = []
    bloom_dist   = Counter()
    area_dist    = Counter()
    duplicate_ids= []
    seen_ids     = set()
    seen_texts   = set()
    duplicate_q  = []

    for i, q in enumerate(questions, start=1):
        errors = []
        q_id   = q.get("id", f"Q#{i}")
        prefix = f"  Q#{i} (id={q_id})"

        # Check for duplicate IDs
        if q_id in seen_ids:
            duplicate_ids.append(q_id)
        seen_ids.add(q_id)

        # Check for duplicate question text
        qtext = (q.get("question_text") or q.get("title") or "").strip().lower()
        if qtext and qtext in seen_texts:
            duplicate_q.append(f"Q#{i}")
        if qtext:
            seen_texts.add(qtext)

        # ── Required fields ──
        check(q.get("question_text") or q.get("title") or q.get("question"),
              f"{prefix}: Missing question text (question_text / title / question)", errors)

        raw_bloom = q.get("bloom_level") or q.get("bloom") or q.get("cognitive_level")
        if raw_bloom is None:
            errors.append(f"{prefix}: Missing bloom_level")
        else:
            bl = str(raw_bloom).strip().lower()
            if bl not in BLOOM_STR_TO_INT:
                errors.append(f"{prefix}: Invalid bloom_level '{raw_bloom}' — use Remember/Understand/Apply/Analyze/Evaluate/Create or 1-6")
            else:
                bloom_dist[BLOOM_STR_TO_INT[bl]] += 1

        subject = q.get("subject") or q.get("learning_area") or ""
        if not subject:
            errors.append(f"{prefix}: Missing subject / learning_area")
        else:
            area_dist[subject] += 1

        raw_options = q.get("options") or q.get("choices") or []
        if isinstance(raw_options, dict):
            opt_count = len(raw_options)
        elif isinstance(raw_options, list):
            opt_count = len(raw_options)
        else:
            opt_count = 0
        check(opt_count >= 2, f"{prefix}: Need at least 2 options, found {opt_count}", errors)
        check(opt_count <= 6, f"{prefix}: Too many options ({opt_count}), expected 4", errors)

        raw_correct = (
            q.get("correct_answer") or q.get("correct") or
            q.get("answer") or q.get("key")
        )
        check(raw_correct is not None, f"{prefix}: Missing correct_answer / correct / answer", errors)

        # Check correct answer is one of the option keys
        if raw_correct and isinstance(raw_options, dict):
            valid_keys = {k.lower() for k in raw_options.keys()}
            correct_norm = str(raw_correct).strip().lower()
            if correct_norm not in valid_keys:
                errors.append(f"{prefix}: correct_answer '{raw_correct}' not in options keys {list(raw_options.keys())}")

        # ── IRT params ──
        for param in ["irt_a","irt_b","irt_c"]:
            if param in q:
                val = q[param]
                if not isinstance(val, (int, float)):
                    errors.append(f"{prefix}: {param} must be a number, got {type(val).__name__}")
        if "irt_a" in q and not (0.5 <= float(q["irt_a"]) <= 3.0):
            errors.append(f"{prefix}: irt_a={q['irt_a']} out of range [0.5, 3.0]")
        if "irt_b" in q and not (-4.0 <= float(q["irt_b"]) <= 4.0):
            errors.append(f"{prefix}: irt_b={q['irt_b']} out of range [-4.0, 4.0]")
        if "irt_c" in q and not (0.0 <= float(q["irt_c"]) <= 0.35):
            errors.append(f"{prefix}: irt_c={q['irt_c']} out of range [0.0, 0.35]")

        # ── Difficulty ──
        diff = q.get("difficulty","")
        if diff and str(diff).strip() not in VALID_DIFFICULTIES:
            errors.append(f"{prefix}: difficulty '{diff}' — use easy/medium/hard")

        if errors:
            all_errors.extend(errors)

    # ── Print results ──────────────────────────────────────────────────────────
    print(f"{'─'*60}")
    print("VALIDATION RESULTS")
    print(f"{'─'*60}")

    if all_errors:
        print(f"\n❌ ERRORS FOUND ({len(all_errors)} total):\n")
        for e in all_errors[:50]:
            print(f"  • {e}")
        if len(all_errors) > 50:
            print(f"  ... and {len(all_errors)-50} more errors")
    else:
        print(f"\n✅ All {len(questions)} questions passed validation!")

    if duplicate_ids:
        print(f"\n⚠️  DUPLICATE IDs ({len(duplicate_ids)}): {duplicate_ids[:10]}")

    if duplicate_q:
        print(f"\n⚠️  DUPLICATE QUESTIONS ({len(duplicate_q)}): {duplicate_q[:10]}")

    print(f"\n{'─'*60}")
    print("BLOOM LEVEL DISTRIBUTION")
    print(f"{'─'*60}")
    for lvl in sorted(bloom_dist):
        label = BLOOM_INT_TO_LABEL.get(lvl, f"L{lvl}")
        bar   = "█" * min(bloom_dist[lvl], 40)
        print(f"  L{lvl} {label:<12} {bloom_dist[lvl]:>4}  {bar}")

    # Check for missing bloom levels
    for lvl in range(1, 7):
        if lvl not in bloom_dist:
            print(f"  ⚠️  L{lvl} {BLOOM_INT_TO_LABEL[lvl]}: 0 questions — consider adding!")

    print(f"\n{'─'*60}")
    print("SUBJECT / LEARNING AREA DISTRIBUTION")
    print(f"{'─'*60}")
    for area, count in sorted(area_dist.items(), key=lambda x: -x[1]):
        bar = "█" * min(count, 40)
        print(f"  {area:<40} {count:>4}  {bar}")

    print(f"\n{'─'*60}")
    print("SUMMARY")
    print(f"{'─'*60}")
    print(f"  Total questions:     {len(questions)}")
    print(f"  Valid questions:     {len(questions) - len([e for e in all_errors if 'Q#' in e])}")
    print(f"  Errors:             {len(all_errors)}")
    print(f"  Duplicate IDs:      {len(duplicate_ids)}")
    print(f"  Duplicate texts:    {len(duplicate_q)}")
    print(f"  Bloom levels found: {sorted(bloom_dist.keys())}")

    passed = len(all_errors) == 0
    if passed:
        print(f"\n✅ READY TO SEED — run: python scripts/seed_db.py --clear")
    else:
        print(f"\n❌ FIX ERRORS BEFORE SEEDING")

    print()
    return passed

if __name__ == "__main__":
    ok = validate()
    sys.exit(0 if ok else 1)
