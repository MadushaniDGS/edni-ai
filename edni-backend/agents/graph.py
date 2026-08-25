"""
LangGraph Orchestrator
======================
Wires the 4 agents into a stateful directed graph:

  [START]
     │
     ▼
 DiagnosticAgent  ──→  PlannerAgent  ──→  RemediationAgent
                                                 │
                                                 ▼
                                          EvaluatorAgent
                                                 │
                              ┌───────────────────┤
                              │ plateau + cycles < MAX        │ no plateau / max reached
                              ▼                               ▼
                        DiagnosticAgent (re-run)           [END]
"""

from __future__ import annotations
from typing import Literal, Union, Dict, Any
from datetime import datetime, timezone
from loguru import logger

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from agents.state import AgentState
from agents.diagnostic_agent   import DiagnosticAgent
from agents.planner_agent      import PlannerAgent
from agents.remediation_agent  import RemediationAgent
from agents.evaluator_agent    import EvaluatorAgent
from irt.blooms_gap_engine     import KnowledgeProfile
from core.config               import settings


# ─── Agent singletons ─────────────────────────────────────────────────────────
_diagnostic  = DiagnosticAgent()
_planner     = PlannerAgent()
_remediation = RemediationAgent()
_evaluator   = EvaluatorAgent()


# ─── Node functions (async wrappers for LangGraph) ────────────────────────────

async def run_diagnostic(state: AgentState) -> AgentState:
    logger.info(f"[Graph] → DiagnosticAgent (cycle {state.feedback_cycle})")
    return await _diagnostic.run(state)


async def run_planner(state: AgentState) -> AgentState:
    logger.info("[Graph] → PlannerAgent")
    return await _planner.run(state)


async def run_remediation(state: AgentState) -> AgentState:
    logger.info("[Graph] → RemediationAgent")
    return await _remediation.run(state)


# Store previous profiles across feedback cycles (keyed by student_id)
_previous_profiles: dict[str, KnowledgeProfile] = {}

async def run_evaluator(state: AgentState) -> AgentState:
    logger.info("[Graph] → EvaluatorAgent")
    prev = _previous_profiles.get(state.student_id)
    state = await _evaluator.run(state, previous_profile=prev)
    # Store current as previous for next cycle
    if state.knowledge_profile:
        _previous_profiles[state.student_id] = state.knowledge_profile
    return state


# ─── Conditional edge: should we re-diagnose? ────────────────────────────────

def should_rediagnose(state: Union[AgentState, dict]) -> Literal["rediagnose", "end"]:
    """
    Route to re-diagnosis if:
    - Plateau detected AND
    - feedback_cycle < MAX_FEEDBACK_CYCLES AND
    - Not max cycles reached
    """
    # Safe attribute/dict access
    if isinstance(state, dict):
        plateau_detected = state.get("plateau_detected", False)
        max_cycles_reached = state.get("max_cycles_reached", False)
        feedback_cycle = state.get("feedback_cycle", 0)
    else:
        plateau_detected = getattr(state, "plateau_detected", False)
        max_cycles_reached = getattr(state, "max_cycles_reached", False)
        feedback_cycle = getattr(state, "feedback_cycle", 0)

    if (
        plateau_detected
        and not max_cycles_reached
        and feedback_cycle < settings.MAX_FEEDBACK_CYCLES
    ):
        logger.info(
            f"[Graph] Plateau detected → Re-diagnosing "
            f"(cycle {feedback_cycle}/{settings.MAX_FEEDBACK_CYCLES})"
        )
        return "rediagnose"

    logger.info("[Graph] → END")
    current_time = datetime.now(timezone.utc).isoformat()
    if isinstance(state, dict):
        state["completed_at"] = current_time
    else:
        state.completed_at = current_time
    return "end"


# ─── Graph builder ────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Build and compile the LangGraph StateGraph.
    Returns a compiled graph ready to invoke.
    """
    builder = StateGraph(AgentState)

    # Add nodes
    builder.add_node("diagnose",   run_diagnostic)
    builder.add_node("plan",       run_planner)
    builder.add_node("remediate",  run_remediation)
    builder.add_node("evaluate",   run_evaluator)

    # Linear edges
    builder.set_entry_point("diagnose")
    builder.add_edge("diagnose",  "plan")
    builder.add_edge("plan",       "remediate")
    builder.add_edge("remediate", "evaluate")

    # Conditional edge from evaluator
    builder.add_conditional_edges(
        "evaluate",
        should_rediagnose,
        {
            "rediagnose": "diagnose",   # feedback loop — re-run from diagnosis
            "end":        END,
        },
    )

    # Compile with in-memory checkpointing
    memory = MemorySaver()
    graph  = builder.compile(checkpointer=memory)

    logger.success("[Graph] LangGraph compiled successfully")
    return graph


# ─── Singleton graph instance ─────────────────────────────────────────────────
_graph = build_graph()


async def run_pipeline(
    student_id:   str,
    session_id:   str,
    raw_responses: list[dict],
    feedback_cycle: int = 0,
) -> Union[AgentState, Dict[str, Any]]:
    """
    Entry point: run the full 4-agent pipeline for a student.

    Args:
        student_id:     Student UUID
        session_id:     Unique session/diagnostic ID
        raw_responses:  List of question response dicts
        feedback_cycle: Current cycle number (0 = first run)

    Returns:
        Final state dictionary or AgentState instance
    """
    initial_state = AgentState(
        student_id     = student_id,
        session_id     = session_id,
        raw_responses  = raw_responses,
        feedback_cycle = feedback_cycle,
    )

    config = {"configurable": {"thread_id": f"{student_id}_{session_id}"}}

    logger.info(
        f"[Pipeline] Starting for student={student_id} "
        f"session={session_id} cycle={feedback_cycle}"
    )

    raw_final = await _graph.ainvoke(initial_state, config=config)

    # Reconstruct AgentState or safely parse fields if raw_final is a dict
    if isinstance(raw_final, dict):
        try:
            final_state = AgentState(**raw_final)
        except Exception:
            final_state = raw_final
    else:
        final_state = raw_final

    # Safe extraction helper
    def get_attr(obj: Any, key: str, default: Any = None) -> Any:
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    kp = get_attr(final_state, "knowledge_profile")
    overall_mastery = get_attr(kp, "overall_mastery", 0.0) if kp else 0.0

    study_plan = get_attr(final_state, "study_plan")
    weeks = get_attr(study_plan, "weeks", []) if study_plan else []
    plan_weeks_count = len(weeks) if isinstance(weeks, list) else 0

    resources = get_attr(final_state, "resources", [])
    resources_count = len(resources) if isinstance(resources, list) else 0

    cycles = get_attr(final_state, "feedback_cycle", feedback_cycle)

    logger.success(
        f"[Pipeline] Complete for student={student_id} | "
        f"mastery={overall_mastery:.1f}% | "
        f"plan_weeks={plan_weeks_count} | "
        f"resources={resources_count} | "
        f"cycles={cycles}"
    )

    return final_state