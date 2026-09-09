"""
Evaluator Agent (FIXED)
=======================

Agent 4 of 4 in the LangGraph pipeline.

"""

from __future__ import annotations

from typing import Any
from datetime import datetime

from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import AgentState
from irt.blooms_gap_engine import (
    KnowledgeProfile,
    BLOOM_LABELS,
)
from core.config import settings


class EvaluatorAgent:
    
    def __init__(self):
        self.llm = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model_name=settings.GROQ_MODEL,
            temperature=0.1,
            max_tokens=1024,
        )

        logger.info(
            f"[EvaluatorAgent] Initialized with model: "
            f"{settings.GROQ_MODEL}"
        )

    # ============================================================
    # MAIN RUN
    # ============================================================

    async def run(
        self,
        state: AgentState,
        previous_profile: Any = None,
    ) -> AgentState:
        """
        Evaluate the current knowledge profile against the previous one.

        Args:
            state: AgentState with knowledge_profile set
            previous_profile: Optional previous profile for comparison.
                Accepts both KnowledgeProfile (in-memory) and 
                KnowledgeProfileModel (database). Uses defensive attribute
                access to handle both types.

        Returns:
            Updated AgentState with evaluation metrics and notes.

        NOTE:
        Week progression is intentionally NOT handled here.
        The study-plan route controls current_week and generates
        the next week.
        """

        if not state.knowledge_profile:
            state.errors.append(
                "EvaluatorAgent: No knowledge profile to evaluate."
            )
            return state

        current = state.knowledge_profile

        # --------------------------------------------------------
        # Get student ID safely.
        #
        # In-memory KnowledgeProfile may use student_id.
        # Database KnowledgeProfileModel uses user_id.
        # --------------------------------------------------------

        student_id = getattr(
            current,
            "student_id",
            getattr(
                current,
                "user_id",
                state.student_id,
            ),
        )

        logger.info(
            f"[EvaluatorAgent] Evaluating student {student_id} "
            f"| cycle {state.feedback_cycle}"
        )

        try:
            # ====================================================
            # CURRENT MASTERY
            # ====================================================

            current_mastery = float(
                getattr(
                    current,
                    "overall_mastery",
                    0.0,
                )
                or 0.0
            )

            logger.info(
                f"[EvaluatorAgent] Current mastery: "
                f"{current_mastery:.1f}%"
            )

            # ====================================================
            # PREVIOUS PROFILE COMPARISON
            # ====================================================

            if previous_profile:
                previous_mastery = float(
                    getattr(
                        previous_profile,
                        "overall_mastery",
                        0.0,
                    )
                    or 0.0
                )

                delta = current_mastery - previous_mastery

                state.mastery_delta = round(
                    delta,
                    2,
                )

                bloom_deltas = self._compute_bloom_deltas(
                    current,
                    previous_profile,
                )

                concept_deltas = self._compute_concept_deltas(
                    current,
                    previous_profile,
                )

                logger.info(
                    f"[EvaluatorAgent] Mastery delta: "
                    f"{delta:+.2f}%"
                )

                logger.info(
                    f"[EvaluatorAgent] Bloom deltas: "
                    f"{bloom_deltas}"
                )

                logger.info(
                    f"[EvaluatorAgent] Concept deltas: "
                    f"{concept_deltas}"
                )

            else:
                previous_mastery = 0.0
                state.mastery_delta = 0.0
                bloom_deltas = {}
                concept_deltas = {}

                logger.info(
                    "[EvaluatorAgent] First diagnostic cycle "
                    "— no previous profile available."
                )

            # ====================================================
            # PLATEAU DETECTION
            # ====================================================

            plateau = self._detect_plateau(
                state,
                previous_profile,
            )

            state.plateau_detected = plateau

            # ====================================================
            # MAX FEEDBACK CYCLES
            # ====================================================

            if (
                state.feedback_cycle
                >= settings.MAX_FEEDBACK_CYCLES
            ):
                state.max_cycles_reached = True

                state.evaluation_notes = (
                    f"Maximum feedback cycles "
                    f"({settings.MAX_FEEDBACK_CYCLES}) reached. "
                    f"Final mastery: "
                    f"{current_mastery:.1f}%. "
                    f"Recommend manual instructor intervention."
                )

                logger.warning(
                    f"[EvaluatorAgent] Maximum cycles reached "
                    f"for student {student_id}"
                )

            # ====================================================
            # PLATEAU DETECTED
            # ====================================================

            elif plateau:
                state.feedback_cycle += 1

                state.evaluation_notes = (
                    f"Plateau detected "
                    f"(mastery gain < "
                    f"{settings.PLATEAU_THRESHOLD * 100:.0f}%). "
                    f"Triggering re-diagnosis cycle "
                    f"{state.feedback_cycle}."
                )

                logger.info(
                    f"[EvaluatorAgent] Plateau detected "
                    f"→ triggering cycle "
                    f"{state.feedback_cycle}"
                )

            # ====================================================
            # NORMAL PROGRESS
            # ====================================================

            else:
                state.evaluation_notes = (
                    await self._generate_evaluation_notes(
                        current=current,
                        previous=previous_profile,
                        bloom_deltas=bloom_deltas,
                        concept_deltas=concept_deltas,
                    )
                )

                state.plateau_detected = False

            # ====================================================
            # ADD PROGRESS REPORT
            # ====================================================

            progress_report = self._build_progress_report(
                current=current,
                previous=previous_profile,
                state=state,
            )

            if state.evaluation_notes:
                state.evaluation_notes += (
                    "\n\n" + progress_report
                )
            else:
                state.evaluation_notes = progress_report

            logger.success(
                f"[EvaluatorAgent] Complete | "
                f"plateau={state.plateau_detected} | "
                f"cycle={state.feedback_cycle} | "
                f"max_reached={state.max_cycles_reached}"
            )

        except Exception as e:
            logger.exception(
                f"[EvaluatorAgent] Error: {e}"
            )

            state.errors.append(
                f"EvaluatorAgent: {str(e)}"
            )

        return state

    # ============================================================
    # PLATEAU DETECTION
    # ============================================================

    def _detect_plateau(
        self,
        state: AgentState,
        previous_profile: Any,
    ) -> bool:
        """
        Detect whether student progress has plateaued.

        A plateau occurs when:
        - mastery decreases, OR
        - mastery improvement is below the configured threshold.
        """

        if not previous_profile:
            return False

        mastery_delta = float(
            getattr(
                state,
                "mastery_delta",
                0.0,
            )
            or 0.0
        )

        threshold = (
            settings.PLATEAU_THRESHOLD * 100
        )

        # Mastery decreased
        if mastery_delta < 0:
            logger.debug(
                f"[EvaluatorAgent] Mastery decreased by "
                f"{mastery_delta:.2f}%"
            )

            return True

        # Improvement is too small
        if mastery_delta < threshold:
            logger.debug(
                f"[EvaluatorAgent] Mastery gain "
                f"{mastery_delta:.2f}% "
                f"< threshold {threshold:.1f}%"
            )

            return True

        return False

    # ============================================================
    # BLOOM DELTAS
    # ============================================================

    def _compute_bloom_deltas(
        self,
        current: Any,
        previous: Any,
    ) -> dict[int, float]:
        """
        Calculate mastery changes for each Bloom level.

        Handles JSON keys that may be strings:
            {"1": 45.0, "2": 52.0}

        and Python dictionaries with integer keys:
            {1: 45.0, 2: 52.0}
        """

        current_summary = getattr(
            current,
            "bloom_summary",
            {},
        ) or {}

        previous_summary = getattr(
            previous,
            "bloom_summary",
            {},
        ) or {}

        deltas = {}

        # --------------------------------------------------------
        # Normalize previous keys
        # --------------------------------------------------------

        normalized_previous = {}

        for key, value in previous_summary.items():
            try:
                normalized_key = int(key)
            except (TypeError, ValueError):
                normalized_key = key

            try:
                normalized_previous[normalized_key] = float(
                    value or 0.0
                )
            except (TypeError, ValueError):
                normalized_previous[normalized_key] = 0.0

        # --------------------------------------------------------
        # Calculate current deltas
        # --------------------------------------------------------

        for key, value in current_summary.items():
            try:
                normalized_key = int(key)
            except (TypeError, ValueError):
                normalized_key = key

            try:
                current_mastery = float(
                    value or 0.0
                )
            except (TypeError, ValueError):
                current_mastery = 0.0

            previous_mastery = normalized_previous.get(
                normalized_key,
                0.0,
            )

            deltas[normalized_key] = round(
                current_mastery - previous_mastery,
                2,
            )

        return deltas

    # ============================================================
    # CONCEPT DELTAS
    # ============================================================

    def _compute_concept_deltas(
        self,
        current: Any,
        previous: Any,
    ) -> dict[str, float]:
        """
        Calculate mastery changes for concepts.

        Supports:

        In-memory profile:
            current.concepts

        Database profile:
            current.concept_profiles
        """

        current_concepts = getattr(
            current,
            "concepts",
            None,
        )

        previous_concepts = (
            getattr(
                previous,
                "concepts",
                None,
            )
            if previous
            else None
        )

        # --------------------------------------------------------
        # In-memory KnowledgeProfile
        # --------------------------------------------------------

        if current_concepts is not None:
            current_concepts = (
                current_concepts or []
            )

            previous_concepts = (
                previous_concepts or []
            )

            previous_map = {}

            for cp in previous_concepts:
                concept = getattr(
                    cp,
                    "concept",
                    None,
                )

                mastery = getattr(
                    cp,
                    "overall_mastery",
                    0.0,
                )

                if concept:
                    try:
                        previous_map[concept] = float(
                            mastery or 0.0
                        )
                    except (TypeError, ValueError):
                        previous_map[concept] = 0.0

            deltas = {}

            for cp in current_concepts:
                concept = getattr(
                    cp,
                    "concept",
                    None,
                )

                if not concept:
                    continue

                try:
                    mastery = float(
                        getattr(
                            cp,
                            "overall_mastery",
                            0.0,
                        )
                        or 0.0
                    )
                except (TypeError, ValueError):
                    mastery = 0.0

                previous_mastery = previous_map.get(
                    concept,
                    0.0,
                )

                deltas[concept] = round(
                    mastery - previous_mastery,
                    2,
                )

            return deltas

        # --------------------------------------------------------
        # Database KnowledgeProfileModel
        # --------------------------------------------------------

        current_profiles = getattr(
            current,
            "concept_profiles",
            [],
        ) or []

        previous_profiles = (
            getattr(
                previous,
                "concept_profiles",
                [],
            )
            if previous
            else []
        ) or []

        # ========================================================
        # Previous concept map
        # ========================================================

        previous_map = {}

        if isinstance(previous_profiles, list):

            for cp in previous_profiles:

                if not isinstance(cp, dict):
                    continue

                concept = cp.get("concept")

                if not concept:
                    continue

                try:
                    mastery = float(
                        cp.get(
                            "overall_mastery",
                            0.0,
                        )
                        or 0.0
                    )
                except (TypeError, ValueError):
                    mastery = 0.0

                previous_map[concept] = mastery

        elif isinstance(previous_profiles, dict):

            for concept, cp in previous_profiles.items():

                if not isinstance(cp, dict):
                    continue

                try:
                    mastery = float(
                        cp.get(
                            "overall_mastery",
                            0.0,
                        )
                        or 0.0
                    )
                except (TypeError, ValueError):
                    mastery = 0.0

                previous_map[concept] = mastery

        # ========================================================
        # Current concepts
        # ========================================================

        deltas = {}

        if isinstance(current_profiles, list):

            for cp in current_profiles:

                if not isinstance(cp, dict):
                    continue

                concept = cp.get("concept")

                if not concept:
                    continue

                try:
                    mastery = float(
                        cp.get(
                            "overall_mastery",
                            0.0,
                        )
                        or 0.0
                    )
                except (TypeError, ValueError):
                    mastery = 0.0

                previous_mastery = previous_map.get(
                    concept,
                    0.0,
                )

                deltas[concept] = round(
                    mastery - previous_mastery,
                    2,
                )

        elif isinstance(current_profiles, dict):

            for concept, cp in current_profiles.items():

                if not isinstance(cp, dict):
                    continue

                try:
                    mastery = float(
                        cp.get(
                            "overall_mastery",
                            0.0,
                        )
                        or 0.0
                    )
                except (TypeError, ValueError):
                    mastery = 0.0

                previous_mastery = previous_map.get(
                    concept,
                    0.0,
                )

                deltas[concept] = round(
                    mastery - previous_mastery,
                    2,
                )

        return deltas

    # ============================================================
    # LLM EVALUATION NOTES
    # ============================================================

    async def _generate_evaluation_notes(
        self,
        current: Any,
        previous: Any,
        bloom_deltas: dict,
        concept_deltas: dict,
    ) -> str:
        """
        Generate a short academic progress assessment using Groq.
        """

        current_mastery = float(
            getattr(
                current,
                "overall_mastery",
                0.0,
            )
            or 0.0
        )

        previous_mastery = (
            float(
                getattr(
                    previous,
                    "overall_mastery",
                    0.0,
                )
                or 0.0
            )
            if previous
            else 0.0
        )

        delta = (
            current_mastery
            - previous_mastery
        )

        critical_gaps = getattr(
            current,
            "critical_gaps",
            [],
        ) or []

        # --------------------------------------------------------
        # Best / worst concepts
        # --------------------------------------------------------

        improving = sorted(
            concept_deltas.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:3]

        declining = sorted(
            [
                (concept, change)
                for concept, change
                in concept_deltas.items()
                if change < 0
            ],
            key=lambda x: x[1],
        )[:5]

        bloom_summary = getattr(
            current,
            "bloom_summary",
            {},
        ) or {}

        prompt = f"""
You are an academic progress coach for an undergraduate
Software Engineering student.

Current Status:

Overall mastery:
{current_mastery:.1f}%

Previous mastery:
{previous_mastery:.1f}%

Mastery change:
{delta:+.1f}%

Critical knowledge gaps:
{critical_gaps}

Bloom's Taxonomy mastery:
{bloom_summary}

Bloom-level changes:
{bloom_deltas}

Most improved concepts:
{improving}

Declining concepts:
{declining}

Write a brief 3-4 sentence progress assessment.

Requirements:

- Be encouraging but honest.
- Identify what is improving.
- Mention what still needs attention.
- Give one specific next action.
- Use Bloom's Taxonomy cognitive-level progress.
- Do not invent information.
- Do not mention that you are an AI.
"""

        try:
            logger.info(
                "[EvaluatorAgent] Generating LLM "
                "progress feedback..."
            )

            response = await self.llm.ainvoke(
                [
                    SystemMessage(
                        content=(
                            "You are a supportive academic "
                            "coach. Be specific, concise, "
                            "and actionable."
                        )
                    ),
                    HumanMessage(
                        content=prompt
                    ),
                ]
            )

            content = getattr(
                response,
                "content",
                "",
            )

            if isinstance(content, list):
                content = "".join(
                    str(item)
                    for item in content
                )

            content = str(
                content or ""
            ).strip()

            if content:
                logger.info(
                    "[EvaluatorAgent] LLM feedback "
                    "generated successfully."
                )

                return content

            logger.warning(
                "[EvaluatorAgent] LLM returned empty "
                "content. Using fallback."
            )

        except Exception as e:
            logger.warning(
                f"[EvaluatorAgent] LLM feedback "
                f"generation failed: {e}"
            )

        # --------------------------------------------------------
        # Fallback
        # --------------------------------------------------------

        if delta > 5:
            return (
                f"Mastery has improved by "
                f"{delta:.1f}% since the previous assessment. "
                f"Continue building on this progress while "
                f"strengthening remaining critical gaps."
            )

        if delta > 0:
            return (
                f"Mastery has improved by "
                f"{delta:.1f}% since the previous assessment. "
                f"Progress is positive, but additional practice "
                f"is needed in the remaining knowledge gaps."
            )

        if delta < 0:
            return (
                f"Mastery has decreased by "
                f"{abs(delta):.1f}% since the previous assessment. "
                f"Focus on the identified critical gaps and "
                f"review foundational concepts before advancing."
            )

        return (
            "Mastery has remained approximately unchanged "
            "since the previous assessment. Focus on the "
            "critical knowledge gaps and complete the "
            "recommended remediation activities."
        )

    # ============================================================
    # PROGRESS REPORT
    # ============================================================

    def _build_progress_report(
        self,
        current: Any,
        previous: Any,
        state: AgentState,
    ) -> str:
        """
        Build a human-readable progress report.

        Supports both:
        - in-memory KnowledgeProfile
        - database KnowledgeProfileModel
        """

        student_id = getattr(
            current,
            "student_id",
            getattr(
                current,
                "user_id",
                state.student_id,
            ),
        )

        current_mastery = float(
            getattr(
                current,
                "overall_mastery",
                0.0,
            )
            or 0.0
        )

        mastery_delta = float(
            getattr(
                state,
                "mastery_delta",
                0.0,
            )
            or 0.0
        )

        lines = [
            "=== PROGRESS REPORT ===",
            f"Student ID: {student_id}",
            f"Diagnostic Cycle: {state.feedback_cycle}",
            f"Overall Mastery: {current_mastery:.1f}%",
            f"Mastery Delta: {mastery_delta:+.2f}%",
            "",
            "Bloom's Taxonomy Progress:",
        ]

        # ========================================================
        # Bloom summary
        # ========================================================

        current_bloom_summary = getattr(
            current,
            "bloom_summary",
            {},
        ) or {}

        previous_bloom_summary = (
            getattr(
                previous,
                "bloom_summary",
                {},
            ) or {}
            if previous
            else {}
        )

        # --------------------------------------------------------
        # Normalize previous keys
        # --------------------------------------------------------

        normalized_previous = {}

        for key, value in previous_bloom_summary.items():

            try:
                normalized_key = int(key)
            except (TypeError, ValueError):
                normalized_key = key

            try:
                normalized_previous[normalized_key] = float(
                    value or 0.0
                )
            except (TypeError, ValueError):
                normalized_previous[normalized_key] = 0.0

        # --------------------------------------------------------
        # Sort Bloom levels safely
        # --------------------------------------------------------

        bloom_items = []

        for key, value in current_bloom_summary.items():

            try:
                level_int = int(key)
            except (TypeError, ValueError):
                level_int = key

            try:
                mastery = float(
                    value or 0.0
                )
            except (TypeError, ValueError):
                mastery = 0.0

            bloom_items.append(
                (
                    level_int,
                    mastery,
                )
            )

        try:
            bloom_items.sort(
                key=lambda x: int(x[0])
            )
        except (TypeError, ValueError):
            pass

        # --------------------------------------------------------
        # Add Bloom information
        # --------------------------------------------------------

        for level, mastery in bloom_items:

            label = BLOOM_LABELS.get(
                level,
                f"Level {level}",
            )

            previous_mastery = normalized_previous.get(
                level,
                0.0,
            )

            delta = mastery - previous_mastery

            lines.append(
                f" L{level} {label}: "
                f"{mastery:.1f}% "
                f"({delta:+.1f}%)"
            )

        # ========================================================
        # Critical gaps
        # ========================================================

        critical_gaps = getattr(
            current,
            "critical_gaps",
            [],
        ) or []

        lines += [
            "",
            (
                "Critical Gaps Remaining: "
                f"{len(critical_gaps)}"
            ),
            (
                "  "
                + (
                    ", ".join(
                        str(gap)
                        for gap in critical_gaps
                    )
                    if critical_gaps
                    else "None — great progress!"
                )
            ),
            "",
            (
                "Plateau Detected: "
                + (
                    "Yes → Re-diagnosis triggered"
                    if state.plateau_detected
                    else "No"
                )
            ),
            (
                "Max Cycles Reached: "
                + (
                    "Yes"
                    if state.max_cycles_reached
                    else "No"
                )
            ),
            (
                "Timestamp: "
                f"{datetime.utcnow().isoformat()}Z"
            ),
        ]

        return "\n".join(lines)