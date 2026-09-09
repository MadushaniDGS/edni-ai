"""
Pydantic schemas for all API request/response models.
"""

from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    first_name:   str        = Field(..., min_length=1, max_length=100)
    last_name:    str        = Field(..., min_length=1, max_length=100)
    email:        EmailStr
    password:     str        = Field(..., min_length=8)
    institution:  str        = ""
    degree:       str        = ""
    year_of_study: str       = ""

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str = Field(..., min_length=1)

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"

class AuthResponse(BaseModel):
    user:         "UserOut"
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"


# ─── User ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id:           str
    first_name:   str
    last_name:    str
    email:        str
    avatar:       Optional[str]
    institution:  str
    degree:       str
    year_of_study: str
    gpa:          float
    semester:     str
    role:         str
    created_at:   datetime

    class Config:
        from_attributes = True

class UpdateUserRequest(BaseModel):
    first_name:   Optional[str]   = None
    last_name:    Optional[str]   = None
    avatar:       Optional[str]   = None
    institution:  Optional[str]   = None
    degree:       Optional[str]   = None
    year_of_study: Optional[str]  = None
    gpa:          Optional[float] = Field(None, ge=0.0, le=4.0)
    semester:     Optional[str]   = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)


# ─── Diagnostic ───────────────────────────────────────────────────────────────

class QuestionOption(BaseModel):
    id:    str
    label: str
    desc:  str

class QuestionOut(BaseModel):
    id:            int
    topic:         str
    learning_area: str
    bloom_level:   int
    bloom_label:   str
    difficulty:    str
    title:         str
    subtitle:      str
    code:          Optional[dict]
    options:       list[QuestionOption]
    # correct is NOT included

    class Config:
        from_attributes = True

class DiagnosticSubmitRequest(BaseModel):
    answers:     dict[str, str]             # { "question_id": "selected_option_id" }
    confidences: Optional[dict[str, int]] = None  # { "question_id": 1-5 }
    time_sec:    float = 0.0

class BloomLevelResult(BaseModel):
    bloom_level:       int
    bloom_label:       str
    theta:             float
    mastery:           float
    gap_severity:      str
    questions_seen:    int
    correct:           int
    recommended_verbs: list[str]

class ConceptGapOut(BaseModel):
    concept:              str
    learning_area:        str
    bloom_results:        dict[str, BloomLevelResult]
    overall_mastery:      float
    highest_gap_level:    Optional[int]
    highest_gap_severity: str
    prerequisite_gap:     bool
    remediation_priority: int

class KnowledgeProfileOut(BaseModel):
    student_id:            str
    diagnostic_id:         str
    concepts:              list[ConceptGapOut]
    overall_theta:         float
    overall_mastery:       float
    critical_gaps:         list[str]
    bloom_summary:         dict[str, float]
    learning_area_summary: dict[str, float]
    total_questions:       int
    correct_answers:       int
    diagnostic_time_sec:   float
    feedback_cycle:        int

class DiagnosticResult(BaseModel):
    knowledge_profile:  KnowledgeProfileOut
    study_plan_id:      Optional[str]
    resources_count:    int
    evaluation_notes:   str
    mastery_delta:      float
    plateau_detected:   bool
    feedback_cycle:     int


# ─── Study Plan ───────────────────────────────────────────────────────────────

class StudyTaskOut(BaseModel):
    id: Optional[int] = None
    day: Optional[int] = None
    day_label: Optional[str] = None
    status: Optional[str] = None
    resources: list[dict] = Field(default_factory=list)
    description: Optional[str] = None
    concept:           Optional[str]
    learning_area:     Optional[str]
    bloom_level:       Optional[str]
    activity:          str
    resource_type:     Optional[str]
    learning_objective: Optional[str]
    hours:             float
    gap_severity:      Optional[str]

class StudyWeekOut(BaseModel):
    week_number: int
    theme:       str
    concepts:    list[str]
    bloom_focus: list[int]
    hours:       float
    tasks:       list[dict]
    priority:    str
    milestone:   Optional[str]
    weekly_goal: Optional[str]
    success_metric: Optional[str]

class StudyPlanOut(BaseModel):
    id:           str
    student_id:   str
    weeks:        list[StudyWeekOut]
    total_hours:  float
    critique:     Optional[str]
    version:      int
    created_at:   str

    class Config:
        from_attributes = True


# ─── Resources ────────────────────────────────────────────────────────────────

class ResourceOut(BaseModel):
    id:               str
    title:            str
    type:             str
    url:              str
    concept:          str
    learning_area:    str
    bloom_levels:     list[int]
    similarity_score: float
    rerank_score:     float
    rag_confidence:   float
    difficulty:       str
    estimated_minutes: int


# ─── Tasks ────────────────────────────────────────────────────────────────────

class CreateTaskRequest(BaseModel):
    course:        str = Field(..., min_length=1)
    course_color:  str = "#6C63FF"
    title:         str = Field(..., min_length=1)
    duration:      int = Field(..., ge=1)
    priority:      Optional[str] = None
    priority_focus: bool = False
    bloom:         str  = "Apply"
    bloom_level:   int  = Field(3, ge=1, le=6)
    concept:       Optional[str] = None
    learning_area: Optional[str] = None
    column:        str = "TODAY"
    week_number:   Optional[int] = None

class UpdateTaskRequest(BaseModel):
    title:         Optional[str]  = None
    status:        Optional[str]  = None
    column:        Optional[str]  = None
    priority:      Optional[str]  = None
    bloom:         Optional[str]  = None
    bloom_level:   Optional[int]  = None
    duration:      Optional[int]  = None
    priority_focus: Optional[bool] = None

class TaskOut(BaseModel):
    id:             int
    course:         str
    course_color:   str
    title:          str
    duration:       int
    priority:       Optional[str]
    priority_focus: bool
    bloom:          str
    bloom_level:    int
    concept:        Optional[str]
    learning_area:  Optional[str]
    status:         str
    column:         str
    week_number:    Optional[int]
    day:            Optional[int] = None
    resources:      list[dict] = Field(default_factory=list)
    description:    Optional[str] = None
    learning_objective: Optional[str] = None
    created_at:     datetime

    class Config:
        from_attributes = True


# ─── Notifications ────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id:         int
    icon:       str
    title:      str
    desc:       str
    time:       str
    unread:     bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsOut(BaseModel):
    overall_mastery:       float
    overall_theta:         float
    bloom_summary:         dict[str, float]
    learning_area_summary: dict[str, float]
    critical_gaps:         list[str]
    feedback_cycle:        int
    diagnostic_history:    list[dict]
    concept_progress:      list[dict]
    modules:               list[dict] = []
    weekly_hours:          list[dict]


# ─── Standard Response ────────────────────────────────────────────────────────

class APIResponse(BaseModel):
    success: bool = True
    data:    Optional[dict | list] = None
    message: Optional[str] = None
