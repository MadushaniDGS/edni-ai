import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from loguru import logger
import asyncio

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
    Personalized 16-week study-plan generator.

    Uses:
    - Knowledge profile
    - Bloom's Taxonomy
    - Critical knowledge gaps
    - Learning-area mastery
    - LLM self-critique/refinement
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
            max_tokens=8192,
        )

        self.model_name = model_name

        logger.info(
            f"[PlannerAgent] Initialized with model: {model_name}"
        )

    # ========================================================
    # MAIN RUN
    # ========================================================

    async def run(self, state: AgentState) -> AgentState:

        logger.info(
            f"[PlannerAgent] Starting for "
            f"student={state.student_id} "
            f"| mastery={state.knowledge_profile.overall_mastery:.1f}%"
        )

        try:

            profile = state.knowledge_profile

            if not profile:
                logger.error(
                    "[PlannerAgent] No knowledge profile provided"
                )
                return state

            # ------------------------------------------------
            # INITIAL PLAN
            # ------------------------------------------------

            logger.info(
                "[PlannerAgent] Generating initial 16-week plan..."
            )

            initial_plan = await self._generate_initial_plan(
                profile
            )

            # ------------------------------------------------
            # REFLEXION
            # ------------------------------------------------

            logger.info(
                "[PlannerAgent] Running self-critique loop..."
            )

            refined_plan = await self._reflexion_loop(
                initial_plan,
                profile
            )

            # ------------------------------------------------
            # BUILD STUDY PLAN
            # ------------------------------------------------

            study_plan = self._build_study_plan(
                refined_plan,
                state.student_id
            )

            state.study_plan = study_plan

            state.plan_critique = refined_plan.get(
                "critique",
                ""
            )

            logger.success(
                f"[PlannerAgent] Complete | "
                f"weeks={len(study_plan.weeks)} | "
                f"hours={study_plan.total_hours} | "
                f"critique_iterations="
                f"{len(refined_plan.get('critique_history', []))}"
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
    # GENERATE INITIAL PLAN
    # ========================================================

    async def _generate_initial_plan(
        self,
        profile
    ) -> Dict[str, Any]:

        context = self._build_profile_context(profile)

        # ----------------------------------------------------
        # SYSTEM PROMPT
        # ----------------------------------------------------

        system_prompt = """
You are an expert educational planner.

Your task is to create a personalized 16-week academic
study plan using the student's diagnostic knowledge profile.

The plan MUST:

1. Address the student's critical knowledge gaps.
2. Prioritize weak concepts before advanced concepts.
3. Progress logically through Bloom's Taxonomy.
4. Begin with foundational knowledge.
5. Gradually move toward Apply, Analyze, Evaluate and Create.
6. Respect prerequisites between concepts.
7. Allocate realistic study hours.
8. Never exceed 20 hours per week.
9. Include concrete learning activities.
10. Include milestones for every week.
11. Cover all major weak learning areas.
12. Create exactly 16 weeks.

For every week provide:

- week_number
- theme
- concepts
- bloom_focus
- hours
- tasks
- priority
- milestone

Every task MUST contain:

- activity
- concept
- learning_area
- bloom_level
- hours

Bloom levels:

1 = Remember
2 = Understand
3 = Apply
4 = Analyze
5 = Evaluate
6 = Create

IMPORTANT OUTPUT RULE:

Return ONLY a valid JSON object.

Do NOT return Markdown.

Do NOT use ```json.

Do NOT add explanations.

Do NOT add text before the JSON.

Do NOT add text after the JSON.
"""

        # ----------------------------------------------------
        # USER PROMPT
        # ----------------------------------------------------

        user_prompt = f"""
Create a personalized 16-week study plan for this student.

STUDENT KNOWLEDGE PROFILE
=========================

{context}

The plan must contain exactly 16 weeks.

Return this JSON structure:

{{
  "weeks": [
    {{
      "week_number": 1,
      "theme": "Foundation of the weakest concepts",
      "concepts": [
        "Concept 1",
        "Concept 2"
      ],
      "bloom_focus": [
        "Remember",
        "Understand"
      ],
      "hours": 15,
      "tasks": [
        {{
          "activity": "Study the fundamental concepts",
          "concept": "Concept 1",
          "learning_area": "Learning Area",
          "bloom_level": 1,
          "hours": 2
        }},
        {{
          "activity": "Complete practice exercises",
          "concept": "Concept 1",
          "learning_area": "Learning Area",
          "bloom_level": 2,
          "hours": 3
        }}
      ],
      "priority": "HIGH",
      "milestone": "Understand the fundamental concepts"
    }}
  ],
  "total_hours": 240
}}

IMPORTANT:

- weeks MUST contain exactly 16 items.
- Every week must contain at least one task.
- Every task must have all required fields.
- Total weekly hours should be realistic.
- Maximum weekly hours = 20.
- Critical gaps must be addressed.
"""

        try:

            messages = [
                SystemMessage(
                    content=system_prompt
                ),
                HumanMessage(
                    content=user_prompt
                ),
            ]

            logger.info(
                "[PlannerAgent] Sending request to Groq..."
            )

            # ------------------------------------------------
            # LLM CALL
            # ------------------------------------------------

            response = await asyncio.to_thread(
                self.llm.invoke,
                messages
            )

            # ------------------------------------------------
            # DEBUG RESPONSE
            # ------------------------------------------------

            logger.info(
                "[PlannerAgent] LLM response received"
            )

            logger.info(
                f"[PlannerAgent] Response type: "
                f"{type(response).__name__}"
            )

            logger.info(
                f"[PlannerAgent] Content type: "
                f"{type(response.content).__name__}"
            )

            logger.info(
                f"[PlannerAgent] Response metadata: "
                f"{getattr(response, 'response_metadata', {})}"
            )

            # ------------------------------------------------
            # EXTRACT CONTENT
            # ------------------------------------------------

            content = response.content

            if isinstance(content, str):

                response_text = content.strip()

            elif isinstance(content, list):

                parts = []

                for block in content:

                    if isinstance(block, dict):

                        text = block.get("text")

                        if text:
                            parts.append(str(text))

                    elif hasattr(block, "text"):

                        text = getattr(
                            block,
                            "text",
                            None
                        )

                        if text:
                            parts.append(str(text))

                    else:

                        parts.append(
                            str(block)
                        )

                response_text = "".join(parts).strip()

            else:

                response_text = str(content).strip()

            # ------------------------------------------------
            # RESPONSE LENGTH
            # ------------------------------------------------

            logger.info(
                f"[PlannerAgent] Response length: "
                f"{len(response_text)} characters"
            )

            # ------------------------------------------------
            # EMPTY RESPONSE
            # ------------------------------------------------

            if not response_text:

                logger.error(
                    "[PlannerAgent] Groq returned "
                    "an EMPTY response."
                )

                logger.error(
                    f"[PlannerAgent] Full response object: "
                    f"{response}"
                )

                raise ValueError(
                    "Groq returned an empty response. "
                    "The model may have stopped before "
                    "generating content."
                )

            # ------------------------------------------------
            # SHOW FIRST PART FOR DEBUGGING
            # ------------------------------------------------

            logger.info(
                "[PlannerAgent] Response preview:\n"
                + response_text[:3000]
            )

            # ------------------------------------------------
            # PARSE JSON
            # ------------------------------------------------

            plan = self._parse_plan_json(
                response_text
            )

            # ------------------------------------------------
            # VALIDATE
            # ------------------------------------------------

            if not isinstance(plan, dict):

                raise ValueError(
                    "Planner returned invalid JSON object."
                )

            weeks = plan.get("weeks")

            if not weeks:

                raise ValueError(
                    "LLM returned JSON but "
                    "no study plan weeks were found."
                )

            if not isinstance(weeks, list):

                raise ValueError(
                    "'weeks' must be a list."
                )

            logger.info(
                f"[PlannerAgent] Generated initial plan "
                f"with {len(weeks)} weeks"
            )

            return plan

        except Exception as e:

            logger.error(
                f"[PlannerAgent] Failed to generate plan: {e}"
            )

            raise

    # ========================================================
    # REFLEXION LOOP
    # ========================================================

    async def _reflexion_loop(
        self,
        plan: Dict[str, Any],
        profile
    ) -> Dict[str, Any]:

        critique_history = []

        current_plan = plan

        # ----------------------------------------------------
        # TWO ITERATIONS
        # ----------------------------------------------------

        for iteration in range(2):

            logger.info(
                f"[PlannerAgent] "
                f"Critique iteration {iteration + 1}/2"
            )

            critique = await self._critique_plan(
                current_plan,
                profile
            )

            critique_history.append(
                critique.get("summary", "")
            )

            # ------------------------------------------------
            # CHECK IMPROVEMENT
            # ------------------------------------------------

            needs_improvement = critique.get(
                "needs_improvement",
                False
            )

            if not needs_improvement:

                logger.info(
                    "[PlannerAgent] "
                    "Plan passed self-critique."
                )

                break

            # ------------------------------------------------
            # REFINE
            # ------------------------------------------------

            logger.info(
                "[PlannerAgent] Refining study plan..."
            )

            current_plan = await self._refine_plan(
                current_plan,
                critique,
                profile
            )

        # ----------------------------------------------------
        # FINAL CRITIQUE
        # ----------------------------------------------------

        final_critique = await self._generate_final_critique(
            current_plan,
            profile
        )

        current_plan["critique"] = final_critique

        current_plan["critique_history"] = (
            critique_history
        )

        return current_plan

    # ========================================================
    # CRITIQUE PLAN
    # ========================================================

    async def _critique_plan(
        self,
        plan: Dict[str, Any],
        profile
    ) -> Dict[str, Any]:

        plan_json = json.dumps(
            plan,
            indent=2
        )

        profile_context = self._build_profile_context(
            profile
        )

        system_prompt = """
You are an expert educational plan evaluator.

Evaluate the provided 16-week study plan.

Check:

1. Critical knowledge gaps are addressed.
2. Weak learning areas receive sufficient attention.
3. Bloom progression is logical.
4. Prerequisites are respected.
5. Weekly workload is realistic.
6. No week exceeds 20 hours.
7. Tasks are concrete and actionable.
8. Every task contains required metadata.
9. The plan progresses from foundation to advanced skills.
10. The plan contains exactly 16 weeks.

Return ONLY valid JSON.

Required format:

{
  "strengths": [],
  "weaknesses": [],
  "needs_improvement": true,
  "suggestions": [],
  "summary": "..."
}
"""

        user_prompt = f"""
STUDENT PROFILE:

{profile_context}

CURRENT STUDY PLAN:

{plan_json}

Evaluate this plan.
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

                logger.warning(
                    "[PlannerAgent] "
                    "Critique returned empty response."
                )

                return {
                    "strengths": [],
                    "weaknesses": [],
                    "needs_improvement": False,
                    "suggestions": [],
                    "summary": ""
                }

            result = self._parse_json_response(
                response_text
            )

            return result

        except Exception as e:

            logger.error(
                f"[PlannerAgent] Critique failed: {e}"
            )

            return {
                "strengths": [],
                "weaknesses": [],
                "needs_improvement": False,
                "suggestions": [],
                "summary": ""
            }

    # ========================================================
    # REFINE PLAN
    # ========================================================

    async def _refine_plan(
        self,
        plan: Dict[str, Any],
        critique: Dict[str, Any],
        profile
    ) -> Dict[str, Any]:

        plan_json = json.dumps(
            plan,
            indent=2
        )

        critique_json = json.dumps(
            critique,
            indent=2
        )

        profile_context = self._build_profile_context(
            profile
        )

        system_prompt = """
You are an expert educational planner.

Improve the existing study plan based on the critique.

Rules:

- Keep exactly 16 weeks.
- Keep all required fields.
- Address all critical knowledge gaps.
- Preserve useful parts of the original plan.
- Improve weak areas identified by the critique.
- Maintain logical Bloom progression.
- Respect prerequisites.
- Maximum 20 hours per week.
- Keep tasks concrete and actionable.

Return ONLY valid JSON.

Do not use Markdown.
Do not include explanations.
"""

        user_prompt = f"""
STUDENT PROFILE:

{profile_context}

CURRENT PLAN:

{plan_json}

CRITIQUE:

{critique_json}

Return the improved 16-week plan.
"""

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

            logger.warning(
                "[PlannerAgent] "
                "Refinement returned empty response. "
                "Keeping previous plan."
            )

            return plan

        try:

            refined = self._parse_plan_json(
                response_text
            )

            if not refined.get("weeks"):

                logger.warning(
                    "[PlannerAgent] "
                    "Refined plan has no weeks. "
                    "Keeping previous plan."
                )

                return plan

            return refined

        except Exception as e:

            logger.warning(
                f"[PlannerAgent] "
                f"Failed to parse refined plan: {e}"
            )

            return plan

    # ========================================================
    # FINAL CRITIQUE
    # ========================================================

    async def _generate_final_critique(
        self,
        plan: Dict[str, Any],
        profile
    ) -> str:

        plan_json = json.dumps(
            plan,
            indent=2
        )

        prompt = f"""
Provide a concise final critique of this personalized
16-week study plan.

Mention:

- major strengths
- how critical gaps are addressed
- Bloom progression
- workload realism
- expected learning outcome

STUDENT PROFILE:

{self._build_profile_context(profile)}

STUDY PLAN:

{plan_json}

Return a concise paragraph.
"""

        try:

            response = await asyncio.to_thread(
                self.llm.invoke,
                [
                    SystemMessage(
                        content=(
                            "You are an expert "
                            "educational evaluator."
                        )
                    ),
                    HumanMessage(
                        content=prompt
                    ),
                ]
            )

            return self._extract_response_text(
                response
            )

        except Exception as e:

            logger.warning(
                f"[PlannerAgent] "
                f"Final critique failed: {e}"
            )

            return ""

    # ========================================================
    # BUILD PROFILE CONTEXT
    # ========================================================

    def _build_profile_context(
        self,
        profile
    ) -> str:

        # ----------------------------------------------------
        # SAFE CRITICAL GAPS
        # ----------------------------------------------------

        critical_gaps = (
            profile.critical_gaps
            if profile.critical_gaps
            else []
        )

        # ----------------------------------------------------
        # SAFE BLOOM SUMMARY
        # ----------------------------------------------------

        bloom_summary = (
            profile.bloom_summary
            if profile.bloom_summary
            else {}
        )

        # ----------------------------------------------------
        # SAFE LEARNING AREAS
        # ----------------------------------------------------

        learning_area_summary = (
            profile.learning_area_summary
            if profile.learning_area_summary
            else {}
        )

        # ----------------------------------------------------
        # ACCURACY
        # ----------------------------------------------------

        if profile.total_questions:

            accuracy = (
                profile.correct_answers
                / profile.total_questions
                * 100
            )

        else:

            accuracy = 0.0

        return f"""
Mastery Level:
{profile.overall_mastery:.1f}%

Theta (Ability):
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
    # EXTRACT RESPONSE TEXT
    # ========================================================

    def _extract_response_text(
        self,
        response
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

        if isinstance(content, str):

            return content.strip()

        # ----------------------------------------------------
        # LIST
        # ----------------------------------------------------

        if isinstance(content, list):

            parts = []

            for block in content:

                if isinstance(block, str):

                    parts.append(block)

                elif isinstance(block, dict):

                    text = block.get(
                        "text"
                    )

                    if text:

                        parts.append(
                            str(text)
                        )

                elif hasattr(block, "text"):

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

        return str(content).strip()

    # ========================================================
    # PARSE PLAN JSON
    # ========================================================

    def _parse_plan_json(
        self,
        response_text: str
    ) -> Dict[str, Any]:

        if not response_text:

            raise ValueError(
                "LLM returned an empty response."
            )

        text = response_text.strip()

        # ----------------------------------------------------
        # 1. DIRECT JSON
        # ----------------------------------------------------

        try:

            result = json.loads(text)

            if isinstance(result, dict):

                return result

        except json.JSONDecodeError:
            pass

        # ----------------------------------------------------
        # 2. ```json ... ```
        # ----------------------------------------------------

        lower_text = text.lower()

        if "```json" in lower_text:

            start_marker = lower_text.find(
                "```json"
            )

            start = start_marker + len(
                "```json"
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
                        "[PlannerAgent] "
                        f"Markdown JSON parse failed: {e}"
                    )

        # ----------------------------------------------------
        # 3. GENERIC CODE BLOCK
        # ----------------------------------------------------

        if "```" in text:

            first = text.find("```")

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
        # 4. EXTRACT FIRST { ... }
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
                    dict
                ):

                    return result

            except json.JSONDecodeError as e:

                logger.error(
                    "[PlannerAgent] "
                    f"Extracted JSON is invalid: {e}"
                )

                logger.error(
                    "[PlannerAgent] "
                    f"Response was:\n"
                    f"{text[:5000]}"
                )

        # ----------------------------------------------------
        # FAILURE
        # ----------------------------------------------------

        logger.error(
            "[PlannerAgent] "
            "Failed to parse plan JSON."
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
        response_text: str
    ) -> Dict[str, Any]:

        if not response_text:

            return {}

        text = response_text.strip()

        # ----------------------------------------------------
        # DIRECT JSON
        # ----------------------------------------------------

        try:

            result = json.loads(text)

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

            start = start_marker + len(
                "```json"
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

            first = text.find("```")

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
        student_id: str
    ) -> StudyPlan:

        weeks = []

        # ----------------------------------------------------
        # READ WEEKS
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
                        len(weeks) + 1
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
                )
            )

            weeks.append(week)

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
            )
        )