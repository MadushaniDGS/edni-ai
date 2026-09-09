"""
LangGraph Agent State
=====================

Shared state object passed between all 4 agents in the graph.

Updated for EDNI Adaptive Week-by-Week Study Planner.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any, List

from irt.blooms_gap_engine import KnowledgeProfile


# ══════════════════════════════════════════════════════════════════════════════
# STUDY WEEK
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class StudyWeek:
    week_number: int
    theme: str
    concepts: list[str]

    # Bloom labels instead of integers
    bloom_focus: list[str]

    hours: float

    tasks: list[dict[str, Any]]

    priority: str

    milestone: Optional[str] = None

    critique: Optional[dict[str, Any]] = None


# ══════════════════════════════════════════════════════════════════════════════
# STUDY PLAN
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class StudyPlan:
    student_id: str
    plan_id: str
    created_at: str

    # Only ONE week is stored/generated at a time
    weeks: list[StudyWeek]

    total_hours: float

    critique: Optional[str] = None

    version: int = 1

    # NEW — adaptive planner progress
    current_week: int = 1

    previous_weeks: List[Dict[str, Any]] = field(default_factory=list)
    


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
    Shared state across Diagnostic → Planner → Remediation → Evaluator.

    Updated flow:

        DiagnosticAgent
              ↓
        Knowledge Profile
              ↓
        PlannerAgent (Current Week Only)
              ↓
        Study Week
              ↓
        RemediationAgent
              ↓
        Resources
              ↓
        EvaluatorAgent
              ↓
        Mastery Update
              ↓
        Generate Next Week
    """

    # ═══════════════════════════════════════════════════════════════════════
    # INPUT
    # ═══════════════════════════════════════════════════════════════════════

    student_id: str = ""
    session_id: str = ""

    raw_responses: list[dict[str, Any]] = field(default_factory=list)

    # ═══════════════════════════════════════════════════════════════════════
    # DIAGNOSTIC AGENT
    # ═══════════════════════════════════════════════════════════════════════

    knowledge_profile: Optional[KnowledgeProfile] = None
    diagnostic_complete: bool = False

    # ═══════════════════════════════════════════════════════════════════════
    # PLANNER AGENT (NEW)
    # ═══════════════════════════════════════════════════════════════════════

    study_plan: Optional[StudyPlan] = None

    plan_complete: bool = False
    plan_critique: Optional[str] = None

    # NEW — Current adaptive planning state
    current_week: int = 1

    completed_weeks: list[int] = field(default_factory=list)

    # Previous generated weeks (used as LLM context)
    previous_weeks: list[dict[str, Any]] = field(default_factory=list)

    # Flag to trigger automatic next-week generation
    generate_next_week: bool = False

    # ═══════════════════════════════════════════════════════════════════════
    # REMEDIATION AGENT
    # ═══════════════════════════════════════════════════════════════════════

    resources: list[RemediationResource] = field(default_factory=list)

    remediation_complete: bool = False

    # ═══════════════════════════════════════════════════════════════════════
    # EVALUATOR AGENT
    # ═══════════════════════════════════════════════════════════════════════

    mastery_delta: float = 0.0

    plateau_detected: bool = False

    feedback_cycle: int = 0

    max_cycles_reached: bool = False

    evaluation_notes: str = ""

    # NEW — Signals PlannerAgent after evaluation
    week_completed: bool = False

    next_week_ready: bool = False

    # ═══════════════════════════════════════════════════════════════════════
    # METADATA
    # ═══════════════════════════════════════════════════════════════════════

    errors: list[str] = field(default_factory=list)

    started_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )

    completed_at: Optional[str] = None

    # ═══════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════

    def add_error(self, message: str) -> None:
        """Safely append an error."""
        if message:
            self.errors.append(str(message))

    def mark_completed(self) -> None:
        """Mark pipeline completion timestamp."""
        self.completed_at = datetime.utcnow().isoformat()

    def has_errors(self) -> bool:
        """Return True if any agent produced an error."""
        return len(self.errors) > 0

    # NEW — Called after a week is successfully finished.
    def complete_current_week(self) -> None:
        """
        Mark the current week as completed and prepare the next week.
        """

        if self.current_week not in self.completed_weeks:
            self.completed_weeks.append(self.current_week)

        self.week_completed = True
        self.next_week_ready = True
        self.generate_next_week = True

        self.current_week += 1