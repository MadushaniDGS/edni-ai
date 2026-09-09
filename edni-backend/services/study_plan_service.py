from __future__ import annotations

from typing import Any

BLOOM_LABELS = {
    1: "Remember", 2: "Understand", 3: "Apply",
    4: "Analyze", 5: "Evaluate", 6: "Create",
}


def safe_bloom(value: Any) -> int:
    labels = {v.lower(): k for k, v in BLOOM_LABELS.items()}
    try:
        if isinstance(value, str) and not value.strip().isdigit():
            return labels.get(value.strip().lower(), 3)
        return max(1, min(6, int(value)))
    except (TypeError, ValueError):
        return 3


def resource_dict(resource: Any) -> dict[str, Any]:
    return {
        "id": str(resource.id),
        "title": resource.title,
        "type": resource.type,
        "url": resource.url,
        "concept": resource.concept,
        "learning_area": resource.learning_area,
        "bloom_levels": [int(x) for x in (resource.bloom_levels or []) if str(x).isdigit()],
        "similarity_score": float(resource.similarity_score or 0),
        "rerank_score": float(resource.rerank_score or 0),
        "rag_confidence": float(resource.rag_confidence or 0),
        "difficulty": resource.difficulty,
        "estimated_minutes": int(resource.estimated_minutes or 0),
    }


def normalize_week(week: dict[str, Any], profile: Any) -> dict[str, Any]:
    week = dict(week or {})
    raw = week.get("tasks") if isinstance(week.get("tasks"), list) else []
    tasks = []
    concepts = [str(x) for x in (week.get("concepts") or []) if x]
    gaps = profile.concept_profiles or []
    gap_by_concept = {}
    if isinstance(gaps, list):
        for g in gaps:
            if isinstance(g, dict) and g.get("concept"):
                gap_by_concept[str(g["concept"])] = g

    for i, item in enumerate(raw[:7]):
        if not isinstance(item, dict):
            continue
        concept = str(item.get("concept") or (concepts[i % len(concepts)] if concepts else "Core concept"))
        area = str(item.get("learning_area") or "General")
        bloom = safe_bloom(item.get("bloom_level", 3))
        try:
            hours = max(0.25, min(3.0, float(item.get("hours", 1) or 1)))
        except (TypeError, ValueError):
            hours = 1.0
        gap = gap_by_concept.get(concept, {})
        tasks.append({
            "id": item.get("id"),
            "day": i + 1,
            "day_label": f"Day {i + 1}",
            "activity": str(item.get("activity") or f"Study {concept}"),
            "concept": concept,
            "learning_area": area,
            "bloom_level": bloom,
            "bloom_label": BLOOM_LABELS[bloom],
            "hours": hours,
            "estimated_minutes": int(hours * 60),
            "learning_objective": str(item.get("learning_objective") or f"Build practical understanding of {concept}."),
            "description": str(item.get("description") or f"Complete the Day {i + 1} activity and apply it to {concept}."),
            "gap_severity": str(item.get("gap_severity") or gap.get("highest_gap_severity") or "MEDIUM").upper(),
            "status": str(item.get("status") or "PENDING").upper(),
            "resources": list(item.get("resources") or []),
        })

    # Guarantee seven daily slots even when an LLM response is short.
    seeds = tasks[:] or [{"concept": concepts[0] if concepts else "Core concept", "learning_area": "General", "bloom_level": 2, "hours": 1}]
    while len(tasks) < 7:
        i = len(tasks)
        base = seeds[i % len(seeds)]
        concept = base.get("concept") or "Core concept"
        tasks.append({
            "id": None, "day": i + 1, "day_label": f"Day {i + 1}",
            "activity": f"Related practice: {concept}",
            "concept": concept, "learning_area": base.get("learning_area") or "General",
            "bloom_level": safe_bloom(base.get("bloom_level", 3)),
            "bloom_label": BLOOM_LABELS[safe_bloom(base.get("bloom_level", 3))],
            "hours": 1.0, "estimated_minutes": 60,
            "learning_objective": f"Reinforce {concept} through related practice.",
            "description": f"Practice a related activity to strengthen the identified gap in {concept}.",
            "gap_severity": str(gap_by_concept.get(concept, {}).get("highest_gap_severity") or "MEDIUM").upper(),
            "status": "PENDING", "resources": [],
        })

    tasks = tasks[:7]
    for i, task in enumerate(tasks, start=1):
        task["day"] = i
        task["day_label"] = f"Day {i}"

    week["tasks"] = tasks
    week["hours"] = round(sum(float(t["hours"]) for t in tasks), 2)
    week["concepts"] = concepts or list(dict.fromkeys(str(t["concept"]) for t in tasks))
    week["bloom_focus"] = list(dict.fromkeys(str(t["bloom_label"]) for t in tasks))
    return week


def attach_rag_resources(week: dict[str, Any], resources: list[Any]) -> dict[str, Any]:
    pool = [resource_dict(r) for r in resources]
    for task in week["tasks"]:
        concept = str(task.get("concept") or "").strip().lower()
        area = str(task.get("learning_area") or "").strip().lower()
        bloom = safe_bloom(task.get("bloom_level", 3))

        def score(r: dict[str, Any]) -> tuple[int, int, float]:
            rc = str(r.get("concept") or "").strip().lower()
            ra = str(r.get("learning_area") or "").strip().lower()
            rb = set(int(x) for x in (r.get("bloom_levels") or []) if str(x).isdigit())
            return (2 if concept and rc == concept else 0, 1 if area and ra == area else 0, (0.5 if bloom in rb else 0) + float(r.get("rag_confidence") or 0))

        ranked = sorted(pool, key=score, reverse=True)
        chosen = [r for r in ranked if (str(r.get("concept") or "").lower() == concept and (not area or str(r.get("learning_area") or "").lower() == area))][:3]
        if len(chosen) < 2:
            for r in ranked:
                if r in chosen:
                    continue
                if area and str(r.get("learning_area") or "").lower() == area:
                    chosen.append(r)
                if len(chosen) >= 3:
                    break
        if not chosen:
            chosen = ranked[:3]
        task["resources"] = chosen
        task["resource_count"] = len(chosen)
    return week


async def generate_week(user_id: str, profile: Any, week_number: int, previous_weeks: list[dict[str, Any]] | None = None):
    # Heavy AI/vector dependencies are imported only when a week actually needs generation.
    from agents.planner_agent import PlannerAgent
    from agents.remediation_agent import RemediationAgent
    from agents.state import AgentState

    state = AgentState(
        student_id=user_id, session_id="study-plan", knowledge_profile=profile,
        diagnostic_complete=True, current_week=week_number,
        previous_weeks=previous_weeks or [],
    )
    planner = PlannerAgent()
    state = await planner.run(state)
    remediation = RemediationAgent()
    state = await remediation.run(state)
    if not state.study_plan or not state.study_plan.weeks:
        raise RuntimeError("Planner did not produce a study week.")
    week_obj = state.study_plan.weeks[0]
    week = {
        "week_number": week_obj.week_number, "theme": week_obj.theme,
        "concepts": week_obj.concepts, "bloom_focus": week_obj.bloom_focus,
        "hours": week_obj.hours, "tasks": week_obj.tasks,
        "priority": week_obj.priority, "milestone": week_obj.milestone,
    }
    week = normalize_week(week, profile)
    week = attach_rag_resources(week, state.resources)
    return week, state
