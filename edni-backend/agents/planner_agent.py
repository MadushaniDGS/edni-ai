"""
Planner Agent
=============
Agent 2 of 4 in the LangGraph pipeline.

Responsibilities:
- Read KnowledgeProfile from DiagnosticAgent
- Generate a 16-week Bloom's Taxonomy-aware study plan
- Apply Reflexion pattern (self-critique + revision)
- Prioritise by gap severity AND cognitive level
- Output structured StudyPlan
"""


from __future__ import annotations
import uuid
import json
from datetime import datetime
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import AgentState, StudyPlan, StudyWeek
from irt.blooms_gap_engine import (
    KnowledgeProfile, ConceptGapProfile,
    BloomLevel, BLOOM_LABELS, GapSeverity,
)
from core.config import settings


# ─── Bloom Progression Strategy ───────────────────────────────────────────────
# For each Bloom gap level, define which weeks to allocate remediation
BLOOM_WEEK_STRATEGY = {
    # If student gaps at Remember/Understand → address first (weeks 1-4)
    BloomLevel.REMEMBER:   {"phase": "foundation", "week_range": (1, 4)},
    BloomLevel.UNDERSTAND: {"phase": "foundation", "week_range": (1, 4)},
    # Apply/Analyze gaps → mid-semester (weeks 5-10)
    BloomLevel.APPLY:      {"phase": "application", "week_range": (5, 10)},
    BloomLevel.ANALYZE:    {"phase": "application", "week_range": (5, 10)},
    # Evaluate/Create gaps → advanced (weeks 11-16)
    BloomLevel.EVALUATE:   {"phase": "advanced", "week_range": (11, 16)},
    BloomLevel.CREATE:     {"phase": "advanced", "week_range": (11, 16)},
}

prompt = """Generate a valid JSON study plan. 
Return ONLY valid JSON with double quotes around all property names.
No markdown, no code blocks, just pure JSON."""

