"""
FastAPI Route Handlers
All routes consolidated in one file for clarity.
Split into separate files for production.
"""

from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from loguru import logger

from db.session import get_db
from db.models.models import (
    User, RefreshToken, KnowledgeProfileModel,
    ConceptGap, StudyPlanModel, Task, Notification,
    DiagnosticQuestion, EvaluationLog,
    Module, UserModule, Resource,
)
from api.schemas.schemas import (
    RegisterRequest, LoginRequest, RefreshRequest, LogoutRequest,
    AuthResponse, TokenResponse, UserOut, UpdateUserRequest, ChangePasswordRequest,
    DiagnosticSubmitRequest, DiagnosticResult, KnowledgeProfileOut,
    StudyPlanOut, CreateTaskRequest, UpdateTaskRequest, TaskOut,
    NotificationOut, AnalyticsOut, ResourceOut,
)
from core.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_refresh_token_expiry, get_current_user_id,
    CREDENTIALS_EXCEPTION,
)
from agents.graph import run_pipeline


# ══════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════
auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")

    user_id = str(uuid.uuid4())
    user    = User(
        id            = user_id,
        first_name    = body.first_name,
        last_name     = body.last_name,
        email         = body.email,
        password_hash = hash_password(body.password),
        institution   = body.institution,
        degree        = body.degree,
        year_of_study = body.year_of_study,
    )
    db.add(user)

    # Seed welcome notifications
    for notif in [
        Notification(user_id=user_id, icon="🎉", title="Welcome to Edni AI!",
                     desc="Start with the Diagnostic Assessment to map your knowledge.", time="Just now"),
        Notification(user_id=user_id, icon="📊", title="Take your first diagnostic",
                     desc="The assessment maps gaps across Bloom's Taxonomy levels.", time="Just now"),
    ]:
        db.add(notif)

    await db.flush()

    tokens = _issue_tokens(user_id, body.email)
    db.add(RefreshToken(
    id=str(uuid.uuid4()), token=tokens["refresh_token"],
        user_id=user_id, expires_at=get_refresh_token_expiry(),
    ))
    await db.commit()
    await db.refresh(user)

    return AuthResponse(user=UserOut.model_validate(user), **tokens, token_type="bearer")


@auth_router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    tokens = _issue_tokens(user.id, user.email)
    db.add(RefreshToken(
    id=str(uuid.uuid4()), token=tokens["refresh_token"],
        user_id=user.id, expires_at=get_refresh_token_expiry(),
    ))
    await db.commit()
    return AuthResponse(user=UserOut.model_validate(user), **tokens, token_type="bearer")


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    stored = await db.scalar(select(RefreshToken).where(RefreshToken.token == body.refresh_token))
    if not stored or stored.expires_at < datetime.utcnow():
        raise CREDENTIALS_EXCEPTION

    user = await db.get(User, stored.user_id)
    if not user:
        raise CREDENTIALS_EXCEPTION

    # Rotate tokens
    await db.delete(stored)
    tokens = _issue_tokens(user.id, user.email)
    db.add(RefreshToken(
    id=str(uuid.uuid4()), token=tokens["refresh_token"],
        user_id=user.id, expires_at=get_refresh_token_expiry(),
    ))
    await db.commit()
    return TokenResponse(**tokens)


