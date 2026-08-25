"""
Bloom's Taxonomy Knowledge Gap Identification Engine
=====================================================
Redesigned as per supervisor feedback:
- Replaces raw IRT-only scoring with Bloom's Taxonomy cognitive level mapping
- Each concept is assessed at 6 cognitive levels (Remember → Create)
- Gaps are identified at the COGNITIVE LEVEL, not just the concept level
- IRT 3PL model provides the psychometric θ (ability) score per Bloom level
- Output: structured KnowledgeProfile with per-concept, per-level gap severity
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from enum import IntEnum
import numpy as np
from scipy.optimize import minimize_scalar
from loguru import logger


# ─── Bloom's Taxonomy Levels ──────────────────────────────────────────────────
class BloomLevel(IntEnum):
    REMEMBER   = 1
    UNDERSTAND = 2
    APPLY      = 3
    ANALYZE    = 4
    EVALUATE   = 5
    CREATE     = 6


BLOOM_LABELS = {
    BloomLevel.REMEMBER:   "Remember",
    BloomLevel.UNDERSTAND: "Understand",
    BloomLevel.APPLY:      "Apply",
    BloomLevel.ANALYZE:    "Analyze",
    BloomLevel.EVALUATE:   "Evaluate",
    BloomLevel.CREATE:     "Create",
}

BLOOM_VERBS = {
    BloomLevel.REMEMBER:   ["define","list","recall","identify","name","state"],
    BloomLevel.UNDERSTAND: ["explain","describe","summarise","classify","distinguish"],
    BloomLevel.APPLY:      ["implement","use","execute","solve","demonstrate"],
    BloomLevel.ANALYZE:    ["analyze","compare","differentiate","examine","break down"],
    BloomLevel.EVALUATE:   ["evaluate","judge","justify","critique","assess"],
    BloomLevel.CREATE:     ["design","build","formulate","construct","plan"],
}

# Learning areas mapped to Bloom progression weights
# (higher Bloom levels weighted more heavily for gap severity)
BLOOM_WEIGHTS = {
    BloomLevel.REMEMBER:   0.05,
    BloomLevel.UNDERSTAND: 0.10,
    BloomLevel.APPLY:      0.20,
    BloomLevel.ANALYZE:    0.25,
    BloomLevel.EVALUATE:   0.20,
    BloomLevel.CREATE:     0.20,
}

LEARNING_AREAS = [
    "Foundations & Programming Basics",
    "Data Structures",
    "Algorithms & Complexity",
    "Object-Oriented Programming",
    "Databases & SQL",
    "Operating Systems & Networks",
    "Software Engineering",
    "Machine Learning & AI",
    "Web Development",
]


# ─── IRT 3-Parameter Logistic Model ──────────────────────────────────────────
@dataclass
class IRTParameters:
    """
    3PL IRT parameters for a single question.
    a = discrimination  (1.0–2.5, how well question separates ability levels)
    b = difficulty      (-3 to +3, ability needed for 50% probability of correct)
    c = pseudo-guessing (0.0–0.35, probability of correct by guessing)
    """
    a: float = 1.0   # discrimination
    b: float = 0.0   # difficulty
    c: float = 0.25  # pseudo-guessing


def p_correct(theta: float, params: IRTParameters) -> float:
    """3PL IRT probability of correct response given ability θ."""
    return params.c + (1.0 - params.c) / (1.0 + np.exp(-params.a * (theta - params.b)))


def log_likelihood(theta: float, responses: list[tuple[bool, IRTParameters]]) -> float:
    """Log-likelihood of response pattern given θ."""
    ll = 0.0
    for correct, params in responses:
        p = p_correct(theta, params)
        p = np.clip(p, 1e-9, 1 - 1e-9)
        ll += np.log(p) if correct else np.log(1 - p)
    return ll


def estimate_theta(
    responses: list[tuple[bool, IRTParameters]],
    theta_min: float = -4.0,
    theta_max: float = 4.0,
) -> float:
    """
    Maximum Likelihood Estimation of ability θ using scipy minimize_scalar.
    Returns θ in range [theta_min, theta_max].
    """
    if not responses:
        return 0.0

    result = minimize_scalar(
        lambda theta: -log_likelihood(theta, responses),
        bounds=(theta_min, theta_max),
        method="bounded",
    )
    return float(np.clip(result.x, theta_min, theta_max))


def theta_to_mastery(theta: float, theta_min: float = -4.0, theta_max: float = 4.0) -> float:
    """Convert IRT θ score to 0–100 mastery percentage."""
    return round(((theta - theta_min) / (theta_max - theta_min)) * 100, 2)


# ─── Gap Severity Classification ─────────────────────────────────────────────
class GapSeverity:
    CRITICAL  = "CRITICAL"   # mastery < 40%
    HIGH      = "HIGH"       # mastery 40–60%
    MEDIUM    = "MEDIUM"     # mastery 60–75%
    LOW       = "LOW"        # mastery 75–88%
    NONE      = "NONE"       # mastery >= 88%

    @staticmethod
    def from_mastery(mastery: float) -> str:
        if mastery < 40:  return GapSeverity.CRITICAL
        if mastery < 60:  return GapSeverity.HIGH
        if mastery < 75:  return GapSeverity.MEDIUM
        if mastery < 88:  return GapSeverity.LOW
        return GapSeverity.NONE


# ─── Data Structures ─────────────────────────────────────────────────────────
@dataclass
class BloomLevelResult:
    """Result for a single Bloom level within a concept."""
    bloom_level:     BloomLevel
    bloom_label:     str
    theta:           float          # IRT ability score
    mastery:         float          # 0–100
    gap_severity:    str            # GapSeverity
    questions_seen:  int
    correct:         int
    recommended_verbs: list[str]    # action verbs for study plan


@dataclass
class ConceptGapProfile:
    """Complete gap profile for one concept across all 6 Bloom levels."""
    concept:          str
    learning_area:    str
    bloom_results:    dict[int, BloomLevelResult]   # level → result
    overall_mastery:  float                          # weighted across levels
    highest_gap_level: Optional[BloomLevel]          # worst Bloom level
    highest_gap_severity: str
    prerequisite_gap: bool                           # gap at Remember/Understand levels
    remediation_priority: int                        # 1 = highest


@dataclass
class KnowledgeProfile:
    """
    Complete student knowledge profile output by the Diagnostic Agent.
    This is the central data structure passed to the Planner and Remediation agents.
    """
    student_id:       str
    diagnostic_id:    str
    concepts:         list[ConceptGapProfile]
    overall_theta:    float          # global ability estimate
    overall_mastery:  float          # global mastery %
    critical_gaps:    list[str]      # concept names with CRITICAL gaps
    bloom_summary:    dict[int, float]  # level → average mastery across all concepts
    learning_area_summary: dict[str, float]  # area → mastery
    total_questions:  int
    correct_answers:  int
    diagnostic_time_sec: float
    feedback_cycle:   int = 0        # incremented on re-diagnosis


# ─── Question with Bloom Mapping ─────────────────────────────────────────────
@dataclass
class DiagnosticQuestion:
    id:            str
    concept:       str
    learning_area: str
    bloom_level:   BloomLevel
    irt_params:    IRTParameters
    selected_option: Optional[str] = None
    correct_option:  str = ""
    is_correct:      bool = False


# ─── Bloom's Knowledge Gap Engine ────────────────────────────────────────────
class BloomsKnowledgeGapEngine:
    """
    Core engine that:
    1. Groups questions by concept × Bloom level
    2. Runs 3PL IRT estimation per group
    3. Identifies gaps at the cognitive level
    4. Computes weighted overall mastery per concept
    5. Prioritises remediation order
    """

    def __init__(self, theta_min: float = -4.0, theta_max: float = 4.0):
        self.theta_min = theta_min
        self.theta_max = theta_max

    def analyse(
        self,
        student_id: str,
        diagnostic_id: str,
        questions: list[DiagnosticQuestion],
        time_sec: float = 0.0,
        feedback_cycle: int = 0,
    ) -> KnowledgeProfile:
        """
        Main analysis entry point.
        Returns a complete KnowledgeProfile with per-concept, per-Bloom-level gap data.
        """
        logger.info(f"[BloomsGapEngine] Analysing {len(questions)} questions "
                    f"for student {student_id} (cycle {feedback_cycle})")

        # ── Step 1: Group by concept × Bloom level ──
        groups: dict[tuple[str, str, BloomLevel], list[tuple[bool, IRTParameters]]] = {}
        for q in questions:
            key = (q.concept, q.learning_area, q.bloom_level)
            if key not in groups:
                groups[key] = []
            groups[key].append((q.is_correct, q.irt_params))

        # ── Step 2: Estimate θ per concept × Bloom level ──
        concept_data: dict[str, dict] = {}
        for (concept, area, bloom), responses in groups.items():
            if concept not in concept_data:
                concept_data[concept] = {"area": area, "blooms": {}}

            theta   = estimate_theta(responses, self.theta_min, self.theta_max)
            mastery = theta_to_mastery(theta, self.theta_min, self.theta_max)
            correct = sum(1 for r, _ in responses if r)

            concept_data[concept]["blooms"][bloom] = BloomLevelResult(
                bloom_level       = bloom,
                bloom_label       = BLOOM_LABELS[bloom],
                theta             = round(theta, 4),
                mastery           = mastery,
                gap_severity      = GapSeverity.from_mastery(mastery),
                questions_seen    = len(responses),
                correct           = correct,
                recommended_verbs = BLOOM_VERBS[bloom],
            )

        # ── Step 3: Build ConceptGapProfile per concept ──
        concept_profiles: list[ConceptGapProfile] = []
        for concept, data in concept_data.items():
            bloom_results = data["blooms"]
            area          = data["area"]

            # Weighted overall mastery across all Bloom levels seen
            total_weight  = 0.0
            weighted_sum  = 0.0
            for level, result in bloom_results.items():
                w             = BLOOM_WEIGHTS[level]
                weighted_sum += w * result.mastery
                total_weight += w
            overall = round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0

            # Find worst Bloom level
            worst_level    = min(bloom_results, key=lambda l: bloom_results[l].mastery, default=None)
            worst_severity = bloom_results[worst_level].gap_severity if worst_level else GapSeverity.NONE

            # Prerequisite gap: gap at Remember or Understand level
            prereq_gap = any(
                bloom_results.get(lvl, BloomLevelResult(lvl, "", 100, 100, GapSeverity.NONE, 0, 0, [])).gap_severity
                in [GapSeverity.CRITICAL, GapSeverity.HIGH]
                for lvl in [BloomLevel.REMEMBER, BloomLevel.UNDERSTAND]
                if lvl in bloom_results
            )

            concept_profiles.append(ConceptGapProfile(
                concept               = concept,
                learning_area         = area,
                bloom_results         = {int(k): v for k, v in bloom_results.items()},
                overall_mastery       = overall,
                highest_gap_level     = worst_level,
                highest_gap_severity  = worst_severity,
                prerequisite_gap      = prereq_gap,
                remediation_priority  = 0,  # set below
            ))

        # ── Step 4: Prioritise remediation ──
        # Priority: CRITICAL first, then prerequisite gaps, then by lowest mastery
        severity_order = {
            GapSeverity.CRITICAL: 0,
            GapSeverity.HIGH:     1,
            GapSeverity.MEDIUM:   2,
            GapSeverity.LOW:      3,
            GapSeverity.NONE:     4,
        }
        concept_profiles.sort(key=lambda c: (
            severity_order[c.highest_gap_severity],
            not c.prerequisite_gap,
            c.overall_mastery,
        ))
        for i, cp in enumerate(concept_profiles):
            cp.remediation_priority = i + 1

        # ── Step 5: Global summaries ──
        all_responses = [(q.is_correct, q.irt_params) for q in questions]
        global_theta  = estimate_theta(all_responses, self.theta_min, self.theta_max)
        global_mastery = theta_to_mastery(global_theta, self.theta_min, self.theta_max)

        critical_gaps = [
            cp.concept for cp in concept_profiles
            if cp.highest_gap_severity == GapSeverity.CRITICAL
        ]

        # Bloom summary — average mastery per Bloom level across all concepts
        bloom_summary: dict[int, list[float]] = {}
        for cp in concept_profiles:
            for level, result in cp.bloom_results.items():
                bloom_summary.setdefault(level, []).append(result.mastery)
        bloom_avg = {lvl: round(sum(vals) / len(vals), 2) for lvl, vals in bloom_summary.items()}

        # Learning area summary
        area_mastery: dict[str, list[float]] = {}
        for cp in concept_profiles:
            area_mastery.setdefault(cp.learning_area, []).append(cp.overall_mastery)
        area_avg = {area: round(sum(vals) / len(vals), 2) for area, vals in area_mastery.items()}

        total_correct = sum(1 for q in questions if q.is_correct)

        logger.success(f"[BloomsGapEngine] Analysis complete. "
                       f"θ={global_theta:.3f} mastery={global_mastery:.1f}% "
                       f"critical_gaps={len(critical_gaps)}")

        return KnowledgeProfile(
            student_id            = student_id,
            diagnostic_id         = diagnostic_id,
            concepts              = concept_profiles,
            overall_theta         = round(global_theta, 4),
            overall_mastery       = global_mastery,
            critical_gaps         = critical_gaps,
            bloom_summary         = bloom_avg,
            learning_area_summary = area_avg,
            total_questions       = len(questions),
            correct_answers       = total_correct,
            diagnostic_time_sec   = time_sec,
            feedback_cycle        = feedback_cycle,
        )
