"""
LangGraph Agent State
=====================

Shared state object passed between all 4 agents in the graph.

The state is intentionally kept as a dataclass so every LangGraph
node works with the same typed structure.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any

from irt.blooms_gap_engine import KnowledgeProfile


# ══════════════════════════════════════════════════════════════════════════════
# STUDY WEEK
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class StudyWeek:
    week_number: int
    theme: str
    concepts: list[str]
    bloom_focus: list[int]
    hours: float
    tasks: list[dict[str, Any]]
    priority: str
    milestone: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
# STUDY PLAN
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class StudyPlan:
    student_id: str
    plan_id: str
    created_at: str
    weeks: list[StudyWeek]
    total_hours: float
    critique: Optional[str] = None
    version: int = 1


# ══════════════════════════════════════════════════════════════════════════════
# REMEDIATION RESOURCE
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class RemediationResource:
    id: str
    title: str
    type: str
    url: str
    concept: str
    learning_area: str
    bloom_levels: list[int]
    similarity_score: float
    rerank_score: float
    rag_confidence: float
    difficulty: str
    estimated_minutes: int


# ══════════════════════════════════════════════════════════════════════════════
# AGENT STATE
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentState:
    """
    Central shared state for the LangGraph workflow.

    Flow:

        raw_responses
             ↓
        DiagnosticAgent
             ↓
        knowledge_profile
             ↓
        PlannerAgent
             ↓
        study_plan
             ↓
        RemediationAgent
             ↓
        resources
             ↓
        EvaluatorAgent
             ↓
        mastery_delta / plateau
             ↓
        re-diagnose OR END
    """

    # ═══════════════════════════════════════════════════════════════════════
    # INPUT
    # ═══════════════════════════════════════════════════════════════════════

    student_id: str = ""

    session_id: str = ""

    raw_responses: list[dict[str, Any]] = field(
        default_factory=list
    )

    # Example:
    #
    # {
    #     "question_id": 1,
    #     "concept": "Arrays",
    #     "learning_area": "Data Structures",
    #     "bloom_level": 2,
    #     "irt_a": 1.2,
    #     "irt_b": 0.5,
    #     "irt_c": 0.2,
    #     "selected_option": "b",
    #     "correct_option": "b",
    #     "time_sec": 12.5
    # }


    # ═══════════════════════════════════════════════════════════════════════
    # DIAGNOSTIC AGENT
    # ═══════════════════════════════════════════════════════════════════════

    knowledge_profile: Optional[KnowledgeProfile] = None

    diagnostic_complete: bool = False


    # ═══════════════════════════════════════════════════════════════════════
    # PLANNER AGENT
    # ═══════════════════════════════════════════════════════════════════════

    study_plan: Optional[StudyPlan] = None

    plan_critique: Optional[str] = None

    plan_complete: bool = False


    # ═══════════════════════════════════════════════════════════════════════
    # REMEDIATION AGENT
    # ═══════════════════════════════════════════════════════════════════════

    resources: list[RemediationResource] = field(
        default_factory=list
    )

    remediation_complete: bool = False


    # ═══════════════════════════════════════════════════════════════════════
    # EVALUATOR AGENT
    # ═══════════════════════════════════════════════════════════════════════

    mastery_delta: float = 0.0

    plateau_detected: bool = False

    feedback_cycle: int = 0

    max_cycles_reached: bool = False

    evaluation_notes: str = ""


    # ═══════════════════════════════════════════════════════════════════════
    # METADATA
    # ═══════════════════════════════════════════════════════════════════════

    errors: list[str] = field(
        default_factory=list
    )

    started_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )

    completed_at: Optional[str] = None


    # ═══════════════════════════════════════════════════════════════════════
    # SAFETY HELPERS
    # ═══════════════════════════════════════════════════════════════════════

    def add_error(self, message: str) -> None:
        """
        Safely add an error to the shared state.
        """
        if message:
            self.errors.append(str(message))


    def mark_completed(self) -> None:
        """
        Mark the pipeline as completed.
        """
        self.completed_at = datetime.utcnow().isoformat()


    def has_errors(self) -> bool:
        """
        Check whether any agent reported an error.
        """
        return bool(self.errors)