"""
LangGraph Agent State
=====================
Shared state object passed between all 4 agents in the graph.
"""

from __future__ import annotations
from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from irt.blooms_gap_engine import KnowledgeProfile


@dataclass
class StudyWeek:
    week_number: int          # 1–16
    theme:       str          # e.g. "Strengthen Foundations"
    concepts:    list[str]    # concepts to cover this week
    bloom_focus: list[int]    # Bloom levels to target (e.g. [1,2] = Remember/Understand)
    hours:       float        # recommended study hours
    tasks:       list[dict]   # [{ concept, bloom_level, activity, resource_type, hours }]
    priority:    str          # "HIGH" | "MEDIUM" | "LOW"
    milestone:   Optional[str] = None


@dataclass
class StudyPlan:
    student_id:   str
    plan_id:      str
    created_at:   str
    weeks:        list[StudyWeek]       # 16 weeks
    total_hours:  float
    critique:     Optional[str] = None  # Reflexion self-critique
    version:      int = 1


@dataclass
class RemediationResource:
    id:              str
    title:           str
    type:            str          # "Video" | "Article" | "Book" | "Exercise"
    url:             str
    concept:         str
    learning_area:   str
    bloom_levels:    list[int]    # which Bloom levels this addresses
    similarity_score: float       # Pinecone cosine similarity
    rerank_score:    float        # Cohere rerank score
    rag_confidence:  float        # 0–100 combined score
    difficulty:      str          # "Easy" | "Medium" | "Hard"
    estimated_minutes: int


@dataclass
class AgentState:
    """
    Central shared state for the LangGraph workflow.
    Each agent reads from and writes to this state.
    """

    # ── Input ──────────────────────────────────────────────────────────
    student_id:       str = ""
    session_id:       str = ""
    raw_responses:    list[dict] = field(default_factory=list)
    # [{ question_id, concept, learning_area, bloom_level,
    #    irt_a, irt_b, irt_c, selected_option, correct_option, time_sec }]

    # ── After Diagnostic Agent ──────────────────────────────────────────
    knowledge_profile: Optional[KnowledgeProfile] = None
    diagnostic_complete: bool = False

    # ── After Planner Agent ─────────────────────────────────────────────
    study_plan:          Optional[StudyPlan] = None
    plan_critique:       Optional[str] = None   # Reflexion critique
    plan_complete:       bool = False

    # ── After Remediation Agent ─────────────────────────────────────────
    resources:           list[RemediationResource] = field(default_factory=list)
    remediation_complete: bool = False

    # ── After Evaluator Agent ───────────────────────────────────────────
    mastery_delta:       float = 0.0      # progress since last cycle
    plateau_detected:    bool = False
    feedback_cycle:      int = 0          # 0,1,2,3 (max 3)
    max_cycles_reached:  bool = False
    evaluation_notes:    str = ""

    # ── Metadata ────────────────────────────────────────────────────────
    errors:    list[str] = field(default_factory=list)
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
