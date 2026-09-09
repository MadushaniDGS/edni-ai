"""
Diagnostic Agent
================

Agent 1 of 4 in the LangGraph pipeline.

"""

from __future__ import annotations

import time
import uuid
from typing import Any

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

    Converts raw student answers into DiagnosticQuestion objects
    and sends them to the Bloom's + 3PL IRT engine.
    """

    def __init__(self) -> None:
        self.engine = BloomsKnowledgeGapEngine(
            theta_min=settings.THETA_MIN,
            theta_max=settings.THETA_MAX,
        )

    async def run(self, state: AgentState) -> AgentState:
        logger.info(
            f"[DiagnosticAgent] Starting for student={state.student_id} "
            f"(cycle={state.feedback_cycle})"
        )

        start_time = time.time()

        try:
            raw_responses = state.raw_responses or []

            if not isinstance(raw_responses, list):
                state.errors.append(
                    "DiagnosticAgent: raw_responses must be a list."
                )
                return state

            if not raw_responses:
                state.errors.append(
                    "DiagnosticAgent: No responses were submitted."
                )
                return state

            logger.info(
                f"[DiagnosticAgent] Received "
                f"{len(raw_responses)} raw responses"
            )

            # ----------------------------------------------------------
            # Parse responses
            # ----------------------------------------------------------

            questions = self._parse_responses(raw_responses)

            if not questions:
                state.errors.append(
                    "DiagnosticAgent: No valid responses could be parsed."
                )
                return state

            concepts = {q.concept for q in questions}
            learning_areas = {
                q.learning_area for q in questions
            }

            logger.info(
                f"[DiagnosticAgent] Parsed {len(questions)} questions | "
                f"concepts={len(concepts)} | "
                f"learning_areas={len(learning_areas)}"
            )

            # ----------------------------------------------------------
            # Run Bloom + IRT engine
            # ----------------------------------------------------------

            diagnostic_id = str(uuid.uuid4())

            elapsed = time.time() - start_time

            knowledge_profile = self.engine.analyse(
                student_id=state.student_id,
                diagnostic_id=diagnostic_id,
                questions=questions,
                time_sec=elapsed,
                feedback_cycle=state.feedback_cycle,
            )

            # ----------------------------------------------------------
            # Attach result to LangGraph state
            # ----------------------------------------------------------

            state.knowledge_profile = knowledge_profile
            state.diagnostic_complete = True

            # ----------------------------------------------------------
            # Logging
            # ----------------------------------------------------------

            self._log_summary(knowledge_profile)

            logger.success(
                f"[DiagnosticAgent] Completed | "
                f"student={state.student_id} | "
                f"questions={len(questions)} | "
                f"time={time.time() - start_time:.2f}s"
            )

        except Exception as exc:
            logger.exception(
                f"[DiagnosticAgent] Error for "
                f"student={state.student_id}: {exc}"
            )

            state.errors.append(
                f"DiagnosticAgent: {str(exc)}"
            )

            state.diagnostic_complete = False

        return state

    # ==============================================================
    # RESPONSE PARSER
    # ==============================================================

    def _parse_responses(
        self,
        raw: list[dict[str, Any]],
    ) -> list[DiagnosticQuestion]:
        """
        Convert raw API responses into DiagnosticQuestion objects.
        """

        questions: list[DiagnosticQuestion] = []

        for index, response in enumerate(raw, start=1):

            if not isinstance(response, dict):
                logger.warning(
                    f"[DiagnosticAgent] Skipping response #{index}: "
                    f"expected dict, got "
                    f"{type(response).__name__}"
                )
                continue

            try:
                # ------------------------------------------------------
                # Question ID
                # ------------------------------------------------------

                question_id = str(
                    response.get("question_id")
                    or response.get("id")
                    or uuid.uuid4()
                )

                # ------------------------------------------------------
                # Concept
                # ------------------------------------------------------

                concept = str(
                    response.get("concept")
                    or response.get("topic")
                    or "Unknown"
                ).strip()

                if not concept:
                    concept = "Unknown"

                # ------------------------------------------------------
                # Learning area
                # ------------------------------------------------------

                learning_area = str(
                    response.get("learning_area")
                    or response.get("learningArea")
                    or "General"
                ).strip()

                if not learning_area:
                    learning_area = "General"

                # ------------------------------------------------------
                # Bloom level
                # ------------------------------------------------------

                bloom_value = response.get(
                    "bloom_level",
                    response.get("bloomLevel", 1),
                )

                bloom_level = self._parse_bloom_level(
                    bloom_value
                )

                # ------------------------------------------------------
                # IRT parameters
                # ------------------------------------------------------

                irt_params = IRTParameters(
                    a=self._safe_float(
                        response.get("irt_a"),
                        1.0,
                    ),
                    b=self._safe_float(
                        response.get("irt_b"),
                        0.0,
                    ),
                    c=self._safe_float(
                        response.get("irt_c"),
                        0.20,
                    ),
                )

                # ------------------------------------------------------
                # Selected answer
                # ------------------------------------------------------

                selected_option = self._normalize_answer(
                    response.get("selected_option")
                )

                # ------------------------------------------------------
                # Correct answer
                # ------------------------------------------------------

                correct_option = self._normalize_answer(
                    response.get("correct_option")
                )

                # ------------------------------------------------------
                # Correctness
                # ------------------------------------------------------

                is_correct = (
                    bool(selected_option)
                    and bool(correct_option)
                    and selected_option == correct_option
                )

                # ------------------------------------------------------
                # Build DiagnosticQuestion
                # ------------------------------------------------------

                question = DiagnosticQuestion(
                    id=question_id,
                    concept=concept,
                    learning_area=learning_area,
                    bloom_level=bloom_level,
                    irt_params=irt_params,
                    selected_option=selected_option,
                    correct_option=correct_option,
                    is_correct=is_correct,
                )

                questions.append(question)

            except Exception as exc:
                logger.warning(
                    f"[DiagnosticAgent] Skipping malformed "
                    f"response #{index}: {exc}"
                )
                continue

        return questions

    # ==============================================================
    # BLOOM LEVEL
    # ==============================================================

    @staticmethod
    def _parse_bloom_level(value: Any) -> BloomLevel:
        """
        Supports:

        1-6
        "1"-"6"
        Remember
        Understand
        Apply
        Analyze
        Evaluate
        Create
        """

        if isinstance(value, BloomLevel):
            return value

        # Numeric value
        try:
            numeric_value = int(value)

            if 1 <= numeric_value <= 6:
                return BloomLevel(numeric_value)

        except (TypeError, ValueError):
            pass

        # Text value
        if isinstance(value, str):

            normalized = value.strip().lower()

            bloom_map = {
                "remember": 1,
                "understand": 2,
                "apply": 3,
                "analyze": 4,
                "analyse": 4,
                "evaluate": 5,
                "create": 6,
            }

            if normalized in bloom_map:
                return BloomLevel(
                    bloom_map[normalized]
                )

        logger.warning(
            f"[DiagnosticAgent] Invalid Bloom level "
            f"'{value}'. Defaulting to Remember."
        )

        return BloomLevel(1)

    # ==============================================================
    # ANSWER NORMALIZATION
    # ==============================================================

    @staticmethod
    def _normalize_answer(value: Any) -> str:
        """
        Examples:

        A   -> a
        " B " -> b
        None -> ""
        """

        if value is None:
            return ""

        return str(value).strip().lower()

    # ==============================================================
    # FLOAT CONVERSION
    # ==============================================================

    @staticmethod
    def _safe_float(
        value: Any,
        default: float,
    ) -> float:

        try:
            if value is None:
                return default

            return float(value)

        except (TypeError, ValueError):
            return default

    # ==============================================================
    # SUMMARY LOG
    # ==============================================================

    @staticmethod
    def _log_summary(profile: Any) -> None:

        try:
            overall_theta = float(
                getattr(profile, "overall_theta", 0.0)
            )

            overall_mastery = float(
                getattr(profile, "overall_mastery", 0.0)
            )

            critical_gaps = getattr(
                profile,
                "critical_gaps",
                [],
            )

            bloom_summary = getattr(
                profile,
                "bloom_summary",
                {},
            )

            logger.success(
                f"[DiagnosticAgent] Complete | "
                f"theta={overall_theta:.3f} | "
                f"Mastery={overall_mastery:.1f}% | "
                f"Critical gaps={critical_gaps} | "
                f"Bloom summary={bloom_summary}"
            )

        except Exception as exc:
            logger.warning(
                f"[DiagnosticAgent] Could not log summary: {exc}"
            )