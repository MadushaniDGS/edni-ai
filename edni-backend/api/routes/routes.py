"""
FastAPI Route Handlers (REFACTORED)
====================================

Split diagnostic flow:
1. Fast path: Validate → Diagnostic Agent → Save → Return (< 1 sec)
2. Background: Planner + Remediation + Evaluator (async, non-blocking)

This allows frontend to show results immediately without waiting 1-3 minutes.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from loguru import logger

from db.session import get_db
from db.session import engine as db_engine

from db.models.models import (
    User,
    RefreshToken,
    KnowledgeProfileModel,
    ConceptGap,
    StudyPlanModel,
    Task,
    Notification,
    DiagnosticQuestion,
    EvaluationLog,
    Module,
    UserModule,
    Resource,
)

from api.schemas.schemas import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    LogoutRequest,
    AuthResponse,
    TokenResponse,
    UserOut,
    UpdateUserRequest,
    ChangePasswordRequest,
    DiagnosticSubmitRequest,
    DiagnosticResult,
    KnowledgeProfileOut,
    StudyPlanOut,
    CreateTaskRequest,
    UpdateTaskRequest,
    TaskOut,
    NotificationOut,
    AnalyticsOut,
    ResourceOut,
)

from core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_refresh_token_expiry,
    get_current_user_id,
    CREDENTIALS_EXCEPTION,
)

# Removed: from agents.graph import run_pipeline
# Background pipeline now calls agents directly

# Add this at the top if using api.routes.routes path:
# All existing imports stay the same, just copy this file 
# to: edni-backend/api/routes/routes.py


# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════


def get_state_value(
    state: Any,
    key: str,
    default: Any = None,
) -> Any:
    """
    Safely read a value from either AgentState or dict.
    """
    if isinstance(state, dict):
        return state.get(key, default)

    return getattr(state, key, default)


def _issue_tokens(user_id: str, email: str) -> dict:
    payload = {
        "sub": user_id,
        "email": email,
    }

    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
    }


# ══════════════════════════════════════════════════════════════════════════════
# BACKGROUND TASK: PLANNER + REMEDIATION + EVALUATOR
# ══════════════════════════════════════════════════════════════════════════════


async def _run_background_pipeline(
    student_id: str,
    session_id: str,
    profile_id: str,
    raw_responses: list[dict],
    feedback_cycle: int,
) -> None:
    logger.info(
        f"[BackgroundPipeline] Starting for "
        f"student={student_id} | "
        f"profile={profile_id}"
    )

    try:
        async with AsyncSession(db_engine) as db:

            # ==========================================================
            # 1. Load the saved knowledge profile
            # ==========================================================

            profile = await db.scalar(
                select(KnowledgeProfileModel)
                .where(
                    KnowledgeProfileModel.id == profile_id
                )
            )

            if not profile:
                logger.error(
                    f"[BackgroundPipeline] Profile not found: {profile_id}"
                )
                return

            logger.info(
                f"[BackgroundPipeline] Profile loaded: "
                f"{profile.id}"
            )

            # ==========================================================
            # 2. Create Agent State
            # ==========================================================

            from agents.state import AgentState

            initial_state = AgentState(
                student_id=student_id,
                session_id=session_id,
                raw_responses=raw_responses,
                feedback_cycle=feedback_cycle,
                knowledge_profile=profile,
                diagnostic_complete=True,
            )

            # ==========================================================
            # 3. Import Agents
            # ==========================================================

            try:
                from agents.planner_agent import PlannerAgent
            except ImportError as e:
                logger.error(
                    f"[BackgroundPipeline] PlannerAgent import failed: {e}"
                )
                return

            try:
                from agents.remediation_agent import RemediationAgent
            except ImportError as e:
                logger.error(
                    f"[BackgroundPipeline] RemediationAgent import failed: {e}"
                )
                return

            try:
                from agents.evaluator_agent import EvaluatorAgent
            except ImportError as e:
                logger.error(
                    f"[BackgroundPipeline] EvaluatorAgent import failed: {e}"
                )
                return

            # ==========================================================
            # 4. Initialize Agents
            # ==========================================================

            planner = PlannerAgent()
            remediation = RemediationAgent()
            evaluator = EvaluatorAgent()

            # ==========================================================
            # 5. Run Planner Agent
            # ==========================================================

            logger.info(
                "[BackgroundPipeline] Running PlannerAgent..."
            )

            state = await planner.run(initial_state)

            if not state.study_plan:
                logger.warning(
                    "[BackgroundPipeline] PlannerAgent failed. "
                    "Skipping next agents."
                )
                return

            logger.info(
                "[BackgroundPipeline] PlannerAgent completed successfully."
            )

            # ==========================================================
            # 6. Run Remediation Agent
            # ==========================================================

            logger.info(
                "[BackgroundPipeline] Running RemediationAgent..."
            )

            state = await remediation.run(state)

            logger.info(
                "[BackgroundPipeline] RemediationAgent completed."
            )

            # ==========================================================
            # 7. Find Previous Knowledge Profile
            # ==========================================================

            previous_profile = await db.scalar(
                select(KnowledgeProfileModel)
                .where(
                    KnowledgeProfileModel.user_id == student_id,
                    KnowledgeProfileModel.id != profile_id,
                )
                .order_by(
                    KnowledgeProfileModel.created_at.desc()
                )
            )

            logger.info(
                f"[BackgroundPipeline] Previous profile: "
                f"{previous_profile.id if previous_profile else 'None'}"
            )

            # ==========================================================
            # 8. Run Evaluator Agent
            # ==========================================================

            logger.info(
                "[BackgroundPipeline] Running EvaluatorAgent..."
            )

            state = await evaluator.run(
                state,
                previous_profile=previous_profile,
            )

            logger.info(
                "[BackgroundPipeline] EvaluatorAgent completed."
            )

            # ==========================================================
            # 9. Save Study Plan
            # ==========================================================

            study_plan = state.study_plan

            if study_plan:

                logger.info(
                    f"[StudyPlan Save] Saving plan "
                    f"{study_plan.plan_id} "
                    f"for profile {profile_id}"
                )

                existing_plan = await db.scalar(
                    select(StudyPlanModel)
                    .where(
                        StudyPlanModel.user_id == student_id,
                        StudyPlanModel.profile_id == profile_id,
                    )
                    .order_by(
                        StudyPlanModel.created_at.desc()
                    )
                )

                # ------------------------------------------------------
                # Convert weeks into JSON-safe data
                # ------------------------------------------------------

                weeks_data = []

                for week in study_plan.weeks:

                    week_data = {
                        "week_number": week.week_number,
                        "theme": week.theme,
                        "concepts": week.concepts,
                        "bloom_focus": week.bloom_focus,
                        "hours": week.hours,
                        "tasks": week.tasks,
                        "priority": week.priority,
                        "milestone": week.milestone,
                    }

                    weeks_data.append(week_data)

                # ------------------------------------------------------
                # Update existing plan
                # ------------------------------------------------------

                if existing_plan:

                    logger.info(
                        f"[StudyPlan Save] Updating existing plan "
                        f"{existing_plan.id}"
                    )

                    existing_plan.weeks = weeks_data
                    existing_plan.total_hours = study_plan.total_hours
                    existing_plan.critique = state.plan_critique
                    existing_plan.version = study_plan.version
                    existing_plan.is_active = True

                # ------------------------------------------------------
                # Create new plan
                # ------------------------------------------------------

                else:

                    logger.info(
                        f"[StudyPlan Save] Creating new plan "
                        f"{study_plan.plan_id}"
                    )

                    new_plan = StudyPlanModel(
                        id=study_plan.plan_id,
                        user_id=student_id,
                        profile_id=profile_id,
                        weeks=weeks_data,
                        total_hours=study_plan.total_hours,
                        critique=state.plan_critique,
                        version=study_plan.version,
                        is_active=True,
                    )

                    db.add(new_plan)

                # ======================================================
                # 10. Save Tasks
                # ======================================================

                for week in study_plan.weeks:

                    for task_data in week.tasks:

                        if not isinstance(task_data, dict):
                            continue

                        if not task_data.get("activity"):
                            continue

                        duration_hours = float(
                            task_data.get("hours", 1)
                        )

                        task = Task(
                            user_id=student_id,

                            course=task_data.get(
                                "learning_area",
                                task_data.get(
                                    "concept",
                                    "Study"
                                ),
                            ),

                            title=task_data.get(
                                "activity",
                                "Study task"
                            ),

                            duration=int(
                                duration_hours * 60
                            ),

                            bloom=task_data.get(
                                "bloom_level",
                                "Apply"
                            ),

                            bloom_level=3,

                            concept=task_data.get(
                                "concept"
                            ),

                            learning_area=task_data.get(
                                "learning_area"
                            ),

                            column=(
                                "UPCOMING"
                                if week.week_number > 2
                                else "WEEK"
                                if week.week_number > 0
                                else "TODAY"
                            ),

                            week_number=week.week_number,
                        )

                        db.add(task)

                logger.info(
                    f"[StudyPlan Save] Plan contains "
                    f"{len(study_plan.weeks)} weeks"
                )

            else:

                logger.warning(
                    f"[StudyPlan Save] No study plan returned by "
                    f"PlannerAgent | "
                    f"student_id={student_id} | "
                    f"profile_id={profile_id}"
                )

            # ==========================================================
            # 11. Save Evaluation Log
            # ==========================================================

            evaluation_log = EvaluationLog(
                user_id=student_id,
                profile_id=profile_id,
                feedback_cycle=feedback_cycle,
                mastery_before=float(
                    profile.overall_mastery
                ),
                mastery_after=float(
                    profile.overall_mastery
                ),
                mastery_delta=state.mastery_delta,
                plateau_detected=state.plateau_detected,
                evaluation_notes=state.evaluation_notes,
                bloom_deltas={},
            )

            db.add(evaluation_log)

            # ==========================================================
            # 12. Commit Everything
            # ==========================================================

            await db.commit()

            logger.success(
                f"[BackgroundPipeline] Complete for "
                f"student={student_id} | "
                f"plan_id="
                f"{study_plan.plan_id if study_plan else 'N/A'}"
            )

    except Exception as exc:

        logger.exception(
            f"[BackgroundPipeline] Pipeline failed: {exc}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

auth_router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@auth_router.post(
    "/register",
    response_model=AuthResponse,
    status_code=201,
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(User).where(User.email == body.email)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered.",
        )

    user_id = str(uuid.uuid4())

    user = User(
        id=user_id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        password_hash=hash_password(body.password),
        institution=body.institution,
        degree=body.degree,
        year_of_study=body.year_of_study,
    )

    db.add(user)

    # Welcome notifications
    notifications = [
        Notification(
            user_id=user_id,
            icon="🎉",
            title="Welcome to Edni AI!",
            desc="Start with the Diagnostic Assessment to map your knowledge.",
            time="Just now",
        ),
        Notification(
            user_id=user_id,
            icon="📊",
            title="Take your first diagnostic",
            desc="The assessment maps gaps across Bloom's Taxonomy levels.",
            time="Just now",
        ),
    ]

    for notification in notifications:
        db.add(notification)

    await db.flush()

    tokens = _issue_tokens(
        user_id,
        body.email,
    )

    db.add(
        RefreshToken(
            id=str(uuid.uuid4()),
            token=tokens["refresh_token"],
            user_id=user_id,
            expires_at=get_refresh_token_expiry(),
        )
    )

    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        user=UserOut.model_validate(user),
        **tokens,
        token_type="bearer",
    )


@auth_router.post(
    "/login",
    response_model=AuthResponse,
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(
        select(User).where(User.email == body.email)
    )

    if not user or not verify_password(
        body.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    tokens = _issue_tokens(
        user.id,
        user.email,
    )

    db.add(
        RefreshToken(
            id=str(uuid.uuid4()),
            token=tokens["refresh_token"],
            user_id=user.id,
            expires_at=get_refresh_token_expiry(),
        )
    )

    await db.commit()

    return AuthResponse(
        user=UserOut.model_validate(user),
        **tokens,
        token_type="bearer",
    )


@auth_router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    stored = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token
        )
    )

    if not stored or stored.expires_at < datetime.utcnow():
        raise CREDENTIALS_EXCEPTION

    user = await db.get(
        User,
        stored.user_id,
    )

    if not user:
        raise CREDENTIALS_EXCEPTION

    await db.delete(stored)

    tokens = _issue_tokens(
        user.id,
        user.email,
    )

    db.add(
        RefreshToken(
            id=str(uuid.uuid4()),
            token=tokens["refresh_token"],
            user_id=user.id,
            expires_at=get_refresh_token_expiry(),
        )
    )

    await db.commit()

    return TokenResponse(**tokens)


@auth_router.post(
    "/logout",
    status_code=204,
)
async def logout(
    body: LogoutRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.user_id == user_id,
        )
    )

    await db.commit()

    return None


# ══════════════════════════════════════════════════════════════════════════════
# USER ROUTES
# ══════════════════════════════════════════════════════════════════════════════

user_router = APIRouter(
    prefix="/user",
    tags=["User"],
)


@user_router.get(
    "/auth/me",
    response_model=UserOut,
)
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(
        User,
        user_id,
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return UserOut.model_validate(user)


@user_router.put(
    "/auth/me",
    response_model=UserOut,
)
async def update_me(
    body: UpdateUserRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(
        User,
        user_id,
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    for field, value in body.model_dump(
        exclude_none=True
    ).items():
        setattr(
            user,
            field,
            value,
        )

    await db.commit()
    await db.refresh(user)

    return UserOut.model_validate(user)


@user_router.put(
    "/password",
    status_code=200,
)
async def change_password(
    body: ChangePasswordRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(
        User,
        user_id,
    )

    if not user or not verify_password(
        body.current_password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect.",
        )

    user.password_hash = hash_password(
        body.new_password
    )

    await db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user_id
        )
    )

    await db.commit()

    return {
        "message": "Password updated. Please log in again."
    }


# ══════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC ROUTES (REFACTORED)
# ══════════════════════════════════════════════════════════════════════════════

diagnostic_router = APIRouter(
    prefix="/diagnostic",
    tags=["Diagnostic"],
)


@diagnostic_router.get("/questions")
async def get_questions(
    learning_area: Optional[str] = None,
    bloom_level: Optional[int] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """
    Return questions for the adaptive diagnostic assessment.
    
    Query params:
    - learning_area: Filter by area (e.g., "Database Systems")
    - bloom_level: Filter by Bloom level (1-6)
    - limit: Number of questions (default 10, max 100)
    """

    # Validate limit
    limit = max(1, min(limit, 100))

    query = select(DiagnosticQuestion).where(
        DiagnosticQuestion.is_active == True
    )

    # Map area IDs to actual learning area names
    area_mapping = {
        'data-structures-algorithms': 'Data Structures and Algorithms',
        'software-quality-assurance': 'Software Quality Assurance',
        'software-engineering': 'Software Engineering',
        'database-systems': 'Database Systems',
        'programming-languages': 'Programming Languages',
    }

    # Filter by learning area if provided
    if learning_area:
        # Convert ID to actual name if it's an ID
        actual_area = area_mapping.get(learning_area, learning_area)
        
        query = query.where(
            DiagnosticQuestion.learning_area == actual_area
        )
        
        logger.info(f"[DiagnosticQuestions] Filtering by area: {actual_area}")

    # Filter by bloom level if provided
    if bloom_level:
        query = query.where(
            DiagnosticQuestion.bloom_level == bloom_level
        )

    # Random order + limit
    query = query.order_by(func.random()).limit(limit)

    results = await db.scalars(query)
    questions = results.all()

    logger.info(f"[DiagnosticQuestions] Returned {len(questions)} questions (limit={limit}, area={learning_area})")

    return {
        "questions": [
            {
                "id": qs.id,
                "topic": qs.topic,
                "learning_area": qs.learning_area,
                "bloom_level": qs.bloom_level,
                "bloom_label": qs.bloom_label,
                "difficulty": qs.difficulty,
                "question_text": qs.title,
                "title": qs.title,
                "subtitle": qs.subtitle,
                "code": qs.code,
                "options": qs.options,
                "correct": qs.correct,
                "explanation": qs.explanation,
                "irt_a": qs.irt_a,
                "irt_b": qs.irt_b,
                "irt_c": qs.irt_c,
            }
            for qs in questions
        ],
        "total": len(questions),
    }


@diagnostic_router.post(
    "/submit",
    response_model=DiagnosticResult,
)
async def submit_diagnostic(
    body: DiagnosticSubmitRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    REFACTORED: Fast diagnostic + background pipeline.

    FAST PATH (< 1 second):
        1. Validate answers
        2. Run DiagnosticAgent only
        3. Save KnowledgeProfile + ConceptGaps
        4. Return result immediately

    BACKGROUND (no waiting):
        5. Run Planner + Remediation + Evaluator
        6. Save StudyPlan + Tasks
        7. Handle errors gracefully
    """

    if not body.answers:
        raise HTTPException(
            status_code=400,
            detail="No diagnostic answers were submitted.",
        )

    # ══════════════════════════════════════════════════════════════════════════
    # FAST PATH: Diagnostic only
    # ══════════════════════════════════════════════════════════════════════════

    # ──────────────────────────────────────────────────────────────────────
    # 1. Fetch questions
    # ──────────────────────────────────────────────────────────────────────

    try:
        question_ids = [
            int(question_id)
            for question_id in body.answers.keys()
        ]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid question ID.",
        )

    results = await db.scalars(
        select(DiagnosticQuestion).where(
            DiagnosticQuestion.id.in_(question_ids)
        )
    )

    questions = {
        question.id: question
        for question in results.all()
    }

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="No valid diagnostic questions found.",
        )

    # ──────────────────────────────────────────────────────────────────────
    # 2. Get previous knowledge profile
    # ──────────────────────────────────────────────────────────────────────

    last_profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(
            KnowledgeProfileModel.user_id == user_id
        )
        .order_by(
            KnowledgeProfileModel.created_at.desc()
        )
    )

    feedback_cycle = (
        last_profile.feedback_cycle + 1
        if last_profile
        else 0
    )

    # ──────────────────────────────────────────────────────────────────────
    # 3. Build raw responses
    # ──────────────────────────────────────────────────────────────────────

    raw_responses = []

    for question_id_str, selected in body.answers.items():

        question_id = int(question_id_str)

        question = questions.get(question_id)

        if not question:
            continue

        selected_normalized = str(
            selected
        ).strip().lower()

        correct_normalized = str(
            question.correct
        ).strip().lower()

        raw_responses.append(
            {
                "question_id": question.id,
                "concept": question.topic,
                "learning_area": question.learning_area,
                "bloom_level": question.bloom_level,

                "irt_a": question.irt_a,
                "irt_b": question.irt_b,
                "irt_c": question.irt_c,

                "selected_option": selected_normalized,
                "correct_option": correct_normalized,
            }
        )

    if not raw_responses:
        raise HTTPException(
            status_code=400,
            detail="No valid answers were submitted.",
        )

    # ──────────────────────────────────────────────────────────────────────
    # 4. Run ONLY DiagnosticAgent (fast)
    # ──────────────────────────────────────────────────────────────────────

    session_id = str(uuid.uuid4())

    logger.info(
        f"[API] Fast path: Running diagnostic only | "
        f"user={user_id} | "
        f"session={session_id} | "
        f"cycle={feedback_cycle}"
    )

    try:

        from agents.state import AgentState
        from agents.diagnostic_agent import DiagnosticAgent

        diagnostic_agent = DiagnosticAgent()

        state = AgentState(
            student_id=user_id,
            session_id=session_id,
            raw_responses=raw_responses,
            feedback_cycle=feedback_cycle,
        )

        state = await diagnostic_agent.run(state)

        if state.errors:
            logger.error(
                f"[API] Diagnostic errors: {state.errors}"
            )

            raise HTTPException(
                status_code=500,
                detail=f"Diagnostic failed: {state.errors[0]}",
            )

    except Exception as exc:

        logger.exception(
            f"[API] Diagnostic agent failed: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Diagnostic pipeline failed: {str(exc)}",
        )

    # ──────────────────────────────────────────────────────────────────────
    # 5. Safe state extraction
    # ──────────────────────────────────────────────────────────────────────

    profile = get_state_value(
        state,
        "knowledge_profile",
    )

    if not profile:
        errors = get_state_value(
            state,
            "errors",
            [],
        )

        logger.error(
            f"[API] Diagnostic returned no profile. "
            f"Errors: {errors}"
        )

        raise HTTPException(
            status_code=500,
            detail="Diagnostic pipeline completed without producing a knowledge profile.",
        )

    # ──────────────────────────────────────────────────────────────────────
    # 6. Persist KnowledgeProfile (fast)
    # ──────────────────────────────────────────────────────────────────────

    profile_id = str(uuid.uuid4())

    concept_profiles = []

    for cp in profile.concepts:

        bloom_results = {}

        for level, result in cp.bloom_results.items():

            bloom_results[str(level)] = {
                "bloom_label": result.bloom_label,
                "theta": result.theta,
                "mastery": result.mastery,
                "gap_severity": result.gap_severity,
                "questions_seen": result.questions_seen,
                "correct": result.correct,
            }

        concept_profiles.append(
            {
                "concept": cp.concept,
                "learning_area": cp.learning_area,
                "overall_mastery": cp.overall_mastery,
                "highest_gap_severity": cp.highest_gap_severity,
                "prerequisite_gap": cp.prerequisite_gap,
                "bloom_results": bloom_results,
            }
        )

    db.add(
        KnowledgeProfileModel(
            id=profile_id,
            user_id=user_id,
            diagnostic_id=profile.diagnostic_id,
            feedback_cycle=profile.feedback_cycle,

            overall_theta=profile.overall_theta,
            overall_mastery=profile.overall_mastery,

            critical_gaps=profile.critical_gaps,

            bloom_summary={
                str(k): v
                for k, v in profile.bloom_summary.items()
            },

            learning_area_summary=profile.learning_area_summary,

            concept_profiles=concept_profiles,

            total_questions=profile.total_questions,
            correct_answers=profile.correct_answers,
            diagnostic_time_sec=profile.diagnostic_time_sec,

            raw_responses=raw_responses,
        )
    )

    # ──────────────────────────────────────────────────────────────────────
    # 7. Persist ConceptGaps (fast)
    # ──────────────────────────────────────────────────────────────────────

    for cp in profile.concepts:

        for bloom_level, result in cp.bloom_results.items():

            db.add(
                ConceptGap(
                    profile_id=profile_id,
                    user_id=user_id,

                    concept=cp.concept,
                    learning_area=cp.learning_area,

                    bloom_level=bloom_level,
                    bloom_label=result.bloom_label,

                    theta=result.theta,
                    mastery=result.mastery,

                    gap_severity=result.gap_severity,

                    questions_seen=result.questions_seen,
                    correct=result.correct,

                    overall_mastery=cp.overall_mastery,
                    prerequisite_gap=cp.prerequisite_gap,

                    remediation_priority=cp.remediation_priority,
                )
            )

    # ──────────────────────────────────────────────────────────────────────
    # 8. Update module progress (fast)
    # ──────────────────────────────────────────────────────────────────────

    if profile.learning_area_summary:

        for area_label, mastery in (
            profile.learning_area_summary.items()
        ):

            module = await db.scalar(
                select(Module).where(
                    Module.label == area_label,
                    Module.is_active == True,
                )
            )

            if not module:

                slug_map = {
                    "Foundations & Programming Basics":
                        "foundations",

                    "Data Structures":
                        "data-structures",

                    "Algorithms & Complexity":
                        "algorithms",

                    "Object-Oriented Programming":
                        "oop",

                    "Databases & SQL":
                        "databases",

                    "Operating Systems & Networks":
                        "os-networks",

                    "Software Engineering":
                        "software-engineering",

                    "Machine Learning & AI":
                        "ml-ai",

                    "Web Development":
                        "web-development",
                }

                slug = slug_map.get(area_label)

                if slug:

                    module = await db.scalar(
                        select(Module).where(
                            Module.slug == slug,
                            Module.is_active == True,
                        )
                    )

            if not module:
                continue

            progress_value = float(mastery)

            if progress_value >= 88:
                module_status = "COMPLETED"
            elif progress_value > 0:
                module_status = "IN_PROGRESS"
            else:
                module_status = "NOT_STARTED"

            existing_user_module = await db.scalar(
                select(UserModule).where(
                    UserModule.user_id == user_id,
                    UserModule.module_id == module.id,
                )
            )

            now = datetime.utcnow()

            if existing_user_module:

                existing_user_module.progress = (
                    progress_value
                )

                existing_user_module.status = (
                    module_status
                )

                existing_user_module.updated_at = now

                if (
                    module_status == "IN_PROGRESS"
                    and not existing_user_module.started_at
                ):
                    existing_user_module.started_at = now

                if (
                    module_status == "COMPLETED"
                    and not existing_user_module.completed_at
                ):
                    existing_user_module.completed_at = now

            else:

                db.add(
                    UserModule(
                        user_id=user_id,
                        module_id=module.id,

                        progress=progress_value,
                        status=module_status,

                        started_at=(
                            now
                            if progress_value > 0
                            else None
                        ),

                        completed_at=(
                            now
                            if module_status == "COMPLETED"
                            else None
                        ),
                    )
                )

    # ──────────────────────────────────────────────────────────────────────
    # 9. Notification (fast)
    # ──────────────────────────────────────────────────────────────────────

    db.add(
        Notification(
            user_id=user_id,
            icon="📊",

            title=(
                f"Diagnostic Complete "
                f"(Cycle {profile.feedback_cycle})"
            ),

            desc=(
                f"Mastery: "
                f"{profile.overall_mastery:.1f}% | "
                f"Critical gaps: "
                f"{len(profile.critical_gaps)} | "
                f"Study plan generating in background..."
            ),

            time="Just now",
        )
    )

    # ──────────────────────────────────────────────────────────────────────
    # 10. Commit FAST PATH
    # ──────────────────────────────────────────────────────────────────────

    try:
        await db.commit()

    except Exception as exc:

        await db.rollback()

        logger.exception(
            f"[API] Database commit failed: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to save diagnostic results.",
        )

    logger.success(
        f"[API] Fast path complete (< 1 sec) | "
        f"user={user_id} | "
        f"profile={profile_id} | "
        f"mastery={profile.overall_mastery:.1f}%"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # BACKGROUND TASKS: Planner + Remediation + Evaluator
    # ══════════════════════════════════════════════════════════════════════════

    # Queue background tasks (frontend doesn't wait)
    background_tasks.add_task(
        _run_background_pipeline,
        student_id=user_id,
        session_id=session_id,
        profile_id=profile_id,
        raw_responses=raw_responses,
        feedback_cycle=feedback_cycle,
    )

    logger.info(
        f"[API] Queued background pipeline | "
        f"user={user_id} | "
        f"profile={profile_id}"
    )

    # ══════════════════════════════════════════════════════════════════════════
    # RETURN IMMEDIATELY
    # ══════════════════════════════════════════════════════════════════════════

    concepts_response = []

    for cp in profile.concepts:

        bloom_results = {
            str(level): result.__dict__
            for level, result in cp.bloom_results.items()
        }

        concepts_response.append(
            {
                "concept": cp.concept,
                "learning_area": cp.learning_area,

                "bloom_results": bloom_results,

                "overall_mastery": cp.overall_mastery,

                "highest_gap_level":
                    cp.highest_gap_level,

                "highest_gap_severity":
                    cp.highest_gap_severity,

                "prerequisite_gap":
                    cp.prerequisite_gap,

                "remediation_priority":
                    cp.remediation_priority,
            }
        )

    return DiagnosticResult(
        knowledge_profile=KnowledgeProfileOut(

            student_id=profile.student_id,

            diagnostic_id=profile.diagnostic_id,

            concepts=concepts_response,

            overall_theta=profile.overall_theta,

            overall_mastery=profile.overall_mastery,

            critical_gaps=profile.critical_gaps,

            bloom_summary={
                str(k): v
                for k, v in profile.bloom_summary.items()
            },

            learning_area_summary=(
                profile.learning_area_summary
            ),

            total_questions=profile.total_questions,

            correct_answers=profile.correct_answers,

            diagnostic_time_sec=(
                profile.diagnostic_time_sec
            ),

            feedback_cycle=profile.feedback_cycle,
        ),

        study_plan_id=None,  # Will be available after background task completes

        resources_count=0,  # Will be available after background task completes

        evaluation_notes="Study plan and resources are being prepared in the background...",

        mastery_delta=0.0,

        plateau_detected=False,

        feedback_cycle=profile.feedback_cycle,
    )

# ══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE PROFILE ROUTES
# ══════════════════════════════════════════════════════════════════════════════

knowledge_profile_router = APIRouter(
    prefix="/knowledge-profile",
    tags=["Knowledge Profile"],
)


@knowledge_profile_router.get("")
async def get_knowledge_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the latest knowledge profile for the authenticated student.
    """

    profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(
            KnowledgeProfileModel.user_id == user_id
        )
        .order_by(
            KnowledgeProfileModel.created_at.desc()
        )
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No knowledge profile found. Complete the diagnostic first.",
        )

    return {
        "id": profile.id,
        "student_id": user_id,
        "diagnostic_id": profile.diagnostic_id,
        "feedback_cycle": profile.feedback_cycle,

        # Overall
        "overall_theta": profile.overall_theta,
        "overall_mastery": profile.overall_mastery,

        # Bloom
        "bloom_summary": profile.bloom_summary or {},

        # Learning areas
        "learning_area_summary": (
            profile.learning_area_summary or {}
        ),

        # Critical gaps
        "critical_gaps": profile.critical_gaps or [],

        # Concept-level profile
        "concept_profiles": (
            profile.concept_profiles or []
        ),

        # Statistics
        "total_questions": profile.total_questions,
        "correct_answers": profile.correct_answers,
        "diagnostic_time_sec": profile.diagnostic_time_sec,

        "created_at": (
            profile.created_at.isoformat()
            if profile.created_at
            else None
        ),
    }

# ══════════════════════════════════════════════════════════════════════════════
# STUDY PLAN ROUTES
# ══════════════════════════════════════════════════════════════════════════════

planner_router = APIRouter(
    prefix="/study-plan",
    tags=["Study Plan"],
)


@planner_router.get(
    "/planner",
)
async def get_active_plan(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the study plan for the latest Knowledge Profile."""

    # Get the latest knowledge profile
    latest_profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(
            KnowledgeProfileModel.user_id == user_id,
        )
        .order_by(
            KnowledgeProfileModel.created_at.desc()
        )
    )

    if not latest_profile:
        raise HTTPException(
            status_code=404,
            detail=(
                "No knowledge profile found. "
                "Complete the diagnostic first."
            ),
        )

    # Get the plan belonging to that profile
    plan = await db.scalar(
        select(StudyPlanModel)
        .where(
            StudyPlanModel.user_id == user_id,
            StudyPlanModel.profile_id == latest_profile.id,
        )
        .order_by(
            StudyPlanModel.created_at.desc()
        )
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail=(
                "Study plan is still being generated. "
                "Please try again shortly."
            ),
        )

    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "profile_id": plan.profile_id,
        "weeks": plan.weeks or [],
        "total_hours": plan.total_hours or 0,
        "critique": plan.critique or "",
        "version": plan.version or 1,
        "created_at": (
            plan.created_at.isoformat()
            if plan.created_at
            else None
        ),
    }


