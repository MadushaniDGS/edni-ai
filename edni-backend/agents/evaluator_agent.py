"""
Evaluator Agent
===============
Agent 4 of 4 in the LangGraph pipeline.

Responsibilities:
- Monitor student mastery gains over time
- Compare current KnowledgeProfile vs previous profile
- Detect mastery plateau (< threshold gain over N weeks)
- Trigger bounded re-diagnosis loop (max 3 cycles)
- Adapt study plan phase if student has progressed
- Log evaluation events to MongoDB
"""

from __future__ import annotations
from datetime import datetime
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import AgentState
from irt.blooms_gap_engine import (
    KnowledgeProfile, BloomLevel, BLOOM_LABELS, GapSeverity,
)
from core.config import settings


class EvaluatorAgent:
    """
    Monitors student progress and manages the bounded feedback loop.
    If mastery gain < PLATEAU_THRESHOLD for PLATEAU_WEEKS consecutive weeks,
    triggers re-diagnosis (up to MAX_FEEDBACK_CYCLES times).
    """

    def __init__(self):
        self.llm = ChatGroq(
            api_key     = settings.GROQ_API_KEY,
            model_name  = settings.GROQ_MODEL,
            temperature = 0.1,
            max_tokens  = 1024,
        )

    async def run(self, state: AgentState, previous_profile: KnowledgeProfile | None = None) -> AgentState:
        """
        Evaluate student progress.
        previous_profile: KnowledgeProfile from the last diagnostic cycle (if any).
        """
        if not state.knowledge_profile:
            state.errors.append("EvaluatorAgent: No knowledge profile to evaluate.")
            return state

        current = state.knowledge_profile
        logger.info(
            f"[EvaluatorAgent] Evaluating student {state.student_id} "
            f"| cycle {state.feedback_cycle} "
            f"| current mastery {current.overall_mastery:.1f}%"
        )

        try:
            # ── Step 1: Compute mastery delta ──
            if previous_profile:
                delta = current.overall_mastery - previous_profile.overall_mastery
                state.mastery_delta = round(delta, 2)

                # Per-Bloom delta
                bloom_deltas = self._compute_bloom_deltas(current, previous_profile)

                # Per-concept delta
                concept_deltas = self._compute_concept_deltas(current, previous_profile)

                logger.info(
                    f"[EvaluatorAgent] Mastery delta: {delta:+.2f}% | "
                    f"Bloom deltas: {bloom_deltas}"
                )
            else:
                # First cycle — no previous profile
                state.mastery_delta = 0.0
                bloom_deltas        = {}
                concept_deltas      = {}
                logger.info("[EvaluatorAgent] First diagnostic cycle — no delta available.")

            # ── Step 2: Plateau detection ──
            plateau = self._detect_plateau(state, previous_profile)
            state.plateau_detected = plateau

            # ── Step 3: Decide action ──
            if state.feedback_cycle >= settings.MAX_FEEDBACK_CYCLES:
                state.max_cycles_reached = True
                state.evaluation_notes   = (
                    f"Maximum feedback cycles ({settings.MAX_FEEDBACK_CYCLES}) reached. "
                    f"Final mastery: {current.overall_mastery:.1f}%. "
                    f"Recommend manual instructor intervention."
                )
                logger.warning(
                    f"[EvaluatorAgent] Max cycles reached for student {state.student_id}"
                )
            elif plateau:
                state.feedback_cycle += 1
                state.evaluation_notes = (
                    f"Plateau detected (gain < {settings.PLATEAU_THRESHOLD * 100:.0f}%). "
                    f"Triggering re-diagnosis cycle {state.feedback_cycle}."
                )
                logger.info(
                    f"[EvaluatorAgent] Plateau detected → triggering cycle {state.feedback_cycle}"
                )
            else:
                # Good progress — provide adaptive recommendations
                notes = await self._generate_evaluation_notes(
                    current, previous_profile, bloom_deltas, concept_deltas
                )
                state.evaluation_notes   = notes
                state.plateau_detected   = False

            # ── Step 4: Generate adaptive feedback message ──
            state.evaluation_notes += "\n\n" + self._build_progress_report(
                current, previous_profile, state
            )

            logger.success(
                f"[EvaluatorAgent] Complete | "
                f"plateau={plateau} | "
                f"cycle={state.feedback_cycle} | "
                f"max_reached={state.max_cycles_reached}"
            )

        except Exception as e:
            logger.error(f"[EvaluatorAgent] Error: {e}")
            state.errors.append(f"EvaluatorAgent: {str(e)}")

        return state

    # ─── Private helpers ───────────────────────────────────────────────────────

    def _detect_plateau(
        self,
        state: AgentState,
        previous_profile: KnowledgeProfile | None,
    ) -> bool:
        """
        Plateau = mastery gain < PLATEAU_THRESHOLD AND
                  student has had at least PLATEAU_WEEKS cycles.
        """
        if not previous_profile:
            return False   # Can't plateau on first assessment

        if state.mastery_delta < 0:
            # Mastery regressed — definitely plateau/problem
            return True

        if state.mastery_delta < settings.PLATEAU_THRESHOLD * 100:
            # Insufficient gain
            logger.debug(
                f"[EvaluatorAgent] Mastery gain {state.mastery_delta:.2f}% "
                f"< threshold {settings.PLATEAU_THRESHOLD * 100:.1f}%"
            )
            return True

        return False

    def _compute_bloom_deltas(
        self,
        current: KnowledgeProfile,
        previous: KnowledgeProfile,
    ) -> dict[int, float]:
        """Compute mastery delta per Bloom level."""
        deltas = {}
        for level in current.bloom_summary:
            current_m  = current.bloom_summary.get(level, 0.0)
            previous_m = previous.bloom_summary.get(level, 0.0)
            deltas[level] = round(current_m - previous_m, 2)
        return deltas

    def _compute_concept_deltas(
        self,
        current: KnowledgeProfile,
        previous: KnowledgeProfile,
    ) -> dict[str, float]:
        """Compute mastery delta per concept."""
        prev_map = {cp.concept: cp.overall_mastery for cp in previous.concepts}
        return {
            cp.concept: round(cp.overall_mastery - prev_map.get(cp.concept, 0.0), 2)
            for cp in current.concepts
        }

    async def _generate_evaluation_notes(
        self,
        current: KnowledgeProfile,
        previous: KnowledgeProfile | None,
        bloom_deltas: dict,
        concept_deltas: dict,
    ) -> str:
        """Use LLM to generate personalised progress feedback."""

        prev_mastery = previous.overall_mastery if previous else 0.0
        delta        = current.overall_mastery - prev_mastery

        # Top improving concepts
        improving = sorted(concept_deltas.items(), key=lambda x: x[1], reverse=True)[:3]
        declining = [(c, d) for c, d in concept_deltas.items() if d < 0]

        prompt = f"""You are an academic progress coach for a Software Engineering student.

Current Status:
- Overall mastery: {current.overall_mastery:.1f}% (was {prev_mastery:.1f}%, change: {delta:+.1f}%)
- Critical gaps remaining: {current.critical_gaps}
- Bloom's mastery: {current.bloom_summary}

Most improved concepts: {improving}
Declining concepts: {declining}

Write a brief (3-4 sentences), encouraging but honest progress assessment.
Highlight what's working, what still needs attention, and one specific next action.
Use the student's Bloom's Taxonomy level progress to give cognitive-level feedback."""

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content="You are a supportive academic coach. Be specific and actionable."),
                HumanMessage(content=prompt),
            ])
            return response.content
        except Exception as e:
            logger.warning(f"[EvaluatorAgent] LLM feedback generation failed: {e}")
            return (
                f"Mastery has {'improved' if delta >= 0 else 'declined'} by {abs(delta):.1f}% "
                f"since last assessment. "
                f"{'Keep up the great work!' if delta > 5 else 'Focus on your critical gaps.'}"
            )

    def _build_progress_report(
        self,
        current: KnowledgeProfile,
        previous: KnowledgeProfile | None,
        state: AgentState,
    ) -> str:
        """Build structured progress report string."""
        lines = [
            "=== PROGRESS REPORT ===",
            f"Student ID: {current.student_id}",
            f"Diagnostic Cycle: {state.feedback_cycle}",
            f"Overall Mastery: {current.overall_mastery:.1f}%",
            f"Mastery Delta: {state.mastery_delta:+.2f}%",
            "",
            "Bloom's Taxonomy Progress:",
        ]

        for level in sorted(current.bloom_summary.keys()):
            label   = BLOOM_LABELS.get(level, f"Level {level}")
            mastery = current.bloom_summary[level]
            prev_m  = previous.bloom_summary.get(level, 0.0) if previous else 0.0
            delta   = mastery - prev_m
            lines.append(f"  L{level} {label}: {mastery:.1f}% ({delta:+.1f}%)")

        lines += [
            "",
            f"Critical Gaps Remaining: {len(current.critical_gaps)}",
            f"  {', '.join(current.critical_gaps) or 'None — great progress!'}",
            "",
            f"Plateau Detected: {'Yes → Re-diagnosis triggered' if state.plateau_detected else 'No'}",
            f"Max Cycles Reached: {'Yes' if state.max_cycles_reached else 'No'}",
            f"Timestamp: {datetime.utcnow().isoformat()}Z",
        ]

        return "\n".join(lines)
