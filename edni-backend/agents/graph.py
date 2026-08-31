"""
LangGraph Orchestrator
======================

Pipeline:

    START
      |
      v
 DiagnosticAgent
      |
      v
 PlannerAgent
      |
      v
 RemediationAgent
      |
      v
 EvaluatorAgent
      |
      +----------------------+
      |                      |
      | plateau              | no plateau
      |                      |
      v                      v
 DiagnosticAgent           END
      |
      +-- feedback cycle
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Literal, Union

from loguru import logger

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agents.state import AgentState
from agents.diagnostic_agent import DiagnosticAgent
from agents.planner_agent import PlannerAgent
from agents.remediation_agent import RemediationAgent
from agents.evaluator_agent import EvaluatorAgent

from irt.blooms_gap_engine import KnowledgeProfile
from core.config import settings


# ==============================================================
# AGENT SINGLETONS
# ==============================================================

_diagnostic = DiagnosticAgent()
_planner = PlannerAgent()
_remediation = RemediationAgent()
_evaluator = EvaluatorAgent()


# ==============================================================
# GRAPH NODES
# ==============================================================

async def run_diagnostic(
    state: AgentState,
) -> AgentState:

    logger.info(
        f"[Graph] → DiagnosticAgent "
        f"(cycle {state.feedback_cycle})"
    )

    return await _diagnostic.run(state)


async def run_planner(
    state: AgentState,
) -> AgentState:

    logger.info("[Graph] → PlannerAgent")

    return await _planner.run(state)


async def run_remediation(
    state: AgentState,
) -> AgentState:

    logger.info("[Graph] → RemediationAgent")

    return await _remediation.run(state)


# ==============================================================
# PREVIOUS PROFILE STORAGE
# ==============================================================

_previous_profiles: dict[str, KnowledgeProfile] = {}


async def run_evaluator(
    state: AgentState,
) -> AgentState:

    logger.info("[Graph] → EvaluatorAgent")

    previous_profile = _previous_profiles.get(
        state.student_id
    )

    state = await _evaluator.run(
        state,
        previous_profile=previous_profile,
    )

    if state.knowledge_profile:
        _previous_profiles[
            state.student_id
        ] = state.knowledge_profile

    return state


# ==============================================================
# CONDITIONAL ROUTING
# ==============================================================

def should_rediagnose(
    state: Union[AgentState, dict],
) -> Literal["rediagnose", "end"]:

    if isinstance(state, dict):

        plateau_detected = state.get(
            "plateau_detected",
            False,
        )

        max_cycles_reached = state.get(
            "max_cycles_reached",
            False,
        )

        feedback_cycle = state.get(
            "feedback_cycle",
            0,
        )

    else:

        plateau_detected = getattr(
            state,
            "plateau_detected",
            False,
        )

        max_cycles_reached = getattr(
            state,
            "max_cycles_reached",
            False,
        )

        feedback_cycle = getattr(
            state,
            "feedback_cycle",
            0,
        )

    # ----------------------------------------------------------
    # Feedback loop
    # ----------------------------------------------------------

    if (
        plateau_detected
        and not max_cycles_reached
        and feedback_cycle
        < settings.MAX_FEEDBACK_CYCLES
    ):

        logger.info(
            f"[Graph] Plateau detected → "
            f"re-diagnosing "
            f"(cycle {feedback_cycle}/"
            f"{settings.MAX_FEEDBACK_CYCLES})"
        )

        return "rediagnose"

    # ----------------------------------------------------------
    # End
    # ----------------------------------------------------------

    logger.info("[Graph] → END")

    current_time = datetime.now(
        timezone.utc
    ).isoformat()

    if isinstance(state, dict):
        state["completed_at"] = current_time
    else:
        state.completed_at = current_time

    return "end"


# ==============================================================
# BUILD GRAPH
# ==============================================================

def build_graph():

    builder = StateGraph(AgentState)

    # Nodes
    builder.add_node(
        "diagnose",
        run_diagnostic,
    )

    builder.add_node(
        "plan",
        run_planner,
    )

    builder.add_node(
        "remediate",
        run_remediation,
    )

    builder.add_node(
        "evaluate",
        run_evaluator,
    )

    # Entry point
    builder.set_entry_point("diagnose")

    # Linear pipeline
    builder.add_edge(
        "diagnose",
        "plan",
    )

    builder.add_edge(
        "plan",
        "remediate",
    )

    builder.add_edge(
        "remediate",
        "evaluate",
    )

    # Feedback routing
    builder.add_conditional_edges(
        "evaluate",
        should_rediagnose,
        {
            "rediagnose": "diagnose",
            "end": END,
        },
    )

    # Checkpoint memory
    memory = MemorySaver()

    graph = builder.compile(
        checkpointer=memory,
    )

    logger.success(
        "[Graph] LangGraph compiled successfully"
    )

    return graph


# ==============================================================
# SINGLETON GRAPH
# ==============================================================

_graph = build_graph()


# ==============================================================
# SAFE STATE VALUE HELPER
# ==============================================================

def _get_state_value(
    state: Any,
    key: str,
    default: Any = None,
) -> Any:

    if isinstance(state, dict):
        return state.get(key, default)

    return getattr(
        state,
        key,
        default,
    )


# ==============================================================
# RUN PIPELINE
# ==============================================================

async def run_pipeline(
    student_id: str,
    session_id: str,
    raw_responses: list[dict],
    feedback_cycle: int = 0,
) -> Union[AgentState, Dict[str, Any]]:

    initial_state = AgentState(
        student_id=student_id,
        session_id=session_id,
        raw_responses=raw_responses,
        feedback_cycle=feedback_cycle,
    )

    config = {
        "configurable": {
            "thread_id": (
                f"{student_id}_{session_id}"
            )
        }
    }

    logger.info(
        f"[Pipeline] Starting | "
        f"student={student_id} | "
        f"session={session_id} | "
        f"cycle={feedback_cycle}"
    )

    try:

        raw_final = await _graph.ainvoke(
            initial_state,
            config=config,
        )

    except Exception as exc:

        logger.exception(
            f"[Pipeline] Graph invocation failed: {exc}"
        )

        # Return initial state so caller can inspect errors
        raw_final = initial_state

    # ----------------------------------------------------------
    # Convert dict → AgentState when possible
    # ----------------------------------------------------------

    if isinstance(raw_final, dict):

        try:

            final_state = AgentState(
                **raw_final
            )

        except Exception as exc:

            logger.warning(
                f"[Pipeline] Could not reconstruct "
                f"AgentState from dict: {exc}"
            )

            final_state = raw_final

    else:

        final_state = raw_final

    # ----------------------------------------------------------
    # Safe extraction
    # ----------------------------------------------------------

    knowledge_profile = _get_state_value(
        final_state,
        "knowledge_profile",
    )

    study_plan = _get_state_value(
        final_state,
        "study_plan",
    )

    resources = _get_state_value(
        final_state,
        "resources",
        [],
    )

    feedback_cycle_value = _get_state_value(
        final_state,
        "feedback_cycle",
        feedback_cycle,
    )

    # ----------------------------------------------------------
    # Logging
    # ----------------------------------------------------------

    overall_mastery = 0.0

    if knowledge_profile:

        overall_mastery = _get_state_value(
            knowledge_profile,
            "overall_mastery",
            0.0,
        )

    weeks = []

    if study_plan:

        weeks = _get_state_value(
            study_plan,
            "weeks",
            [],
        )

    plan_weeks_count = (
        len(weeks)
        if isinstance(weeks, list)
        else 0
    )

    resources_count = (
        len(resources)
        if isinstance(resources, list)
        else 0
    )

    logger.success(
        f"[Pipeline] Complete | "
        f"student={student_id} | "
        f"mastery={float(overall_mastery):.1f}% | "
        f"plan_weeks={plan_weeks_count} | "
        f"resources={resources_count} | "
        f"cycles={feedback_cycle_value}"
    )

    return final_state