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

    IMPORTANT:
    This agent generates ONLY ONE WEEK at a time.

    Week 1:
        current_week = 1

    After Week 1 completion:
        current_week = 2

    After Week 2 completion:
        current_week = 3

    ...

    Maximum:
        Week 16
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
            # ========================================================
    # MAIN RUN
    # ========================================================

    async def run(self, state: AgentState) -> AgentState:
        """
        Generate exactly ONE week.

        The week number comes from state.current_week.
        No 16-week plan is generated here.
        """

        profile = state.knowledge_profile

        if profile is None:
            raise ValueError(
                "[PlannerAgent] Knowledge profile is required."
            )

        # ----------------------------------------------------
        # CURRENT WEEK
        # ----------------------------------------------------

        current_week = state.current_week or 1

        if current_week < 1:
            current_week = 1

        if current_week > 16:
            logger.info(
                "[PlannerAgent] All 16 weeks completed."
            )
            return state

        logger.info(
            f"[PlannerAgent] Generating ONLY Week {current_week}"
        )

        # ----------------------------------------------------
        # GENERATE ONE WEEK
        # ----------------------------------------------------

        week_plan = await self._generate_week(
            profile=profile,
            week_number=current_week,
            previous_weeks=state.previous_weeks or [],
        )

        # ----------------------------------------------------
        # CRITIQUE ONE WEEK
        # ----------------------------------------------------

        critique = await self._critique_week(
            week_plan,
            profile,
        )

        week_plan["critique"] = critique

        # ----------------------------------------------------
        # BUILD ONE-WEEK STUDY PLAN
        # ----------------------------------------------------

        state.study_plan = self._build_study_plan(
            plan_data=week_plan,
            student_id=state.student_id,
            week_number=current_week,
        )

        logger.info(
            f"[PlannerAgent] Week {current_week} generated successfully."
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
        Determine the next week.

        Priority:
        1. state.current_week
        2. existing study plan
        3. Week 1
        """

        current_week = getattr(
            state,
            "current_week",
            None,
        )

        if current_week:
            return min(
                max(int(current_week), 1),
                16,
            )

        # Fallback only
        if state.study_plan:

            existing_weeks = getattr(
                state.study_plan,
                "weeks",
                [],
            )

            if existing_weeks:

                numbers = [
                    getattr(
                        week,
                        "week_number",
                        0,
                    )
                    for week in existing_weeks
                ]

                valid_numbers = [
                    n
                    for n in numbers
                    if isinstance(n, int) and n > 0
                ]

                if valid_numbers:
                    return min(
                        max(valid_numbers) + 1,
                        16,
                    )

        return 1

    # ========================================================
    # GENERATE ONE WEEK ONLY
    # ========================================================

    async def _generate_week(
        self,
        profile,
        week_number: int,
        previous_weeks: list = None,
    ) -> Dict[str, Any]:

        previous_weeks = previous_weeks or []

        context = self._build_profile_context(
            profile
        )

        previous_summary = json.dumps(
            previous_weeks[-2:],
            indent=2,
            default=str,
        )

        # ----------------------------------------------------
        # SYSTEM PROMPT
        # ----------------------------------------------------

        system_prompt = """
You are EDNI Planner Agent.

Your job is to generate ONE personalized study week.

IMPORTANT:
- Generate ONLY ONE week.
- NEVER generate a 16-week plan.
- NEVER generate multiple weeks.
- The requested week number must be used.
- Focus on the student's current knowledge gaps.
- Use Bloom's Taxonomy progressively.
- Consider previous completed weeks.
- Maximum 15 study hours.
- Include exactly 7 daily learning tasks, one for each day.
- Include realistic learning tasks.
- Include a clear milestone.

Return JSON ONLY.

Required JSON structure:

{
    "week_number": 1,
    "theme": "...",
    "concepts": [],
    "bloom_focus": [],
    "hours": 12,
    "tasks": [
        {
            "activity": "...",
            "concept": "...",
            "learning_area": "...",
            "bloom_level": "Remember",
            "hours": 2
        }
    ],
    "priority": "HIGH",
    "milestone": "..."
}
"""

        # ----------------------------------------------------
        # USER PROMPT
        # ----------------------------------------------------

        user_prompt = f"""
Generate ONLY Week {week_number}.

Current Week:
{week_number}

Student Knowledge Profile:
{context}

Previously Completed/Generated Weeks:
{previous_summary}

Requirements:

1. Generate exactly Week {week_number}.
2. Do NOT generate Week {week_number + 1}.
3. Do NOT generate a 16-week plan.
4. Target the student's weakest concepts.
5. Consider Bloom's mastery.
6. Consider learning-area mastery.
7. Keep workload realistic.
8. Maximum 15 hours.
9. Include concrete tasks.
10. Include a measurable milestone.

Return ONLY this JSON object:

{{
    "week_number": {week_number},
    "theme": "...",
    "concepts": [],
    "bloom_focus": [],
    "hours": 12,
    "tasks": [
        {{
            "activity": "...",
            "concept": "...",
            "learning_area": "...",
            "bloom_level": "Remember",
            "hours": 2
        }}
    ],
    "priority": "HIGH",
    "milestone": "..."
}}
"""

        # ----------------------------------------------------
        # CALL LLM
        # ----------------------------------------------------

        response = await asyncio.to_thread(
            self.llm.invoke,
            [
                SystemMessage(
                    content=system_prompt
                ),
                HumanMessage(
                    content=user_prompt
                ),
            ],
        )

        text = self._extract_response_text(
            response
        )

        result = self._parse_json_response(
            text
        )

        # ----------------------------------------------------
        # NORMALIZE SINGLE WEEK
        # ----------------------------------------------------

        # If LLM accidentally returns:
        #
        # {
        #     "weeks": [...]
        # }
        #
        # convert it into a single-week object.

        if "weeks" in result:

            weeks = result.get("weeks", [])

            if not weeks:
                raise ValueError(
                    "Planner returned an empty weeks list."
                )

            if len(weeks) != 1:
                raise ValueError(
                    f"Planner returned {len(weeks)} weeks. "
                    f"Expected exactly 1."
                )

            result = weeks[0]

        # ----------------------------------------------------
        # VALIDATE WEEK
        # ----------------------------------------------------

        self._validate_week(
            result,
            week_number,
        )

        return result

    # ========================================================
    # CRITIQUE ONE WEEK
    # ========================================================

    async def _critique_week(
        self,
        week_plan,
        profile,
    ):

        prompt = f"""
Evaluate this ONE-WEEK study plan.

Check:

- workload realism
- Bloom progression
- prerequisite order
- weak concepts covered
- learning-area alignment
- task quality

Return JSON only.

Study Week:
{json.dumps(week_plan, indent=2, default=str)}
"""

        response = await asyncio.to_thread(
            self.llm.invoke,
            [
                SystemMessage(
                    content="You are an educational plan evaluator."
                ),
                HumanMessage(
                    content=prompt
                ),
            ],
        )

        return self._parse_json_response(
            self._extract_response_text(response)
        )

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
{json.dumps(bloom_summary, indent=2, default=str)}

Learning Area Mastery:
{json.dumps(learning_area_summary, indent=2, default=str)}

Total Questions:
{profile.total_questions}

Correct Answers:
{profile.correct_answers}

Accuracy:
{accuracy:.1f}%
"""

    # ========================================================
    # VALIDATE ONE WEEK
    # ========================================================

    def _validate_week(
        self,
        week: Dict[str, Any],
        expected_week: int,
    ) -> None:

        if not isinstance(week, dict):
            raise ValueError(
                "Planner returned invalid week object."
            )

        # ----------------------------------------------------
        # WEEK NUMBER
        # ----------------------------------------------------

        try:
            actual_week = int(
                week.get(
                    "week_number",
                    expected_week,
                )
            )
        except (
            TypeError,
            ValueError,
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
                    0,
                )
            )
        except (
            TypeError,
            ValueError,
        ):
            hours = 0

        if hours <= 0:
            raise ValueError(
                "Weekly plan must contain positive hours."
            )

        if hours > 15:
            raise ValueError(
                f"Weekly plan exceeds 15 hours: {hours}"
            )

        # ----------------------------------------------------
        # TASKS
        # ----------------------------------------------------

        tasks = week.get(
            "tasks",
            [],
        )

        if not isinstance(tasks, list):
            raise ValueError(
                "Week tasks must be a list."
            )

        if len(tasks) != 7:
            raise ValueError(
                f"Weekly plan must contain exactly 7 tasks, got {len(tasks)}."
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

            if not isinstance(task, dict):
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
            response,
        )

        # STRING
        if isinstance(content, str):
            return content.strip()

        # LIST
        if isinstance(content, list):

            parts = []

            for block in content:

                if isinstance(block, str):

                    parts.append(block)

                elif isinstance(block, dict):

                    text = block.get("text")

                    if text:
                        parts.append(str(text))

                elif hasattr(block, "text"):

                    text = getattr(
                        block,
                        "text",
                        None,
                    )

                    if text:
                        parts.append(str(text))

            return "".join(parts).strip()

        return str(content).strip()

    # ========================================================
    # PARSE JSON RESPONSE
    # ========================================================

    def _parse_json_response(
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

            result = json.loads(text)

            if isinstance(result, dict):
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
                start,
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
                        dict,
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
                first,
            )

            if start != -1:

                start += 1

                end = text.find(
                    "```",
                    start,
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
                            dict,
                        ):
                            return result

                    except json.JSONDecodeError:
                        pass

        # ----------------------------------------------------
        # EXTRACT JSON OBJECT
        # ----------------------------------------------------

        start = text.find("{")
        end = text.rfind("}")

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
                    dict,
                ):
                    return result

            except json.JSONDecodeError as e:

                logger.error(
                    f"[PlannerAgent] "
                    f"Extracted JSON invalid: {e}"
                )

        logger.error(
            "[PlannerAgent] Failed to parse JSON."
        )

        logger.error(
            f"[PlannerAgent] Raw response:\n"
            f"{text[:5000]}"
        )

        raise ValueError(
            "Could not parse JSON from planner response."
        )

    # ========================================================
    # BUILD STUDY PLAN
    # ========================================================

    def _build_study_plan(
        self,
        plan_data: Dict[str, Any],
        student_id: str,
        week_number: int,
    ) -> StudyPlan:

        # ----------------------------------------------------
        # SINGLE WEEK ONLY
        # ----------------------------------------------------

        week_data = plan_data

        if "weeks" in plan_data:

            weeks = plan_data.get(
                "weeks",
                [],
            )

            if len(weeks) != 1:

                raise ValueError(
                    "StudyPlan can only contain ONE generated week."
                )

            week_data = weeks[0]

        # ----------------------------------------------------
        # TASKS
        # ----------------------------------------------------

        tasks = week_data.get(
            "tasks",
            [],
        )

        if not isinstance(tasks, list):
            tasks = []

        # ----------------------------------------------------
        # CONCEPTS
        # ----------------------------------------------------

        concepts = week_data.get(
            "concepts",
            [],
        )

        if not isinstance(concepts, list):
            concepts = []

        # ----------------------------------------------------
        # BLOOM
        # ----------------------------------------------------

        bloom_focus = week_data.get(
            "bloom_focus",
            [],
        )

        if not isinstance(
            bloom_focus,
            list,
        ):
            bloom_focus = []

        # ----------------------------------------------------
        # WEEK OBJECT
        # ----------------------------------------------------

        week = WeekPlan(
            week_number=int(
                week_data.get(
                    "week_number",
                    week_number,
                )
            ),
            theme=str(
                week_data.get(
                    "theme",
                    "",
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
                    0,
                )
            ),
            tasks=tasks,
            priority=str(
                week_data.get(
                    "priority",
                    "MEDIUM",
                )
            ),
            milestone=str(
                week_data.get(
                    "milestone",
                    "",
                )
            ),
        )

        # ----------------------------------------------------
        # PLAN ID
        # ----------------------------------------------------

        plan_id = (
            f"plan_{student_id}_"
            f"{int(datetime.utcnow().timestamp())}"
        )

        # ----------------------------------------------------
        # RETURN ONE-WEEK PLAN
        # ----------------------------------------------------

        return StudyPlan(
            plan_id=plan_id,
            student_id=student_id,
            weeks=[week],
            total_hours=week.hours,
            version=1,
            critique_history=[],
        )