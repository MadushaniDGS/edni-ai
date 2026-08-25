"""
Diagnostic Agent
================
Agent 1 of 4 in the LangGraph pipeline.

Responsibilities:
- Parse raw student responses
- Map each response to concept × Bloom level
- Run 3PL IRT estimation per group
- Identify knowledge gaps at the COGNITIVE LEVEL (Bloom's redesign)
- Build and persist KnowledgeProfile
- Log to MongoDB
"""

from __future__ import annotations
import uuid
import time
from datetime import datetime
from loguru import logger

from agents.state import AgentState
from irt.blooms_gap_engine import (
    BloomsKnowledgeGapEngine,
    BloomLevel,
    DiagnosticQuestion,
    IRTParameters,
)
from core.config import settings


class DiagnosticAgent:
    """
    Bloom's Taxonomy-aware Diagnostic Agent.
    Replaces raw percentage scoring with per-concept, per-level IRT analysis.
    """

    def __init__(self):
        self.engine = BloomsKnowledgeGapEngine(
            theta_min=settings.THETA_MIN,
            theta_max=settings.THETA_MAX,
        )

    async def run(self, state: AgentState) -> AgentState:
        logger.info(f"[DiagnosticAgent] Starting for student {state.student_id} "
                    f"(cycle {state.feedback_cycle})")

        start = time.time()

        try:
            # ── Step 1: Parse raw responses into DiagnosticQuestion objects ──
            questions = self._parse_responses(state.raw_responses)

            if not questions:
                state.errors.append("DiagnosticAgent: No valid responses to process.")
                return state

            logger.info(f"[DiagnosticAgent] Parsed {len(questions)} questions "
                        f"across {len(set(q.concept for q in questions))} concepts")

            # ── Step 2: Run Bloom's Gap Engine ──
            diagnostic_id = str(uuid.uuid4())
            elapsed       = time.time() - start

            knowledge_profile = self.engine.analyse(
                student_id     = state.student_id,
                diagnostic_id  = diagnostic_id,
                questions      = questions,
                time_sec       = elapsed,
                feedback_cycle = state.feedback_cycle,
            )

            state.knowledge_profile    = knowledge_profile
            state.diagnostic_complete  = True

            # ── Step 3: Log summary ──
            self._log_summary(knowledge_profile)

        except Exception as e:
            logger.error(f"[DiagnosticAgent] Error: {e}")
            state.errors.append(f"DiagnosticAgent: {str(e)}")

        return state

    def _parse_responses(self, raw: list[dict]) -> list[DiagnosticQuestion]:
        """Convert raw API response dicts to typed DiagnosticQuestion objects."""
        questions = []
        for r in raw:
            try:
                bloom = BloomLevel(int(r.get("bloom_level", 1)))
                params = IRTParameters(
                    a=float(r.get("irt_a", 1.0)),
                    b=float(r.get("irt_b", 0.0)),
                    c=float(r.get("irt_c", 0.25)),
                )
                selected = r.get("selected_option", "")
                correct  = r.get("correct_option",  "")

                questions.append(DiagnosticQuestion(
                    id             = str(r.get("question_id", uuid.uuid4())),
                    concept        = r.get("concept",        "Unknown"),
                    learning_area  = r.get("learning_area",  "General"),
                    bloom_level    = bloom,
                    irt_params     = params,
                    selected_option = selected,
                    correct_option  = correct,
                    is_correct      = (selected == correct and selected != ""),
                ))
            except Exception as e:
                logger.warning(f"[DiagnosticAgent] Skipping malformed response: {e}")
                continue

        return questions

    def _log_summary(self, profile) -> None:
        logger.success(
            f"[DiagnosticAgent] Complete | "
            f"θ={profile.overall_theta:.3f} | "
            f"Mastery={profile.overall_mastery:.1f}% | "
            f"Critical gaps: {profile.critical_gaps} | "
            f"Bloom summary: {profile.bloom_summary}"
        )