@planner_router.get(
    "/debug/plans",
)
async def debug_get_all_plans(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Debug: Get all study plans for user"""

    plans = (
        await db.scalars(
            select(StudyPlanModel)
            .where(
                StudyPlanModel.user_id == user_id,
            )
            .order_by(
                StudyPlanModel.created_at.desc()
            )
        )
    ).all()

    return {
        "count": len(plans),
        "plans": [
            {
                "id": p.id,
                "profile_id": p.profile_id,
                "created_at": (
                    p.created_at.isoformat()
                    if p.created_at
                    else None
                ),
                "weeks_count": len(p.weeks) if p.weeks else 0,
                "total_hours": p.total_hours or 0,
                "version": p.version or 1,
                "is_active": p.is_active,
            }
            for p in plans
        ],
    }


@planner_router.get(
    "/week/{week_number}"
)
async def get_week(
    week_number: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.scalar(
        select(StudyPlanModel)
        .where(
            StudyPlanModel.user_id == user_id,
            StudyPlanModel.is_active == True,
        )
        .order_by(
            StudyPlanModel.created_at.desc()
        )
    )

    if not plan:
        raise HTTPException(
            status_code=404,
            detail="No active study plan found.",
        )

    week = next(
        (
            week
            for week in plan.weeks
            if week["week_number"] == week_number
        ),
        None,
    )

    if not week:
        raise HTTPException(
            status_code=404,
            detail=f"Week {week_number} not found.",
        )

    return week


# ══════════════════════════════════════════════════════════════════════════════
# TASK ROUTES
# ══════════════════════════════════════════════════════════════════════════════

tasks_router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"],
)


@tasks_router.get("/")
async def get_tasks(
    column: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).where(
        Task.user_id == user_id
    )

    if column:
        query = query.where(
            Task.column == column.upper()
        )

    results = await db.scalars(
        query.order_by(
            Task.created_at.desc()
        )
    )

    tasks = results.all()

    return {
        "today": [
            TaskOut.model_validate(task)
            for task in tasks
            if task.column == "TODAY"
        ],

        "week": [
            TaskOut.model_validate(task)
            for task in tasks
            if task.column == "WEEK"
        ],

        "upcoming": [
            TaskOut.model_validate(task)
            for task in tasks
            if task.column == "UPCOMING"
        ],
    }


@tasks_router.post(
    "/",
    response_model=TaskOut,
    status_code=201,
)
async def create_task(
    body: CreateTaskRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        user_id=user_id,
        **body.model_dump(),
    )

    db.add(task)

    await db.commit()
    await db.refresh(task)

    return TaskOut.model_validate(task)


@tasks_router.put(
    "/{task_id}",
    response_model=TaskOut,
)
async def update_task(
    task_id: int,
    body: UpdateTaskRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = await db.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == user_id,
        )
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    for field, value in body.model_dump(
        exclude_none=True
    ).items():
        setattr(
            task,
            field,
            value,
        )

    await db.commit()
    await db.refresh(task)

    return TaskOut.model_validate(task)


@tasks_router.delete(
    "/{task_id}",
    status_code=204,
)
async def delete_task(
    task_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = await db.scalar(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == user_id,
        )
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task not found.",
        )

    await db.delete(task)
    await db.commit()

    return None


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION ROUTES
# ══════════════════════════════════════════════════════════════════════════════

notif_router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@notif_router.get(
    "",
    response_model=list[NotificationOut],
)
async def get_notifications(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    results = await db.scalars(
        select(Notification)
        .where(
            Notification.user_id == user_id
        )
        .order_by(
            Notification.created_at.desc()
        )
        .limit(50)
    )

    return [
        NotificationOut.model_validate(
            notification
        )
        for notification in results.all()
    ]


@notif_router.put(
    "/{notif_id}/read",
    status_code=200,
)
async def mark_read(
    notif_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.id == notif_id,
            Notification.user_id == user_id,
        )
        .values(
            unread=False
        )
    )

    await db.commit()

    return {
        "message": "Marked as read."
    }


@notif_router.put(
    "/read-all",
    status_code=200,
)
async def mark_all_read(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id
        )
        .values(
            unread=False
        )
    )

    await db.commit()

    return {
        "message": "All marked as read."
    }


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ROUTES
# ══════════════════════════════════════════════════════════════════════════════

analytics_router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@analytics_router.get(
    "",
    response_model=AnalyticsOut,
)
async def get_analytics(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    profiles_result = await db.scalars(
        select(KnowledgeProfileModel)
        .where(
            KnowledgeProfileModel.user_id == user_id
        )
        .order_by(
            KnowledgeProfileModel.created_at.desc()
        )
        .limit(10)
    )

    profiles = profiles_result.all()

    # ──────────────────────────────────────────────────────────────────────
    # Module progress
    # ──────────────────────────────────────────────────────────────────────

    user_modules_result = await db.scalars(
        select(UserModule)
        .join(
            Module,
            UserModule.module_id == Module.id
        )
        .where(
            UserModule.user_id == user_id
        )
        .order_by(
            Module.order
        )
    )

    user_modules = user_modules_result.all()

    modules_out = []

    for user_module in user_modules:

        module = await db.get(
            Module,
            user_module.module_id
        )

        if not module:
            continue

        modules_out.append(
            {
                "id": module.slug,
                "label": module.label,
                "icon": module.icon,
                "icon_bg": module.icon_bg,
                "icon_color": module.icon_color,

                "progress": round(
                    user_module.progress,
                    1,
                ),

                "status": user_module.status,
            }
        )

    # ──────────────────────────────────────────────────────────────────────
    # No diagnostic yet
    # ──────────────────────────────────────────────────────────────────────

    if not profiles:

        return AnalyticsOut(
            overall_mastery=0,
            overall_theta=0,

            bloom_summary={},
            learning_area_summary={},

            critical_gaps=[],

            feedback_cycle=0,

            diagnostic_history=[],
            concept_progress=[],

            modules=modules_out,

            weekly_hours=[
                {
                    "day": day,
                    "hours": 0,
                }
                for day in [
                    "M",
                    "T",
                    "W",
                    "T",
                    "F",
                    "S",
                    "S",
                ]
            ],
        )

    # ──────────────────────────────────────────────────────────────────────
    # Latest profile
    # ──────────────────────────────────────────────────────────────────────

    latest = profiles[0]

    return AnalyticsOut(

        overall_mastery=latest.overall_mastery,

        overall_theta=latest.overall_theta,

        bloom_summary=latest.bloom_summary,

        learning_area_summary=(
            latest.learning_area_summary
        ),

        critical_gaps=latest.critical_gaps,

        feedback_cycle=latest.feedback_cycle,

        diagnostic_history=[
            {
                "mastery": profile.overall_mastery,
                "theta": profile.overall_theta,
                "cycle": profile.feedback_cycle,
                "date": profile.created_at.isoformat(),
            }
            for profile in profiles
        ],

        concept_progress=[
            {
                "concept": concept["concept"],
                "mastery": concept["overall_mastery"],
                "severity": concept[
                    "highest_gap_severity"
                ],
                "area": concept["learning_area"],
            }
            for concept in latest.concept_profiles
        ],

        modules=modules_out,

        weekly_hours=[
            {
                "day": day,
                "hours": 0,
            }
            for day in [
                "M",
                "T",
                "W",
                "T",
                "F",
                "S",
                "S",
            ]
        ],
    )


# ══════════════════════════════════════════════════════════════════════════════
# MODULE ROUTES
# ══════════════════════════════════════════════════════════════════════════════

modules_router = APIRouter(
    prefix="/modules",
    tags=["Modules"],
)


@modules_router.get("/")
async def get_modules(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all active modules with current user's progress.
    """

    modules_result = await db.scalars(
        select(Module)
        .where(
            Module.is_active == True
        )
        .order_by(
            Module.order
        )
    )

    all_modules = modules_result.all()

    user_progress_result = await db.scalars(
        select(UserModule).where(
            UserModule.user_id == user_id
        )
    )

    user_progress = {
        user_module.module_id: user_module
        for user_module in user_progress_result.all()
    }

    result = []

    for module in all_modules:

        user_module = user_progress.get(
            module.id
        )

        result.append(
            {
                "id": module.slug,
                "label": module.label,
                "icon": module.icon,
                "icon_bg": module.icon_bg,
                "icon_color": module.icon_color,

                "category": module.category,
                "description": module.description,

                "bloom_level": module.bloom_level,

                "estimated_hours":
                    module.estimated_hours,

                "progress": (
                    round(
                        user_module.progress,
                        1,
                    )
                    if user_module
                    else 0.0
                ),

                "status": (
                    user_module.status
                    if user_module
                    else "NOT_STARTED"
                ),

                "started_at": (
                    user_module.started_at.isoformat()
                    if user_module
                    and user_module.started_at
                    else None
                ),

                "completed_at": (
                    user_module.completed_at.isoformat()
                    if user_module
                    and user_module.completed_at
                    else None
                ),
            }
        )

    return result


@modules_router.put(
    "/{module_slug}"
)
async def update_module_progress(
    module_slug: str,
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    progress = float(
        body.get(
            "progress",
            0,
        )
    )

    progress = max(
        0.0,
        min(100.0, progress),
    )

    module = await db.scalar(
        select(Module).where(
            Module.slug == module_slug,
            Module.is_active == True,
        )
    )

    if not module:
        raise HTTPException(
            status_code=404,
            detail=f"Module '{module_slug}' not found.",
        )

    if progress >= 88:
        module_status = "COMPLETED"
    elif progress > 0:
        module_status = "IN_PROGRESS"
    else:
        module_status = "NOT_STARTED"

    existing = await db.scalar(
        select(UserModule).where(
            UserModule.user_id == user_id,
            UserModule.module_id == module.id,
        )
    )

    now = datetime.utcnow()

    if existing:

        existing.progress = progress
        existing.status = module_status
        existing.updated_at = now

        if (
            module_status == "IN_PROGRESS"
            and not existing.started_at
        ):
            existing.started_at = now

        if (
            module_status == "COMPLETED"
            and not existing.completed_at
        ):
            existing.completed_at = now

    else:

        db.add(
            UserModule(
                user_id=user_id,
                module_id=module.id,

                progress=progress,
                status=module_status,

                started_at=(
                    now
                    if progress > 0
                    else None
                ),

                completed_at=(
                    now
                    if module_status == "COMPLETED"
                    else None
                ),
            )
        )

    await db.commit()

    return {
        "module_slug": module_slug,
        "progress": progress,
        "status": module_status,
    }


# ══════════════════════════════════════════════════════════════════════════════
# RESOURCE ROUTES
# ══════════════════════════════════════════════════════════════════════════════

resources_router = APIRouter(
    prefix="/resources",
    tags=["Resources"],
)


@resources_router.get("/")
async def get_resources(
    type: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    concept: Optional[str] = None,
    bloom_level: Optional[int] = None,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return learning resources.

    Resources matching the student's critical gaps
    are ranked first.
    """

    limit = max(
        1,
        min(limit, 100),
    )

    query = select(Resource)

    if type:
        query = query.where(
            Resource.type == type
        )

    if difficulty:
        query = query.where(
            Resource.difficulty == difficulty
        )

    if concept:
        query = query.where(
            Resource.concept == concept
        )

    if search:

        like = f"%{search}%"

        query = query.where(
            (
                Resource.title.ilike(like)
            )
            |
            (
                Resource.description.ilike(like)
            )
        )

    result = await db.scalars(
        query.limit(200)
    )

    resources = result.all()

    if bloom_level:
        resources = [
            resource
            for resource in resources
            if bloom_level in (
                resource.bloom_levels or []
            )
        ]

    # Latest knowledge profile
    latest_profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(
            KnowledgeProfileModel.user_id == user_id
        )
        .order_by(
            KnowledgeProfileModel.created_at.desc()
        )
    )

    critical_gap_concepts = (
        set(latest_profile.critical_gaps)
        if latest_profile
        else set()
    )

    def sort_key(resource: Resource):

        is_gap_match = (
            resource.concept
            in critical_gap_concepts
        )

        return (
            0 if is_gap_match else 1,
            resource.title,
        )

    resources = sorted(
        resources,
        key=sort_key,
    )[:limit]

    return [
        {
            "id": resource.id,

            "type": resource.type,
            "difficulty": resource.difficulty,

            "title": resource.title,
            "description": resource.description,

            "concept": resource.concept,
            "learning_area": resource.learning_area,

            "bloom_levels": resource.bloom_levels,

            "external_url": resource.external_url,
            "thumbnail": resource.thumbnail,

            "cta_label": resource.cta_label,

            "duration_minutes":
                resource.duration_minutes,

            "matches_gap": (
                resource.concept
                in critical_gap_concepts
            ),
        }
        for resource in resources
    ]


# ══════════════════════════════════════════════════════════════════════════════
# MENTOR ROUTES
# ══════════════════════════════════════════════════════════════════════════════

mentor_router = APIRouter(
    prefix="/mentor",
    tags=["Mentor"],
)


@mentor_router.post("/chat")
async def mentor_chat(
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Socratic AI mentor chat.

    Body:

    {
        "message": "...",
        "history": [
            {
                "role": "user",
                "content": "..."
            },
            {
                "role": "assistant",
                "content": "..."
            }
        ]
    }
    """

    message = body.get(
        "message",
        ""
    ).strip()

    history = body.get(
        "history",
        []
    )

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    # Get latest profile
    profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(
            KnowledgeProfileModel.user_id == user_id
        )
        .order_by(
            KnowledgeProfileModel.created_at.desc()
        )
    )

    context_lines = []

    if profile:

        context_lines.append(
            f"Student's overall mastery: "
            f"{profile.overall_mastery:.1f}%"
        )

        if profile.critical_gaps:

            context_lines.append(
                "Critical knowledge gaps: "
                + ", ".join(
                    profile.critical_gaps
                )
            )

        if profile.bloom_summary:

            context_lines.append(
                f"Bloom's level mastery: "
                f"{profile.bloom_summary}"
            )

    context = (
        "\n".join(context_lines)
        if context_lines
        else "No diagnostic data yet for this student."
    )

    system_prompt = f"""
You are a Socratic AI mentor for an undergraduate
Software Engineering student using the Edni AI academic platform.

Student context:

{context}

Teaching approach:

- Use the Socratic method.
- Ask guiding questions instead of immediately giving answers.
- If the student is stuck, provide progressively larger hints.
- Reference actual knowledge gaps when relevant.
- Keep responses concise, around 3-5 sentences.
- Be encouraging.
- If the student asks a direct factual question, answer it,
  but connect the answer to deeper understanding when possible.
"""

    try:

        from langchain_groq import ChatGroq

        from langchain_core.messages import (
            SystemMessage,
            HumanMessage,
            AIMessage,
        )

        from core.config import (
            settings as app_settings
        )

        llm = ChatGroq(
            api_key=app_settings.GROQ_API_KEY,
            model_name=app_settings.GROQ_MODEL,
            temperature=0.2,
            max_tokens=2048,
        )

        messages = [
            SystemMessage(
                content=system_prompt
            )
        ]

        for history_item in history[-10:]:

            role = history_item.get(
                "role"
            )

            content = history_item.get(
                "content",
                "",
            )

            if role == "user":

                messages.append(
                    HumanMessage(
                        content=content
                    )
                )

            elif role == "assistant":

                messages.append(
                    AIMessage(
                        content=content
                    )
                )

        messages.append(
            HumanMessage(
                content=message
            )
        )

        response = await llm.ainvoke(
            messages
        )

        reply = response.content

    except Exception as exc:

        logger.warning(
            f"[MentorChat] LLM call failed: {exc}"
        )

        reply = (
            "I'm having trouble connecting right now. "
            "In the meantime — what specifically are "
            "you trying to work through? Walk me through "
            "what you've tried so far."
        )

    return {
        "reply": reply
    }