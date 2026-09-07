import json
import asyncio

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any

from loguru import logger

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from core.config import settings
from agents.state import AgentState


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class WeekPlan:
    week_number: int
    theme: str
    concepts: List[str]
    bloom_focus: List[str]
    hours: float
    tasks: List[Dict[str, Any]]
    priority: str
    milestone: str


@dataclass
class StudyPlan:
    plan_id: str
    student_id: str
    weeks: List[WeekPlan]
    total_hours: float
    version: int = 1
    critique_history: List[str] = field(default_factory=list)


# ============================================================
# PLANNER AGENT
# ============================================================

class PlannerAgent:
    """
    Adaptive weekly study-plan generator.

    Instead of generating an entire 16-week plan at once,
    this agent generates ONE week based on the student's
    current knowledge profile.

    Future weeks can be generated after the student completes
    the current week and the EvaluatorAgent updates progress.
    """

    def __init__(
        self,
        groq_api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.2,
    ):
        """Initialize PlannerAgent with Groq LLM."""

        # ----------------------------------------------------
        # API KEY
        # ----------------------------------------------------

        api_key = groq_api_key or settings.GROQ_API_KEY

        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not found. "
                "Check your .env and core/config.py."
            )

        # ----------------------------------------------------
        # MODEL
        # ----------------------------------------------------

        model_name = model_name or settings.GROQ_MODEL

        if not model_name:
            model_name = "openai/gpt-oss-120b"

        # ----------------------------------------------------
        # LLM
        # ----------------------------------------------------

        self.llm = ChatGroq(
            api_key=api_key,
            model_name=model_name,
            temperature=temperature,
            max_tokens=4096,
        )

        self.model_name = model_name

        logger.info(
            f"[PlannerAgent] Initialized with model: {model_name}"
        )

    # ========================================================
    # MAIN RUN
    # ========================================================

    async def run(self, state: AgentState) -> AgentState:

        if not state.knowledge_profile:
            logger.error(
                "[PlannerAgent] No knowledge profile provided"
            )
            return state

        profile = state.knowledge_profile

        logger.info(
            f"[PlannerAgent] Starting weekly planning for "
            f"student={state.student_id} | "
            f"mastery={profile.overall_mastery:.1f}%"
        )

        try:

            # ------------------------------------------------
            # DETERMINE WEEK NUMBER
            # ------------------------------------------------

            week_number = self._get_next_week_number(state)

            logger.info(
                f"[PlannerAgent] Generating Week {week_number} only..."
            )

            # ------------------------------------------------
            # GENERATE ONE WEEK
            # ------------------------------------------------

            weekly_plan = await self._generate_week(
                profile=profile,
                week_number=week_number,
                state=state,
            )

            # ------------------------------------------------
            # SMALL WEEKLY CRITIQUE
            # ------------------------------------------------

            logger.info(
                f"[PlannerAgent] Running Week {week_number} critique..."
            )

            critique = await self._critique_week(
                weekly_plan,
                profile,
            )

            # ------------------------------------------------
            # STORE CRITIQUE
            # ------------------------------------------------

            weekly_plan["critique"] = critique.get(
                "summary",
                ""
            )

            weekly_plan["critique_history"] = [
                critique.get("summary", "")
            ]

            # ------------------------------------------------
            # BUILD STUDY PLAN
            # ------------------------------------------------

            study_plan = self._build_study_plan(
                weekly_plan,
                state.student_id,
                week_number,
            )

            state.study_plan = study_plan

            state.plan_critique = critique.get(
                "summary",
                ""
            )

            logger.success(
                f"[PlannerAgent] Weekly plan complete | "
                f"week={week_number} | "
                f"hours={study_plan.total_hours} | "
                f"tasks={sum(len(w.tasks) for w in study_plan.weeks)}"
            )

            return state

        except Exception as e:

            logger.exception(
                f"[PlannerAgent] Failed: {e}"
            )

            state.errors.append(
                f"Planner failed: {str(e)}"
            )

            return state

    # ========================================================
    # GET NEXT WEEK NUMBER
    # ========================================================

    def _get_next_week_number(
        self,
        state: AgentState,
    ) -> int:

        """
        Determine which week should be generated.

        For the initial diagnostic this returns Week 1.

        Later, when previous weeks are persisted in the state,
        this can return the next required week.
        """

        # If the state already has a study plan, continue from it.
        if state.study_plan:

            existing_weeks = getattr(
                state.study_plan,
                "weeks",
                []
            )

            if existing_weeks:

                numbers = [
                    getattr(
                        week,
                        "week_number",
                        0
                    )
                    for week in existing_weeks
                ]

                valid_numbers = [
                    n for n in numbers
                    if isinstance(n, int) and n > 0
                ]

                if valid_numbers:
                    return min(
                        max(valid_numbers) + 1,
                        16
                    )

        # Initial diagnostic
        return 1

    # ========================================================
    # GENERATE ONE WEEK
    # ========================================================

    async def _generate_week(
        self,
        profile,
        week_number: int,
        state: AgentState,
    ) -> Dict[str, Any]:

        context = self._build_profile_context(
            profile
        )

        # ----------------------------------------------------
        # SYSTEM PROMPT
        # ----------------------------------------------------

        system_prompt = """
You are an expert adaptive educational planner.

Your task is to create ONLY ONE personalized study week
for a Software Engineering student.

The plan must be based on the student's current diagnostic
knowledge profile.

PRIORITY RULES:

1. Address the student's weakest and most critical gaps first.
2. Prioritize foundational concepts before advanced concepts.
3. Respect prerequisites.
4. Use Bloom's Taxonomy appropriately.
5. Start at the student's current cognitive level.
6. Do not overload the student.
7. Maximum weekly workload is 20 hours.
8. Include concrete and actionable activities.
9. Every task must contain all required metadata.
10. Focus on quality rather than covering too many concepts.

BLOOM LEVELS:

1 = Remember
2 = Understand
3 = Apply
4 = Analyze
5 = Evaluate
6 = Create

IMPORTANT:

Generate EXACTLY ONE WEEK.

Do NOT generate Week 2.
Do NOT generate Week 3.
Do NOT generate a semester plan.
Do NOT generate 16 weeks.

Return ONLY valid JSON.

No Markdown.
No ```json.
No explanations.
No text before the JSON.
No text after the JSON.
"""

        # ----------------------------------------------------
        # USER PROMPT
        # ----------------------------------------------------

        user_prompt = f"""
Create Week {week_number} of this student's adaptive
study plan.

STUDENT KNOWLEDGE PROFILE
=========================

{context}

WEEK TO GENERATE:
Week {week_number}

Create ONLY this week.

The week should focus primarily on the student's most
important current knowledge gaps.

Return exactly this JSON structure:

{{
    "weeks": [
        {{
            "week_number": {week_number},
            "theme": "Main focus of this week",
            "concepts": [
                "Weak Concept 1",
                "Weak Concept 2"
            ],
            "bloom_focus": [
                "Remember",
                "Understand",
                "Apply"
            ],
            "hours": 12,
            "tasks": [
                {{
                    "activity": "Study the fundamental concept",
                    "concept": "Weak Concept 1",
                    "learning_area": "Learning Area",
                    "bloom_level": 1,
                    "hours": 2
                }},
                {{
                    "activity": "Complete practice exercises",
                    "concept": "Weak Concept 1",
                    "learning_area": "Learning Area",
                    "bloom_level": 2,
                    "hours": 2
                }}
            ],
            "priority": "HIGH",
            "milestone": "Student can explain and apply the target concept"
        }}
    ],
    "total_hours": 12
}}

REQUIREMENTS:

- weeks must contain exactly ONE item.
- That item must be Week {week_number}.
- Maximum weekly hours = 20.
- At least one task is required.
- Every task must contain:
  activity
  concept
  learning_area
  bloom_level
  hours
- Tasks must directly address the student's knowledge gaps.
- Do not invent unrelated subjects.
- Keep the workload realistic.
"""

        # ----------------------------------------------------
        # LLM CALL
        # ----------------------------------------------------

        messages = [
            SystemMessage(
                content=system_prompt
            ),
            HumanMessage(
                content=user_prompt
            ),
        ]

        logger.info(
            f"[PlannerAgent] Sending Week {week_number} "
            f"request to Groq..."
        )

        response = await asyncio.to_thread(
            self.llm.invoke,
            messages
        )

        logger.info(
            "[PlannerAgent] LLM response received"
        )

        # ----------------------------------------------------
        # EXTRACT RESPONSE
        # ----------------------------------------------------

        response_text = self._extract_response_text(
            response
        )

        logger.info(
            f"[PlannerAgent] Weekly response length: "
            f"{len(response_text)} characters"
        )

        if not response_text:

            raise ValueError(
                "Groq returned an empty response."
            )

        # ----------------------------------------------------
        # PARSE JSON
        # ----------------------------------------------------

        plan = self._parse_plan_json(
            response_text
        )

        # ----------------------------------------------------
        # VALIDATE
        # ----------------------------------------------------

        self._validate_weekly_plan(
            plan,
            expected_week=week_number
        )

        logger.success(
            f"[PlannerAgent] Generated Week "
            f"{week_number} successfully"
        )

        return plan

    # ========================================================
    # CRITIQUE ONE WEEK
    # ========================================================

    async def _critique_week(
        self,
        plan: Dict[str, Any],
        profile,
    ) -> Dict[str, Any]:

        weeks = plan.get(
            "weeks",
            []
        )

        if not weeks:
            return {
                "strengths": [],
                "weaknesses": [],
                "needs_improvement": False,
                "suggestions": [],
                "summary": "",
            }

        week = weeks[0]

        # ----------------------------------------------------
        # IMPORTANT:
        # Only send the compact week information.
        # Do not send huge task/context payloads.
        # ----------------------------------------------------

        compact_week = {
            "week_number": week.get(
                "week_number"
            ),
            "theme": week.get(
                "theme"
            ),
            "concepts": week.get(
                "concepts"
            ),
            "bloom_focus": week.get(
                "bloom_focus"
            ),
            "hours": week.get(
                "hours"
            ),
            "priority": week.get(
                "priority"
            ),
            "milestone": week.get(
                "milestone"
            ),
        }

        week_json = json.dumps(
            compact_week,
            indent=2
        )

        profile_context = self._build_profile_context(
            profile
        )

        system_prompt = """
You are an expert educational plan evaluator.

Evaluate ONE weekly study plan.

Check:

1. Does it address critical knowledge gaps?
2. Are weak concepts prioritized?
3. Is Bloom progression appropriate?
4. Is the workload realistic?
5. Is the weekly workload <= 20 hours?
6. Is the milestone measurable?
7. Are the concepts relevant?

Return ONLY valid JSON.

Required format:

{
    "strengths": [],
    "weaknesses": [],
    "needs_improvement": false,
    "suggestions": [],
    "summary": "..."
}
"""

        user_prompt = f"""
STUDENT PROFILE:

{profile_context}

WEEKLY PLAN:

{week_json}

Evaluate this week.
"""

        try:

            response = await asyncio.to_thread(
                self.llm.invoke,
                [
                    SystemMessage(
                        content=system_prompt
                    ),
                    HumanMessage(
                        content=user_prompt
                    ),
                ]
            )

            response_text = self._extract_response_text(
                response
            )

            if not response_text:

                return {
                    "strengths": [],
                    "weaknesses": [],
                    "needs_improvement": False,
                    "suggestions": [],
                    "summary": "",
                }

            result = self._parse_json_response(
                response_text
            )

            return result

        except Exception as e:

            logger.warning(
                f"[PlannerAgent] Week critique failed: {e}"
            )

            # Critique failure should NOT break planning.

            return {
                "strengths": [],
                "weaknesses": [],
                "needs_improvement": False,
                "suggestions": [],
                "summary": "",
            }

    # ========================================================
    # BUILD PROFILE CONTEXT
    # ========================================================

    def _build_profile_context(
        self,
        profile,
    ) -> str:

        critical_gaps = (
            profile.critical_gaps
            if profile.critical_gaps
            else []
        )

        bloom_summary = (
            profile.bloom_summary
            if profile.bloom_summary
            else {}
        )

        learning_area_summary = (
            profile.learning_area_summary
            if profile.learning_area_summary
            else {}
        )

        if profile.total_questions:

            accuracy = (
                profile.correct_answers
                / profile.total_questions
                * 100
            )

        else:

            accuracy = 0.0

        return f"""
Overall Mastery:
{profile.overall_mastery:.1f}%

Theta:
{profile.overall_theta:.2f}

Critical Knowledge Gaps:
{', '.join(critical_gaps)}

Bloom's Level Mastery:
{json.dumps(bloom_summary, indent=2)}

Learning Area Mastery:
{json.dumps(learning_area_summary, indent=2)}

Total Questions:
{profile.total_questions}

Correct Answers:
{profile.correct_answers}

Accuracy:
{accuracy:.1f}%
"""

    # ========================================================
    # VALIDATE WEEKLY PLAN
    # ========================================================

    def _validate_weekly_plan(
        self,
        plan: Dict[str, Any],
        expected_week: int,
    ) -> None:

        if not isinstance(
            plan,
            dict
        ):
            raise ValueError(
                "Planner returned invalid JSON object."
            )

        weeks = plan.get(
            "weeks"
        )

        if not isinstance(
            weeks,
            list
        ):
            raise ValueError(
                "'weeks' must be a list."
            )

        if len(weeks) != 1:

            raise ValueError(
                f"Planner must return exactly ONE week, "
                f"but returned {len(weeks)}."
            )

        week = weeks[0]

        if not isinstance(
            week,
            dict
        ):
            raise ValueError(
                "Week must be a JSON object."
            )

        actual_week = week.get(
            "week_number"
        )

        try:
            actual_week = int(
                actual_week
            )
        except (
            TypeError,
            ValueError
        ):
            actual_week = expected_week

        if actual_week != expected_week:

            raise ValueError(
                f"Expected Week {expected_week}, "
                f"but planner returned Week {actual_week}."
            )

        # ----------------------------------------------------
        # HOURS
        # ----------------------------------------------------

        try:

            hours = float(
                week.get(
                    "hours",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            hours = 0

        if hours <= 0:

            raise ValueError(
                "Weekly plan must contain positive hours."
            )

        if hours > 20:

            raise ValueError(
                f"Weekly plan exceeds 20 hours: {hours}"
            )

        # ----------------------------------------------------
        # TASKS
        # ----------------------------------------------------

        tasks = week.get(
            "tasks",
            []
        )

        if not isinstance(
            tasks,
            list
        ):

            raise ValueError(
                "Week tasks must be a list."
            )

        if not tasks:

            raise ValueError(
                "Weekly plan must contain at least one task."
            )

        # ----------------------------------------------------
        # REQUIRED TASK FIELDS
        # ----------------------------------------------------

        required_fields = [
            "activity",
            "concept",
            "learning_area",
            "bloom_level",
            "hours",
        ]

        for index, task in enumerate(tasks):

            if not isinstance(
                task,
                dict
            ):

                raise ValueError(
                    f"Task {index + 1} is not an object."
                )

            missing = [
                field
                for field in required_fields
                if field not in task
            ]

            if missing:

                raise ValueError(
                    f"Task {index + 1} missing fields: "
                    f"{missing}"
                )

    # ========================================================
    # EXTRACT RESPONSE TEXT
    # ========================================================

    def _extract_response_text(
        self,
        response,
    ) -> str:

        if response is None:
            return ""

        content = getattr(
            response,
            "content",
            response
        )

        # ----------------------------------------------------
        # STRING
        # ----------------------------------------------------

        if isinstance(
            content,
            str
        ):

            return content.strip()

        # ----------------------------------------------------
        # LIST
        # ----------------------------------------------------

        if isinstance(
            content,
            list
        ):

            parts = []

            for block in content:

                if isinstance(
                    block,
                    str
                ):

                    parts.append(
                        block
                    )

                elif isinstance(
                    block,
                    dict
                ):

                    text = block.get(
                        "text"
                    )

                    if text:
                        parts.append(
                            str(text)
                        )

                elif hasattr(
                    block,
                    "text"
                ):

                    text = getattr(
                        block,
                        "text",
                        None
                    )

                    if text:
                        parts.append(
                            str(text)
                        )

            return "".join(parts).strip()

        # ----------------------------------------------------
        # OTHER
        # ----------------------------------------------------

        return str(
            content
        ).strip()

    # ========================================================
    # PARSE PLAN JSON
    # ========================================================

    def _parse_plan_json(
        self,
        response_text: str,
    ) -> Dict[str, Any]:

        if not response_text:

            raise ValueError(
                "LLM returned an empty response."
            )

        text = response_text.strip()

        # ----------------------------------------------------
        # DIRECT JSON
        # ----------------------------------------------------

        try:

            result = json.loads(
                text
            )

            if isinstance(
                result,
                dict
            ):

                return result

        except json.JSONDecodeError:
            pass

        # ----------------------------------------------------
        # MARKDOWN JSON
        # ----------------------------------------------------

        lower_text = text.lower()

        if "```json" in lower_text:

            start_marker = lower_text.find(
                "```json"
            )

            start = (
                start_marker
                + len("```json")
            )

            end = text.find(
                "```",
                start
            )

            if end != -1:

                json_text = text[
                    start:end
                ].strip()

                try:

                    result = json.loads(
                        json_text
                    )

                    if isinstance(
                        result,
                        dict
                    ):

                        return result

                except json.JSONDecodeError as e:

                    logger.warning(
                        f"[PlannerAgent] "
                        f"Markdown JSON parse failed: {e}"
                    )

        # ----------------------------------------------------
        # GENERIC CODE BLOCK
        # ----------------------------------------------------

        if "```" in text:

            first = text.find(
                "```"
            )

            start = text.find(
                "\n",
                first
            )

            if start != -1:

                start += 1

                end = text.find(
                    "```",
                    start
                )

                if end != -1:

                    json_text = text[
                        start:end
                    ].strip()

                    try:

                        result = json.loads(
                            json_text
                        )

                        if isinstance(
                            result,
                            dict
                        ):

                            return result

                    except json.JSONDecodeError:
                        pass

        # ----------------------------------------------------
        # EXTRACT FIRST JSON OBJECT
        # ----------------------------------------------------

        start = text.find(
            "{"
        )

        end = text.rfind(
            "}"
        )

        if start != -1 and end > start:

            json_text = text[
                start:end + 1
            ]

            try:

                result = json.loads(
                    json_text
                )

                if isinstance(
                    result,
                    dict
                ):

                    return result

            except json.JSONDecodeError as e:

                logger.error(
                    f"[PlannerAgent] "
                    f"Extracted JSON invalid: {e}"
                )

        logger.error(
            "[PlannerAgent] Failed to parse plan JSON."
        )

        logger.error(
            f"[PlannerAgent] Raw response:\n"
            f"{text[:5000]}"
        )

        raise ValueError(
            "Could not parse plan JSON from response"
        )

    # ========================================================
    # GENERIC JSON PARSER
    # ========================================================

    def _parse_json_response(
        self,
        response_text: str,
    ) -> Dict[str, Any]:

        if not response_text:
            return {}

        text = response_text.strip()

        # ----------------------------------------------------
        # DIRECT JSON
        # ----------------------------------------------------

        try:

            result = json.loads(
                text
            )

            if isinstance(
                result,
                dict
            ):

                return result

        except json.JSONDecodeError:
            pass

        # ----------------------------------------------------
        # MARKDOWN JSON
        # ----------------------------------------------------

        lower_text = text.lower()

        if "```json" in lower_text:

            start_marker = lower_text.find(
                "```json"
            )

            start = (
                start_marker
                + len("```json")
            )

            end = text.find(
                "```",
                start
            )

            if end != -1:

                json_text = text[
                    start:end
                ].strip()

                try:

                    result = json.loads(
                        json_text
                    )

                    if isinstance(
                        result,
                        dict
                    ):

                        return result

                except json.JSONDecodeError:
                    pass

        # ----------------------------------------------------
        # GENERIC CODE BLOCK
        # ----------------------------------------------------

        if "```" in text:

            first = text.find(
                "```"
            )

            start = text.find(
                "\n",
                first
            )

            if start != -1:

                start += 1

                end = text.find(
                    "```",
                    start
                )

                if end != -1:

                    json_text = text[
                        start:end
                    ].strip()

                    try:

                        result = json.loads(
                            json_text
                        )

                        if isinstance(
                            result,
                            dict
                        ):

                            return result

                    except json.JSONDecodeError:
                        pass

        # ----------------------------------------------------
        # EXTRACT JSON OBJECT
        # ----------------------------------------------------

        start = text.find(
            "{"
        )

        end = text.rfind(
            "}"
        )

        if start != -1 and end > start:

            json_text = text[
                start:end + 1
            ]

            try:

                result = json.loads(
                    json_text
                )

                if isinstance(
                    result,
                    dict
                ):

                    return result

            except json.JSONDecodeError:
                pass

        return {}

    # ========================================================
    # BUILD STUDY PLAN
    # ========================================================

    def _build_study_plan(
        self,
        plan_data: Dict[str, Any],
        student_id: str,
        week_number: int,
    ) -> StudyPlan:

        weeks = []

        # ----------------------------------------------------
        # READ ONLY THE GENERATED WEEK
        # ----------------------------------------------------

        for week_data in plan_data.get(
            "weeks",
            []
        ):

            if not isinstance(
                week_data,
                dict
            ):
                continue

            # ------------------------------------------------
            # TASKS
            # ------------------------------------------------

            tasks = week_data.get(
                "tasks",
                []
            )

            if not isinstance(
                tasks,
                list
            ):

                tasks = []

            # ------------------------------------------------
            # CONCEPTS
            # ------------------------------------------------

            concepts = week_data.get(
                "concepts",
                []
            )

            if not isinstance(
                concepts,
                list
            ):

                concepts = []

            # ------------------------------------------------
            # BLOOM
            # ------------------------------------------------

            bloom_focus = week_data.get(
                "bloom_focus",
                []
            )

            if not isinstance(
                bloom_focus,
                list
            ):

                bloom_focus = []

            # ------------------------------------------------
            # WEEK
            # ------------------------------------------------

            week = WeekPlan(

                week_number=int(
                    week_data.get(
                        "week_number",
                        week_number
                    )
                ),

                theme=str(
                    week_data.get(
                        "theme",
                        ""
                    )
                ),

                concepts=[
                    str(x)
                    for x in concepts
                ],

                bloom_focus=[
                    str(x)
                    for x in bloom_focus
                ],

                hours=float(
                    week_data.get(
                        "hours",
                        0
                    )
                ),

                tasks=tasks,

                priority=str(
                    week_data.get(
                        "priority",
                        "MEDIUM"
                    )
                ),

                milestone=str(
                    week_data.get(
                        "milestone",
                        ""
                    )
                ),
            )

            weeks.append(
                week
            )

        # ----------------------------------------------------
        # TOTAL HOURS
        # ----------------------------------------------------

        total_hours = plan_data.get(
            "total_hours"
        )

        if total_hours is None:

            total_hours = sum(
                week.hours
                for week in weeks
            )

        # ----------------------------------------------------
        # PLAN ID
        # ----------------------------------------------------

        plan_id = (
            f"plan_{student_id}_"
            f"{int(datetime.utcnow().timestamp())}"
        )

        # ----------------------------------------------------
        # RETURN
        # ----------------------------------------------------

        return StudyPlan(

            plan_id=plan_id,

            student_id=student_id,

            weeks=weeks,

            total_hours=float(
                total_hours
            ),

            version=int(
                plan_data.get(
                    "version",
                    1
                )
            ),

            critique_history=plan_data.get(
                "critique_history",
                []
            ),
        )