class PlannerAgent:
    """
    Generates a personalised 16-week study plan using:
    1. Bloom's Taxonomy gap prioritisation
    2. LLM (Llama-3-70B via Groq) for natural language plan generation
    3. Reflexion self-critique loop for quality assurance
    """

    def __init__(self):
        self.llm = ChatGroq(
            api_key     = settings.GROQ_API_KEY,
            model_name  = settings.GROQ_MODEL,
            temperature = settings.LLM_TEMPERATURE,
            max_tokens  = settings.LLM_MAX_TOKENS,
        )

    async def run(self, state: AgentState) -> AgentState:
        if not state.knowledge_profile:
            state.errors.append("PlannerAgent: No knowledge profile available.")
            return state

        logger.info(f"[PlannerAgent] Generating 16-week plan for student {state.student_id}")

        try:
            profile = state.knowledge_profile

            # ── Step 1: Structural plan skeleton from gap analysis ──
            skeleton = self._build_skeleton(profile)

            # ── Step 2: LLM enrichment ──
            enriched = await self._llm_enrich(skeleton, profile)

            # ── Step 3: Reflexion self-critique loop ──
            for round_num in range(settings.REFLEXION_ROUNDS):
                critique  = await self._critique(enriched, profile)
                enriched  = await self._revise(enriched, critique, profile)
                state.plan_critique = critique
                logger.info(f"[PlannerAgent] Reflexion round {round_num + 1} complete")

            # ── Step 4: Build final StudyPlan ──
            state.study_plan   = enriched
            state.plan_complete = True
            logger.success(f"[PlannerAgent] Plan generated: {settings.SEMESTER_WEEKS} weeks, "
                           f"{enriched.total_hours:.1f}h total")

        except Exception as e:
            logger.error(f"[PlannerAgent] Error: {e}")
            state.errors.append(f"PlannerAgent: {str(e)}")
            # Fallback to structural plan without LLM
            state.study_plan   = self._build_skeleton(state.knowledge_profile)
            state.plan_complete = True

        return state

    def _build_skeleton(self, profile: KnowledgeProfile) -> StudyPlan:
        """
        Build a deterministic 16-week skeleton based on:
        1. Gap severity ordering
        2. Bloom's Taxonomy level progression (foundation → application → advanced)
        3. Prerequisite gap prioritisation
        """
        weeks: list[StudyWeek] = []

        # Separate concepts by phase
        foundation_concepts  = []   # CRITICAL gaps + prerequisite gaps
        application_concepts = []   # HIGH/MEDIUM gaps at Apply/Analyze
        advanced_concepts    = []   # MEDIUM/LOW gaps at Evaluate/Create
        review_concepts      = []   # LOW/NONE gaps — maintenance

        for cp in profile.concepts:
            if cp.prerequisite_gap or cp.highest_gap_severity == GapSeverity.CRITICAL:
                foundation_concepts.append(cp)
            elif cp.highest_gap_severity in [GapSeverity.HIGH, GapSeverity.MEDIUM]:
                # Determine by which Bloom level has the worst gap
                worst_level = cp.highest_gap_level
                if worst_level and worst_level in [BloomLevel.APPLY, BloomLevel.ANALYZE]:
                    application_concepts.append(cp)
                else:
                    advanced_concepts.append(cp)
            else:
                review_concepts.append(cp)

        # ── Weeks 1-4: Foundation phase ──
        weeks += self._build_phase_weeks(
            concepts    = foundation_concepts,
            week_start  = 1,
            week_end    = 4,
            phase_name  = "Foundation",
            bloom_focus = [BloomLevel.REMEMBER, BloomLevel.UNDERSTAND],
            theme_prefix = "Strengthen Foundations",
        )

        # ── Weeks 5-10: Application phase ──
        weeks += self._build_phase_weeks(
            concepts    = application_concepts + foundation_concepts,  # revisit
            week_start  = 5,
            week_end    = 10,
            phase_name  = "Application",
            bloom_focus = [BloomLevel.APPLY, BloomLevel.ANALYZE],
            theme_prefix = "Build Application Skills",
        )

        # ── Weeks 11-14: Advanced phase ──
        weeks += self._build_phase_weeks(
            concepts    = advanced_concepts + application_concepts,
            week_start  = 11,
            week_end    = 14,
            phase_name  = "Advanced",
            bloom_focus = [BloomLevel.EVALUATE, BloomLevel.CREATE],
            theme_prefix = "Master Higher-Order Thinking",
        )

        # ── Weeks 15-16: Consolidation and assessment ──
        weeks.append(StudyWeek(
            week_number = 15,
            theme       = "Consolidation & Practice Exams",
            concepts    = [cp.concept for cp in profile.concepts[:5]],
            bloom_focus = [int(l) for l in BloomLevel],
            hours       = 12.0,
            tasks       = [{"activity": "Mock diagnostic assessment", "bloom_level": "All", "hours": 3},
                           {"activity": "Review critical gap concepts", "bloom_level": "Analyze", "hours": 5},
                           {"activity": "Peer study group", "bloom_level": "Evaluate", "hours": 4}],
            priority    = "HIGH",
            milestone   = "Mid-consolidation checkpoint",
        ))
        weeks.append(StudyWeek(
            week_number = 16,
            theme       = "Final Review & Mastery Verification",
            concepts    = profile.critical_gaps or [cp.concept for cp in profile.concepts[:3]],
            bloom_focus = [int(l) for l in BloomLevel],
            hours       = 10.0,
            tasks       = [{"activity": "Final diagnostic re-assessment", "bloom_level": "All", "hours": 2},
                           {"activity": "Portfolio/project completion", "bloom_level": "Create", "hours": 5},
                           {"activity": "Reflective learning journal", "bloom_level": "Evaluate", "hours": 3}],
            priority    = "HIGH",
            milestone   = "Semester mastery verification",
        ))

        total_hours = sum(w.hours for w in weeks)

        return StudyPlan(
            student_id  = profile.student_id,
            plan_id     = str(uuid.uuid4()),
            created_at  = datetime.utcnow().isoformat(),
            weeks       = weeks,
            total_hours = total_hours,
            version     = 1,
        )

    def _build_phase_weeks(
        self,
        concepts:    list[ConceptGapProfile],
        week_start:  int,
        week_end:    int,
        phase_name:  str,
        bloom_focus: list[BloomLevel],
        theme_prefix: str,
    ) -> list[StudyWeek]:
        """Distribute concepts across a phase's weeks."""
        weeks = []
        total_weeks = week_end - week_start + 1

        if not concepts:
            # Fill with general practice if no specific gaps
            for wk in range(week_start, week_end + 1):
                weeks.append(StudyWeek(
                    week_number = wk,
                    theme       = f"General Practice — {phase_name}",
                    concepts    = [],
                    bloom_focus = [int(l) for l in bloom_focus],
                    hours       = 8.0,
                    tasks       = [{"activity": "Practice exercises", "bloom_level": BLOOM_LABELS[bloom_focus[0]], "hours": 4},
                                   {"activity": "Review notes", "bloom_level": BLOOM_LABELS[bloom_focus[0]], "hours": 2},
                                   {"activity": "Quiz preparation", "bloom_level": BLOOM_LABELS[bloom_focus[-1]], "hours": 2}],
                    priority    = "LOW",
                ))
            return weeks

        # Distribute concepts evenly across weeks
        chunk_size = max(1, len(concepts) // total_weeks)
        for i, wk in enumerate(range(week_start, week_end + 1)):
            chunk_start = i * chunk_size
            chunk_end   = chunk_start + chunk_size
            week_concepts = concepts[chunk_start:chunk_end]

            if not week_concepts and concepts:
                week_concepts = [concepts[-1]]

            severity  = week_concepts[0].highest_gap_severity if week_concepts else "LOW"
            hours     = 14.0 if severity == GapSeverity.CRITICAL else 10.0 if severity == GapSeverity.HIGH else 8.0

            tasks = []
            for cp in week_concepts:
                for bloom in bloom_focus:
                    if int(bloom) in cp.bloom_results:
                        result = cp.bloom_results[int(bloom)]
                        if result.gap_severity in [GapSeverity.CRITICAL, GapSeverity.HIGH, GapSeverity.MEDIUM]:
                            tasks.append({
                                "concept":       cp.concept,
                                "learning_area": cp.learning_area,
                                "bloom_level":   BLOOM_LABELS[bloom],
                                "activity":      f"{result.recommended_verbs[0].capitalize()} {cp.concept}",
                                "resource_type": "Video" if bloom in [BloomLevel.REMEMBER, BloomLevel.UNDERSTAND] else "Exercise",
                                "hours":         round(hours / max(len(week_concepts), 1), 1),
                                "gap_severity":  result.gap_severity,
                            })

            weeks.append(StudyWeek(
                week_number = wk,
                theme       = f"{theme_prefix}: {', '.join(cp.concept for cp in week_concepts[:2])}",
                concepts    = [cp.concept for cp in week_concepts],
                bloom_focus = [int(l) for l in bloom_focus],
                hours       = hours,
                tasks       = tasks or [{"activity": f"Study {week_concepts[0].concept if week_concepts else 'topic'}", "hours": hours}],
                priority    = severity if severity != GapSeverity.NONE else "LOW",
            ))

        return weeks

    async def _llm_enrich(self, skeleton: StudyPlan, profile: KnowledgeProfile) -> StudyPlan:
        """Use LLM to enrich task descriptions with natural language guidance."""
        profile_summary = self._profile_to_text(profile)

        prompt = f"""You are an expert academic planner for undergraduate Software Engineering students.

Student Knowledge Profile:
{profile_summary}

I have a 16-week study plan skeleton. Enrich each week's tasks with:
1. Specific, actionable study activities aligned to the Bloom's level
2. Recommended resource types (video lectures, practice problems, articles)
3. Estimated time allocations
4. Clear learning objectives using Bloom's action verbs

Return ONLY valid JSON matching this structure:
{{
  "weeks": [
    {{
      "week_number": 1,
      "theme": "...",
      "enriched_tasks": [
        {{
          "concept": "...",
          "bloom_level": "Remember|Understand|Apply|Analyze|Evaluate|Create",
          "activity": "specific activity description",
          "resource_type": "Video|Article|Book|Exercise|Project",
          "learning_objective": "By end of this task, student will be able to...",
          "hours": 2.5
        }}
      ],
      "weekly_goal": "One sentence describing the week's focus",
      "success_metric": "How student knows they've mastered this week"
    }}
  ]
}}

Student's critical gaps: {profile.critical_gaps}
Overall mastery: {profile.overall_mastery:.1f}%"""

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content="You are an expert educational planner. Return only valid JSON."),
                HumanMessage(content=prompt),
            ])

            enriched_data = json.loads(response.content)
            # Merge enriched data back into skeleton weeks
            enriched_map = {w["week_number"]: w for w in enriched_data.get("weeks", [])}
            for week in skeleton.weeks:
                if week.week_number in enriched_map:
                    enriched = enriched_map[week.week_number]
                    week.theme = enriched.get("theme", week.theme)
                    if enriched.get("enriched_tasks"):
                        week.tasks = enriched["enriched_tasks"]

        except Exception as e:
            logger.warning(f"[PlannerAgent] LLM enrichment failed: {e} — using skeleton")

        return skeleton

    async def _critique(self, plan: StudyPlan, profile: KnowledgeProfile) -> str:
        """Reflexion Step 1: Self-critique of the generated plan."""
        plan_summary = "\n".join(
            f"Week {w.week_number}: {w.theme} ({w.hours}h, priority={w.priority})"
            for w in plan.weeks
        )

        prompt = f"""Review this 16-week study plan for a Software Engineering student.

Student Profile:
- Overall mastery: {profile.overall_mastery:.1f}%
- Critical gaps: {profile.critical_gaps}
- Bloom's Taxonomy summary: {profile.bloom_summary}

Generated Plan:
{plan_summary}

Critique the plan across these dimensions:
1. Gap prioritisation — are critical gaps addressed early enough?
2. Bloom's progression — does it follow Remember→Understand→Apply→Analyze→Evaluate→Create?
3. Workload balance — are weekly hours realistic (max {settings.MAX_HOURS_PER_WEEK}h)?
4. Coverage — are all identified gaps addressed across the 16 weeks?
5. Prerequisite sequencing — are foundational concepts covered before advanced ones?

Be specific and concise. List exactly what should be changed."""

        response = await self.llm.ainvoke([
            SystemMessage(content="You are a critical educational planner reviewer."),
            HumanMessage(content=prompt),
        ])
        return response.content

    async def _revise(self, plan: StudyPlan, critique: str, profile: KnowledgeProfile) -> StudyPlan:
        """Reflexion Step 2: Revise plan based on critique."""
        prompt = f"""Revise this 16-week study plan based on the critique below.

Critique:
{critique}

Critical gaps to prioritise: {profile.critical_gaps}
Max hours per week: {settings.MAX_HOURS_PER_WEEK}

Return ONLY JSON with the revised week themes and hour allocations:
{{
  "revisions": [
    {{ "week_number": 1, "theme": "...", "hours": 10.0, "priority": "HIGH" }}
  ]
}}"""

        try:
            response = await self.llm.ainvoke([
                SystemMessage(content="You are an educational planner. Return only valid JSON."),
                HumanMessage(content=prompt),
            ])
            revisions = json.loads(response.content).get("revisions", [])
            rev_map   = {r["week_number"]: r for r in revisions}
            for week in plan.weeks:
                if week.week_number in rev_map:
                    rev = rev_map[week.week_number]
                    week.theme    = rev.get("theme",    week.theme)
                    week.hours    = min(rev.get("hours", week.hours), settings.MAX_HOURS_PER_WEEK)
                    week.priority = rev.get("priority", week.priority)
            plan.total_hours = sum(w.hours for w in plan.weeks)
            plan.version    += 1
        except Exception as e:
            logger.warning(f"[PlannerAgent] Revision failed: {e}")

        return plan

    def _profile_to_text(self, profile: KnowledgeProfile) -> str:
        lines = [
            f"Overall Mastery: {profile.overall_mastery:.1f}% (θ={profile.overall_theta:.3f})",
            f"Critical Gaps: {', '.join(profile.critical_gaps) or 'None'}",
            f"Bloom's Taxonomy Mastery:",
        ]
        from irt.blooms_gap_engine import BLOOM_LABELS
        for level, mastery in sorted(profile.bloom_summary.items()):
            label = BLOOM_LABELS.get(level, f"Level {level}")
            lines.append(f"  {level}. {label}: {mastery:.1f}%")
        lines.append("Top Priority Concepts:")
        for cp in profile.concepts[:5]:
            lines.append(f"  - {cp.concept} ({cp.learning_area}): "
                         f"{cp.overall_mastery:.1f}% | "
                         f"Gap: {cp.highest_gap_severity} at {BLOOM_LABELS.get(cp.highest_gap_level, 'N/A')}")
        return "\n".join(lines)