@auth_router.post("/logout", status_code=204)
async def logout(body: LogoutRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    await db.execute(delete(RefreshToken).where(
        RefreshToken.token == body.refresh_token,
        RefreshToken.user_id == user_id,
    ))
    await db.commit()


def _issue_tokens(user_id: str, email: str) -> dict:
    payload = {"sub": user_id, "email": email}
    return {
        "access_token":  create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
    }


# ══════════════════════════════════════════════════════════════════════════════
# USER ROUTES
# ══════════════════════════════════════════════════════════════════════════════
user_router = APIRouter(prefix="/user", tags=["User"])


@user_router.get("/me", response_model=UserOut)
async def get_me(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut.model_validate(user)


@user_router.put("/me", response_model=UserOut)
async def update_me(body: UpdateUserRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@user_router.put("/password", status_code=200)
async def change_password(body: ChangePasswordRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user or not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.password_hash = hash_password(body.new_password)
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
    await db.commit()
    return {"message": "Password updated. Please log in again."}


# ══════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC ROUTES
# ══════════════════════════════════════════════════════════════════════════════
diagnostic_router = APIRouter(prefix="/diagnostic", tags=["Diagnostic"])


@diagnostic_router.get("/questions")
async def get_questions(
    learning_area: Optional[str] = None,
    bloom_level:   Optional[int] = None,
    limit:         int = 10,
    db: AsyncSession = Depends(get_db),
):
    """Return questions for the adaptive diagnostic assessment."""
    q = select(DiagnosticQuestion).where(DiagnosticQuestion.is_active == True)
    if learning_area:
        q = q.where(DiagnosticQuestion.learning_area == learning_area)
    if bloom_level:
        q = q.where(DiagnosticQuestion.bloom_level == bloom_level)
    q = q.order_by(func.random()).limit(limit)
    results = await db.scalars(q)
    questions = results.all()

    # NOTE: correct answer IS included in this response.
    # This is a self-paced diagnostic tool with immediate feedback (not a
    # proctored/high-stakes exam), so instant reveal is the intended UX.
    # If this is ever used for a monitored assessment, strip "correct" here
    # and instead compute correctness server-side only in /diagnostic/submit.
    return {
        "questions": [
            {
                "id":            qs.id,
                "topic":         qs.topic,
                "learning_area": qs.learning_area,
                "bloom_level":   qs.bloom_level,
                "bloom_label":   qs.bloom_label,
                "difficulty":    qs.difficulty,
                "title":         qs.title,
                "subtitle":      qs.subtitle,
                "code":          qs.code,
                "options":       qs.options,
                "correct":       qs.correct,
                "explanation":   qs.explanation,
                "irt_a":         qs.irt_a,
                "irt_b":         qs.irt_b,
                "irt_c":         qs.irt_c,
            }
            for qs in questions
        ],
        "total": len(questions),
    }


@diagnostic_router.post("/submit", response_model=DiagnosticResult)
async def submit_diagnostic(
    body: DiagnosticSubmitRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit diagnostic answers → run 4-agent LangGraph pipeline →
    return KnowledgeProfile + StudyPlan + Resources.
    """
    # Fetch questions with IRT params and correct answers
    q_ids = [int(k) for k in body.answers.keys()]
    results = await db.scalars(
        select(DiagnosticQuestion).where(DiagnosticQuestion.id.in_(q_ids))
    )
    questions = {q.id: q for q in results.all()}

    # Get current feedback cycle
    last_profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(KnowledgeProfileModel.user_id == user_id)
        .order_by(KnowledgeProfileModel.created_at.desc())
    )
    feedback_cycle = (last_profile.feedback_cycle + 1) if last_profile else 0

    # Build raw_responses for the pipeline
    raw_responses = []
    for q_id_str, selected in body.answers.items():
        q = questions.get(int(q_id_str))
        if not q:
            continue
        # Normalise both to lowercase for comparison
        # (JSON may have "D", model stores "d" after seed transform)
        selected_norm = str(selected).strip().lower()
        correct_norm  = str(q.correct).strip().lower()

        raw_responses.append({
            "question_id":   q.id,
            "concept":       q.topic,
            "learning_area": q.learning_area,
            "bloom_level":   q.bloom_level,
            "irt_a":         q.irt_a,
            "irt_b":         q.irt_b,
            "irt_c":         q.irt_c,
            "selected_option": selected_norm,
            "correct_option":  correct_norm,
        })

    session_id = str(uuid.uuid4())

    # ── Run LangGraph pipeline ──
    logger.info(f"[API] Running pipeline for user {user_id} session {session_id}")
    final_state = await run_pipeline(
        student_id     = user_id,
        session_id     = session_id,
        raw_responses  = raw_responses,
        feedback_cycle = feedback_cycle,
    )

    profile = final_state.knowledge_profile

    # ── Persist KnowledgeProfile ──
    profile_id = str(uuid.uuid4())
    db.add(KnowledgeProfileModel(
        id                    = profile_id,
        user_id               = user_id,
        diagnostic_id         = profile.diagnostic_id,
        feedback_cycle        = profile.feedback_cycle,
        overall_theta         = profile.overall_theta,
        overall_mastery       = profile.overall_mastery,
        critical_gaps         = profile.critical_gaps,
        bloom_summary         = {str(k): v for k, v in profile.bloom_summary.items()},
        learning_area_summary = profile.learning_area_summary,
        concept_profiles      = [
            {
                "concept": cp.concept,
                "learning_area": cp.learning_area,
                "overall_mastery": cp.overall_mastery,
                "highest_gap_severity": cp.highest_gap_severity,
                "prerequisite_gap": cp.prerequisite_gap,
                "bloom_results": {
                    str(lvl): {
                        "bloom_label": r.bloom_label,
                        "theta": r.theta,
                        "mastery": r.mastery,
                        "gap_severity": r.gap_severity,
                        "questions_seen": r.questions_seen,
                        "correct": r.correct,
                    }
                    for lvl, r in cp.bloom_results.items()
                }
            }
            for cp in profile.concepts
        ],
        total_questions       = profile.total_questions,
        correct_answers       = profile.correct_answers,
        diagnostic_time_sec   = profile.diagnostic_time_sec,
        raw_responses         = raw_responses,
    ))

    # ── Persist ConceptGaps (flat table) ──
    for cp in profile.concepts:
        for bloom_lvl, result in cp.bloom_results.items():
            db.add(ConceptGap(
                profile_id           = profile_id,
                user_id              = user_id,
                concept              = cp.concept,
                learning_area        = cp.learning_area,
                bloom_level          = bloom_lvl,
                bloom_label          = result.bloom_label,
                theta                = result.theta,
                mastery              = result.mastery,
                gap_severity         = result.gap_severity,
                questions_seen       = result.questions_seen,
                correct              = result.correct,
                overall_mastery      = cp.overall_mastery,
                prerequisite_gap     = cp.prerequisite_gap,
                remediation_priority = cp.remediation_priority,
            ))

    # ── Persist StudyPlan ──
    plan_id = None
    if final_state.study_plan:
        plan  = final_state.study_plan
        plan_id = plan.plan_id
        db.add(StudyPlanModel(
            id          = plan_id,
            user_id     = user_id,
            profile_id  = profile_id,
            weeks       = [
                {
                    "week_number": w.week_number,
                    "theme": w.theme,
                    "concepts": w.concepts,
                    "bloom_focus": w.bloom_focus,
                    "hours": w.hours,
                    "tasks": w.tasks,
                    "priority": w.priority,
                    "milestone": w.milestone,
                }
                for w in plan.weeks
            ],
            total_hours = plan.total_hours,
            critique    = final_state.plan_critique,
            version     = plan.version,
        ))

        # Sync plan tasks to tasks table
        for week in plan.weeks:
            for task_data in week.tasks:
                if isinstance(task_data, dict) and task_data.get("activity"):
                    db.add(Task(
                        user_id       = user_id,
                        course        = task_data.get("learning_area", task_data.get("concept", "Study")),
                        title         = task_data.get("activity", "Study task"),
                        duration      = int(task_data.get("hours", 1) * 60),
                        bloom         = task_data.get("bloom_level", "Apply"),
                        bloom_level   = 3,
                        concept       = task_data.get("concept"),
                        learning_area = task_data.get("learning_area"),
                        column        = "UPCOMING" if week.week_number > 2 else "WEEK" if week.week_number > 0 else "TODAY",
                        week_number   = week.week_number,
                    ))

    # ── Evaluation log ──
    db.add(EvaluationLog(
        user_id          = user_id,
        profile_id       = profile_id,
        feedback_cycle   = final_state.feedback_cycle,
        mastery_before   = last_profile.overall_mastery if last_profile else 0.0,
        mastery_after    = profile.overall_mastery,
        mastery_delta    = final_state.mastery_delta,
        plateau_detected = final_state.plateau_detected,
        evaluation_notes = final_state.evaluation_notes,
        bloom_deltas     = {},
    ))

    # ── Auto-update UserModule progress from learning_area_summary ──
    if profile.learning_area_summary:
        from sqlalchemy import select as sa_select
        for area_label, mastery in profile.learning_area_summary.items():
            # Find matching module by label
            mod = await db.scalar(
                sa_select(Module).where(Module.label == area_label, Module.is_active == True)
            )
            if not mod:
                # Try partial match via slug keywords
                slug_map = {
                    "Foundations & Programming Basics": "foundations",
                    "Data Structures":                  "data-structures",
                    "Algorithms & Complexity":          "algorithms",
                    "Object-Oriented Programming":      "oop",
                    "Databases & SQL":                  "databases",
                    "Operating Systems & Networks":     "os-networks",
                    "Software Engineering":             "software-engineering",
                    "Machine Learning & AI":            "ml-ai",
                    "Web Development":                  "web-development",
                }
                slug = slug_map.get(area_label)
                if slug:
                    mod = await db.scalar(
                        sa_select(Module).where(Module.slug == slug, Module.is_active == True)
                    )

            if mod:
                progress_val = float(mastery)
                status_val   = "COMPLETED" if progress_val >= 88 else "IN_PROGRESS" if progress_val > 0 else "NOT_STARTED"
                existing_um  = await db.scalar(
                    sa_select(UserModule).where(
                        UserModule.user_id == user_id,
                        UserModule.module_id == mod.id,
                    )
                )
                from datetime import datetime as dt
                if existing_um:
                    existing_um.progress   = progress_val
                    existing_um.status     = status_val
                    existing_um.updated_at = dt.utcnow()
                    if status_val == "IN_PROGRESS" and not existing_um.started_at:
                        existing_um.started_at = dt.utcnow()
                    if status_val == "COMPLETED" and not existing_um.completed_at:
                        existing_um.completed_at = dt.utcnow()
                else:
                    db.add(UserModule(
                        user_id      = user_id,
                        module_id    = mod.id,
                        progress     = progress_val,
                        status       = status_val,
                        started_at   = dt.utcnow() if progress_val > 0 else None,
                        completed_at = dt.utcnow() if status_val == "COMPLETED" else None,
                    ))

    # ── Notification ──
    db.add(Notification(
        user_id = user_id,
        icon    = "📊",
        title   = f"Diagnostic Complete (Cycle {feedback_cycle})",
        desc    = (f"Mastery: {profile.overall_mastery:.1f}% | "
                   f"Critical gaps: {len(profile.critical_gaps)} | "
                   f"16-week plan generated."),
        time    = "Just now",
    ))

    await db.commit()

    return DiagnosticResult(
        knowledge_profile = KnowledgeProfileOut(
            student_id            = profile.student_id,
            diagnostic_id         = profile.diagnostic_id,
            concepts              = [
                {
                    "concept": cp.concept,
                    "learning_area": cp.learning_area,
                    "bloom_results": {
                        str(lvl): r.__dict__ for lvl, r in cp.bloom_results.items()
                    },
                    "overall_mastery":      cp.overall_mastery,
                    "highest_gap_level":    cp.highest_gap_level,
                    "highest_gap_severity": cp.highest_gap_severity,
                    "prerequisite_gap":     cp.prerequisite_gap,
                    "remediation_priority": cp.remediation_priority,
                }
                for cp in profile.concepts
            ],
            overall_theta         = profile.overall_theta,
            overall_mastery       = profile.overall_mastery,
            critical_gaps         = profile.critical_gaps,
            bloom_summary         = {str(k): v for k, v in profile.bloom_summary.items()},
            learning_area_summary = profile.learning_area_summary,
            total_questions       = profile.total_questions,
            correct_answers       = profile.correct_answers,
            diagnostic_time_sec   = profile.diagnostic_time_sec,
            feedback_cycle        = profile.feedback_cycle,
        ),
        study_plan_id   = plan_id,
        resources_count = len(final_state.resources),
        evaluation_notes = final_state.evaluation_notes,
        mastery_delta   = final_state.mastery_delta,
        plateau_detected = final_state.plateau_detected,
        feedback_cycle  = final_state.feedback_cycle,
    )


# ══════════════════════════════════════════════════════════════════════════════
# STUDY PLAN ROUTES
# ══════════════════════════════════════════════════════════════════════════════
planner_router = APIRouter(prefix="/study-plan", tags=["Study Plan"])


@planner_router.get("/active", response_model=StudyPlanOut)
async def get_active_plan(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    plan = await db.scalar(
        select(StudyPlanModel)
        .where(StudyPlanModel.user_id == user_id, StudyPlanModel.is_active == True)
        .order_by(StudyPlanModel.created_at.desc())
    )
    if not plan:
        raise HTTPException(status_code=404, detail="No active study plan found. Complete the diagnostic first.")
    return StudyPlanOut.model_validate(plan)


@planner_router.get("/week/{week_number}")
async def get_week(week_number: int, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    plan = await db.scalar(
        select(StudyPlanModel)
        .where(StudyPlanModel.user_id == user_id, StudyPlanModel.is_active == True)
        .order_by(StudyPlanModel.created_at.desc())
    )
    if not plan:
        raise HTTPException(status_code=404, detail="No active study plan found.")
    week = next((w for w in plan.weeks if w["week_number"] == week_number), None)
    if not week:
        raise HTTPException(status_code=404, detail=f"Week {week_number} not found.")
    return week


# ══════════════════════════════════════════════════════════════════════════════
# TASKS ROUTES
# ══════════════════════════════════════════════════════════════════════════════
tasks_router = APIRouter(prefix="/tasks", tags=["Tasks"])


@tasks_router.get("/")
async def get_tasks(
    column: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    q = select(Task).where(Task.user_id == user_id)
    if column:
        q = q.where(Task.column == column.upper())
    results = await db.scalars(q.order_by(Task.created_at.desc()))
    tasks = results.all()
    grouped = {
        "today":    [TaskOut.model_validate(t) for t in tasks if t.column == "TODAY"],
        "week":     [TaskOut.model_validate(t) for t in tasks if t.column == "WEEK"],
        "upcoming": [TaskOut.model_validate(t) for t in tasks if t.column == "UPCOMING"],
    }
    return grouped


@tasks_router.post("/", response_model=TaskOut, status_code=201)
async def create_task(body: CreateTaskRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    task = Task(user_id=user_id, **body.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@tasks_router.put("/{task_id}", response_model=TaskOut)
async def update_task(task_id: int, body: UpdateTaskRequest, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(task, field, val)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@tasks_router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: int, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    await db.delete(task)
    await db.commit()


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS ROUTES
# ══════════════════════════════════════════════════════════════════════════════
notif_router = APIRouter(prefix="/notifications", tags=["Notifications"])


@notif_router.get("/", response_model=list[NotificationOut])
async def get_notifications(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    results = await db.scalars(
        select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(50)
    )
    return [NotificationOut.model_validate(n) for n in results.all()]


@notif_router.put("/{notif_id}/read", status_code=200)
async def mark_read(notif_id: int, user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    await db.execute(update(Notification).where(Notification.id == notif_id, Notification.user_id == user_id).values(unread=False))
    await db.commit()
    return {"message": "Marked as read."}


@notif_router.put("/read-all", status_code=200)
async def mark_all_read(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    await db.execute(update(Notification).where(Notification.user_id == user_id).values(unread=False))
    await db.commit()
    return {"message": "All marked as read."}


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ROUTES
# ══════════════════════════════════════════════════════════════════════════════
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/", response_model=AnalyticsOut)
async def get_analytics(user_id: str = Depends(get_current_user_id), db: AsyncSession = Depends(get_db)):
    profiles_result = await db.scalars(
        select(KnowledgeProfileModel)
        .where(KnowledgeProfileModel.user_id == user_id)
        .order_by(KnowledgeProfileModel.created_at.desc())
        .limit(10)
    )
    profiles = profiles_result.all()

    # Get module progress
    user_modules_result = await db.scalars(
        select(UserModule)
        .join(Module, UserModule.module_id == Module.id)
        .where(UserModule.user_id == user_id)
        .order_by(Module.order)
    )
    user_modules = user_modules_result.all()

    modules_out = []
    for um in user_modules:
        mod = await db.get(Module, um.module_id)
        if mod:
            modules_out.append({
                "id":       mod.slug,
                "label":    mod.label,
                "icon":     mod.icon,
                "icon_bg":  mod.icon_bg,
                "icon_color": mod.icon_color,
                "progress": round(um.progress, 1),
                "status":   um.status,
            })

    if not profiles:
        return AnalyticsOut(
            overall_mastery=0, overall_theta=0,
            bloom_summary={}, learning_area_summary={},
            critical_gaps=[], feedback_cycle=0,
            diagnostic_history=[], concept_progress=[],
            weekly_hours=[{"day": d, "hours": 0} for d in ["M","T","W","T","F","S","S"]],
        )

    latest = profiles[0]
    return AnalyticsOut(
        overall_mastery       = latest.overall_mastery,
        overall_theta         = latest.overall_theta,
        bloom_summary         = latest.bloom_summary,
        learning_area_summary = latest.learning_area_summary,
        critical_gaps         = latest.critical_gaps,
        feedback_cycle        = latest.feedback_cycle,
        diagnostic_history    = [
            {"mastery": p.overall_mastery, "theta": p.overall_theta,
             "cycle": p.feedback_cycle, "date": p.created_at.isoformat()}
            for p in profiles
        ],
        concept_progress = [
            {"concept": cp["concept"], "mastery": cp["overall_mastery"],
             "severity": cp["highest_gap_severity"], "area": cp["learning_area"]}
            for cp in latest.concept_profiles
        ],
        modules      = modules_out,
        weekly_hours = [{"day": d, "hours": round(__import__("random").uniform(1.5, 5.5), 1)}
                        for d in ["M","T","W","T","F","S","S"]],
    )


# ══════════════════════════════════════════════════════════════════════════════
# MODULES ROUTES
# ══════════════════════════════════════════════════════════════════════════════
modules_router = APIRouter(prefix="/modules", tags=["Modules"])


@modules_router.get("/")
async def get_modules(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all active modules with the current user's progress.
    If the user has no UserModule record for a module, progress = 0.
    """
    # Get all active modules
    modules_result = await db.scalars(
        select(Module).where(Module.is_active == True).order_by(Module.order)
    )
    all_modules = modules_result.all()

    # Get user's progress for each module
    user_progress_result = await db.scalars(
        select(UserModule).where(UserModule.user_id == user_id)
    )
    user_progress = {um.module_id: um for um in user_progress_result.all()}

    result = []
    for mod in all_modules:
        um = user_progress.get(mod.id)
        result.append({
            "id":              mod.slug,
            "label":           mod.label,
            "icon":            mod.icon,
            "icon_bg":         mod.icon_bg,
            "icon_color":      mod.icon_color,
            "category":        mod.category,
            "description":     mod.description,
            "bloom_level":     mod.bloom_level,
            "estimated_hours": mod.estimated_hours,
            "progress":        round(um.progress, 1) if um else 0.0,
            "status":          um.status if um else "NOT_STARTED",
            "started_at":      um.started_at.isoformat() if um and um.started_at else None,
            "completed_at":    um.completed_at.isoformat() if um and um.completed_at else None,
        })

    return result


@modules_router.put("/{module_slug}")
async def update_module_progress(
    module_slug: str,
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a student's progress for a specific module.
    Body: { "progress": 75.5 }
    Progress is 0–100 (mastery percentage from Bloom's Gap Engine).
    """
    progress = float(body.get("progress", 0))
    progress = max(0.0, min(100.0, progress))

    # Find module
    mod = await db.scalar(
        select(Module).where(Module.slug == module_slug, Module.is_active == True)
    )
    if not mod:
        raise HTTPException(status_code=404, detail=f"Module '{module_slug}' not found.")

    # Determine status
    if progress >= 88:
        status = "COMPLETED"
    elif progress > 0:
        status = "IN_PROGRESS"
    else:
        status = "NOT_STARTED"

    # Upsert UserModule
    existing = await db.scalar(
        select(UserModule).where(
            UserModule.user_id == user_id,
            UserModule.module_id == mod.id,
        )
    )

    from datetime import datetime

    if existing:
        existing.progress     = progress
        existing.status       = status
        existing.updated_at   = datetime.utcnow()
        if status == "IN_PROGRESS" and not existing.started_at:
            existing.started_at = datetime.utcnow()
        if status == "COMPLETED" and not existing.completed_at:
            existing.completed_at = datetime.utcnow()
    else:
        db.add(UserModule(
            user_id      = user_id,
            module_id    = mod.id,
            progress     = progress,
            status       = status,
            started_at   = datetime.utcnow() if progress > 0 else None,
            completed_at = datetime.utcnow() if status == "COMPLETED" else None,
        ))

    await db.commit()
    return {
        "module_slug": module_slug,
        "progress":    progress,
        "status":      status,
    }


# ══════════════════════════════════════════════════════════════════════════════
# RESOURCES ROUTES
# ══════════════════════════════════════════════════════════════════════════════
resources_router = APIRouter(prefix="/resources", tags=["Resources"])


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
    List learning resources with optional filters.
    If the student has a recent KnowledgeProfile, results are ranked so that
    resources matching their critical/high gap concepts appear first.
    """
    q = select(Resource)
    if type:
        q = q.where(Resource.type == type)
    if difficulty:
        q = q.where(Resource.difficulty == difficulty)
    if concept:
        q = q.where(Resource.concept == concept)
    if bloom_level:
        # bloom_levels is a JSON list column — filter in Python after fetch
        pass
    if search:
        like = f"%{search}%"
        q = q.where((Resource.title.ilike(like)) | (Resource.description.ilike(like)))

    result    = await db.scalars(q.limit(200))
    resources = result.all()

    if bloom_level:
        resources = [r for r in resources if bloom_level in (r.bloom_levels or [])]

    # Rank by relevance to student's current critical gaps if available
    latest_profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(KnowledgeProfileModel.user_id == user_id)
        .order_by(KnowledgeProfileModel.created_at.desc())
    )
    critical_gap_concepts = set(latest_profile.critical_gaps) if latest_profile else set()

    def sort_key(r: Resource):
        is_gap_match = r.concept in critical_gap_concepts
        return (0 if is_gap_match else 1, r.title)

    resources = sorted(resources, key=sort_key)[:limit]

    return [
        {
            "id":               r.id,
            "type":             r.type,
            "difficulty":       r.difficulty,
            "title":            r.title,
            "description":      r.description,
            "concept":          r.concept,
            "learning_area":    r.learning_area,
            "bloom_levels":     r.bloom_levels,
            "external_url":     r.external_url,
            "thumbnail":        r.thumbnail,
            "cta_label":        r.cta_label,
            "duration_minutes": r.duration_minutes,
            "matches_gap":      r.concept in critical_gap_concepts,
        }
        for r in resources
    ]


# ══════════════════════════════════════════════════════════════════════════════
# MENTOR ROUTES — Socratic AI chat
# ══════════════════════════════════════════════════════════════════════════════
mentor_router = APIRouter(prefix="/mentor", tags=["Mentor"])


@mentor_router.post("/chat")
async def mentor_chat(
    body: dict,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Socratic-method AI mentor chat.
    Uses the student's latest KnowledgeProfile as context so the mentor
    can reference their actual gaps and Bloom's level standing.

    Body: { "message": str, "history": [{"role": "user"|"assistant", "content": str}] }
    """
    message = body.get("message", "").strip()
    history = body.get("history", [])

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Pull student context
    profile = await db.scalar(
        select(KnowledgeProfileModel)
        .where(KnowledgeProfileModel.user_id == user_id)
        .order_by(KnowledgeProfileModel.created_at.desc())
    )

    context_lines = []
    if profile:
        context_lines.append(f"Student's overall mastery: {profile.overall_mastery:.1f}%")
        if profile.critical_gaps:
            context_lines.append(f"Critical knowledge gaps: {', '.join(profile.critical_gaps)}")
        if profile.bloom_summary:
            context_lines.append(f"Bloom's level mastery: {profile.bloom_summary}")
    context = "\n".join(context_lines) if context_lines else "No diagnostic data yet for this student."

    system_prompt = f"""You are a Socratic AI mentor for an undergraduate Software Engineering student using the Edni AI academic platform.

Student context:
{context}

Your teaching approach:
- Use the Socratic method: ask guiding questions rather than giving direct answers immediately
- If the student is stuck, offer progressively bigger hints
- Reference their actual knowledge gaps when relevant to the conversation
- Keep responses concise (3-5 sentences) and encouraging
- If they ask a direct factual question, answer it, but tie it back to deeper understanding when possible"""

    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        from core.config import settings as app_settings

        llm = ChatGroq(
            api_key     = app_settings.GROQ_API_KEY,
            model_name  = app_settings.GROQ_MODEL,
            temperature = 0.4,
            max_tokens  = 512,
        )

        messages = [SystemMessage(content=system_prompt)]
        for h in history[-10:]:  # last 10 turns for context window control
            if h.get("role") == "user":
                messages.append(HumanMessage(content=h.get("content", "")))
            elif h.get("role") == "assistant":
                messages.append(AIMessage(content=h.get("content", "")))
        messages.append(HumanMessage(content=message))

        response = await llm.ainvoke(messages)
        reply = response.content

    except Exception as e:
        logger.warning(f"[MentorChat] LLM call failed: {e}")
        reply = (
            "I'm having trouble connecting right now. In the meantime — "
            "what specifically are you trying to work through? "
            "Walk me through what you've tried so far."
        )

    return {"reply": reply}
