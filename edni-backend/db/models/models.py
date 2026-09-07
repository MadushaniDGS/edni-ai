"""
SQLAlchemy ORM Models — PostgreSQL
"""

from __future__ import annotations
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum,
)
from sqlalchemy import Column, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
import enum


class Base(DeclarativeBase):
    pass


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    STUDENT  = "STUDENT"
    ADMIN    = "ADMIN"

class GapSeverityEnum(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"
    NONE     = "NONE"

class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    DONE    = "DONE"

class TaskColumn(str, enum.Enum):
    TODAY    = "TODAY"
    WEEK     = "WEEK"
    UPCOMING = "UPCOMING"

class TaskPriority(str, enum.Enum):
    HIGH   = "HIGH"
    MEDIUM = "MEDIUM"
    LOW    = "LOW"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id:           Mapped[str]      = mapped_column(String, primary_key=True)
    first_name:   Mapped[str]      = mapped_column(String(100))
    last_name:    Mapped[str]      = mapped_column(String(100))
    email:        Mapped[str]      = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str]     = mapped_column(String(255))
    avatar:       Mapped[str|None] = mapped_column(String(500), nullable=True)
    institution:  Mapped[str]      = mapped_column(String(200), default="")
    degree:       Mapped[str]      = mapped_column(String(200), default="")
    year_of_study: Mapped[str]     = mapped_column(String(50),  default="")
    gpa:          Mapped[float]    = mapped_column(Float, default=0.0)
    semester:     Mapped[str]      = mapped_column(String(100), default="Fall Semester 2024")
    role:         Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.STUDENT)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    knowledge_profiles: Mapped[list["KnowledgeProfileModel"]] = relationship(back_populates="user", cascade="all, delete")
    study_plans:        Mapped[list["StudyPlanModel"]]        = relationship(back_populates="user", cascade="all, delete")
    tasks:              Mapped[list["Task"]]                  = relationship(back_populates="user", cascade="all, delete")
    notifications:      Mapped[list["Notification"]]          = relationship(back_populates="user", cascade="all, delete")
    refresh_tokens:     Mapped[list["RefreshToken"]]          = relationship(back_populates="user", cascade="all, delete")


# ─── Auth ─────────────────────────────────────────────────────────────────────

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id:         Mapped[str]      = mapped_column(String, primary_key=True)
    token:      Mapped[str]      = mapped_column(String(500), unique=True, index=True)
    user_id:    Mapped[str]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")


# ─── Knowledge Profile (Diagnostic Result) ────────────────────────────────────

class KnowledgeProfileModel(Base):
    """
    Stores the full output of the Diagnostic Agent.
    One record per diagnostic cycle per student.
    """
    __tablename__ = "knowledge_profiles"

    id:               Mapped[str]      = mapped_column(String, primary_key=True)
    user_id:          Mapped[str]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    diagnostic_id:    Mapped[str]      = mapped_column(String, unique=True, index=True)
    feedback_cycle:   Mapped[int]      = mapped_column(Integer, default=0)
    overall_theta:    Mapped[float]    = mapped_column(Float, default=0.0)
    overall_mastery:  Mapped[float]    = mapped_column(Float, default=0.0)
    critical_gaps:    Mapped[list]     = mapped_column(JSON,  default=list)
    bloom_summary:    Mapped[dict]     = mapped_column(JSON,  default=dict)  # {level: mastery}
    learning_area_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    concept_profiles: Mapped[list]     = mapped_column(JSON,  default=list)  # full ConceptGapProfile list
    total_questions:  Mapped[int]      = mapped_column(Integer, default=0)
    correct_answers:  Mapped[int]      = mapped_column(Integer, default=0)
    diagnostic_time_sec: Mapped[float] = mapped_column(Float, default=0.0)
    raw_responses:    Mapped[list]     = mapped_column(JSON,  default=list)
    created_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="knowledge_profiles")
    concept_gaps: Mapped[list["ConceptGap"]] = relationship(back_populates="profile", cascade="all, delete")


class ConceptGap(Base):
    """
    Flat table for per-concept, per-Bloom-level gap data.
    Enables efficient querying of specific gaps.
    """
    __tablename__ = "concept_gaps"

    id:                  Mapped[int]            = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id:          Mapped[str]            = mapped_column(ForeignKey("knowledge_profiles.id", ondelete="CASCADE"), index=True)
    user_id:             Mapped[str]            = mapped_column(String, index=True)
    concept:             Mapped[str]            = mapped_column(String(200), index=True)
    learning_area:       Mapped[str]            = mapped_column(String(200))
    bloom_level:         Mapped[int]            = mapped_column(Integer)            # 1–6
    bloom_label:         Mapped[str]            = mapped_column(String(50))
    theta:               Mapped[float]          = mapped_column(Float)
    mastery:             Mapped[float]          = mapped_column(Float)
    gap_severity:        Mapped[GapSeverityEnum] = mapped_column(SAEnum(GapSeverityEnum))
    questions_seen:      Mapped[int]            = mapped_column(Integer, default=0)
    correct:             Mapped[int]            = mapped_column(Integer, default=0)
    overall_mastery:     Mapped[float]          = mapped_column(Float)              # concept-level weighted
    prerequisite_gap:    Mapped[bool]           = mapped_column(Boolean, default=False)
    remediation_priority: Mapped[int]           = mapped_column(Integer, default=0)
    created_at:          Mapped[datetime]       = mapped_column(DateTime, default=datetime.utcnow)

    profile: Mapped["KnowledgeProfileModel"] = relationship(back_populates="concept_gaps")


# ─── Study Plan ───────────────────────────────────────────────────────────────

class StudyPlanModel(Base):
    __tablename__ = "study_plans"

    id:           Mapped[str]      = mapped_column(String, primary_key=True)
    user_id:      Mapped[str]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    profile_id:   Mapped[str]      = mapped_column(ForeignKey("knowledge_profiles.id", ondelete="SET NULL"), nullable=True)
    weeks:        Mapped[list]     = mapped_column(JSON, default=list)    # full StudyWeek list
    total_hours:  Mapped[float]    = mapped_column(Float, default=0.0)
    critique:     Mapped[str|None] = mapped_column(Text, nullable=True)   # Reflexion critique
    version:      Mapped[int]      = mapped_column(Integer, default=1)
    is_active:    Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
current_week = Column(
        Integer,
        nullable=False,
        default=1
    )

    completed_weeks = Column(
        JSONB,
        nullable=False,
        default=list
    )
    user: Mapped["User"] = relationship(back_populates="study_plans")


# ─── Tasks ────────────────────────────────────────────────────────────────────

class Task(Base):
    __tablename__ = "tasks"

    id:             Mapped[int]              = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:        Mapped[str]             = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course:         Mapped[str]             = mapped_column(String(200))
    course_color:   Mapped[str]             = mapped_column(String(20), default="#6C63FF")
    title:          Mapped[str]             = mapped_column(String(500))
    duration:       Mapped[int]             = mapped_column(Integer)       # minutes
    priority:       Mapped[TaskPriority|None] = mapped_column(SAEnum(TaskPriority), nullable=True)
    priority_focus: Mapped[bool]            = mapped_column(Boolean, default=False)
    bloom:          Mapped[str]             = mapped_column(String(50), default="Apply")
    bloom_level:    Mapped[int]             = mapped_column(Integer, default=3)
    concept:        Mapped[str|None]        = mapped_column(String(200), nullable=True)
    learning_area:  Mapped[str|None]        = mapped_column(String(200), nullable=True)
    status:         Mapped[TaskStatus]      = mapped_column(SAEnum(TaskStatus), default=TaskStatus.PENDING)
    column:         Mapped[TaskColumn]      = mapped_column(SAEnum(TaskColumn), default=TaskColumn.TODAY)
    week_number:    Mapped[int|None]        = mapped_column(Integer, nullable=True)  # which plan week
    created_at:     Mapped[datetime]        = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:     Mapped[datetime]        = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="tasks")


# ─── Notifications ────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:    Mapped[str]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    icon:       Mapped[str]      = mapped_column(String(10), default="🔔")
    title:      Mapped[str]      = mapped_column(String(200))
    desc:       Mapped[str]      = mapped_column(Text)
    time:       Mapped[str]      = mapped_column(String(100))
    unread:     Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="notifications")


# ─── Diagnostic Questions ─────────────────────────────────────────────────────

class DiagnosticQuestion(Base):
    __tablename__ = "diagnostic_questions"

    id:            Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic:         Mapped[str]   = mapped_column(String(200), index=True)
    learning_area: Mapped[str]   = mapped_column(String(200), index=True)
    bloom_level:   Mapped[int]   = mapped_column(Integer, index=True)    # 1–6
    bloom_label:   Mapped[str]   = mapped_column(String(50))
    difficulty:    Mapped[str]   = mapped_column(String(20))             # Easy|Medium|Hard
    title:         Mapped[str]   = mapped_column(Text)
    subtitle:      Mapped[str]   = mapped_column(Text)
    code:          Mapped[dict|None] = mapped_column(JSON, nullable=True)
    options:       Mapped[list]  = mapped_column(JSON)
    correct:       Mapped[str]   = mapped_column(String(5))
    explanation:   Mapped[str]   = mapped_column(Text, default="")
    tags:          Mapped[list]  = mapped_column(JSON, default=list)
    # IRT Parameters (calibrated or estimated)
    irt_a:         Mapped[float] = mapped_column(Float, default=1.0)   # discrimination
    irt_b:         Mapped[float] = mapped_column(Float, default=0.0)   # difficulty
    irt_c:         Mapped[float] = mapped_column(Float, default=0.25)  # pseudo-guess
    order:         Mapped[int]   = mapped_column(Integer, default=0)
    is_active:     Mapped[bool]  = mapped_column(Boolean, default=True)


# ─── OER Resources ────────────────────────────────────────────────────────────

class Resource(Base):
    __tablename__ = "resources"

    id:                Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    type:              Mapped[str]   = mapped_column(String(50))      # Video|Article|Book|Exercise
    difficulty:        Mapped[str]   = mapped_column(String(20))      # Easy|Medium|Hard
    title:             Mapped[str]   = mapped_column(String(500))
    description:       Mapped[str]   = mapped_column(Text)
    content:           Mapped[str]   = mapped_column(Text, default="")  # raw text for embedding
    concept:           Mapped[str]   = mapped_column(String(200), index=True)
    learning_area:     Mapped[str]   = mapped_column(String(200), index=True)
    bloom_levels:      Mapped[list]  = mapped_column(JSON, default=list)  # [1,2,3]
    external_url:      Mapped[str|None] = mapped_column(String(1000), nullable=True)
    thumbnail:         Mapped[str]   = mapped_column(String(200), default="default")
    cta_label:         Mapped[str]   = mapped_column(String(50), default="Open Resource")
    duration_minutes:  Mapped[int]   = mapped_column(Integer, default=30)
    pinecone_indexed:  Mapped[bool]  = mapped_column(Boolean, default=False)
    created_at:        Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── Evaluation Log ───────────────────────────────────────────────────────────

class EvaluationLog(Base):
    """Tracks each evaluation cycle for a student."""
    __tablename__ = "evaluation_logs"

    id:              Mapped[int]    = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:         Mapped[str]    = mapped_column(String, index=True)
    profile_id:      Mapped[str]    = mapped_column(String)
    feedback_cycle:  Mapped[int]    = mapped_column(Integer)
    mastery_before:  Mapped[float]  = mapped_column(Float, default=0.0)
    mastery_after:   Mapped[float]  = mapped_column(Float, default=0.0)
    mastery_delta:   Mapped[float]  = mapped_column(Float, default=0.0)
    plateau_detected: Mapped[bool]  = mapped_column(Boolean, default=False)
    evaluation_notes: Mapped[str]   = mapped_column(Text, default="")
    bloom_deltas:    Mapped[dict]   = mapped_column(JSON, default=dict)
    created_at:      Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── Module (Learning Area Progress) ─────────────────────────────────────────
class Module(Base):
    """
    One module per learning area from the question bank.
    Auto-seeded from the 9 canonical learning areas.
    """
    __tablename__ = "modules"

    id:              Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug:            Mapped[str]      = mapped_column(String(100), unique=True, index=True)
    label:           Mapped[str]      = mapped_column(String(200))
    icon:            Mapped[str]      = mapped_column(String(10), default="📘")
    icon_bg:         Mapped[str]      = mapped_column(String(20), default="#EEF2FF")
    icon_color:      Mapped[str]      = mapped_column(String(20), default="#4F46E5")
    category:        Mapped[str]      = mapped_column(String(200))
    description:     Mapped[str]      = mapped_column(Text, default="")
    bloom_level:     Mapped[int]      = mapped_column(Integer, default=3)
    estimated_hours: Mapped[int]      = mapped_column(Integer, default=10)
    order:           Mapped[int]      = mapped_column(Integer, default=0)
    is_active:       Mapped[bool]     = mapped_column(Boolean, default=True)

    user_modules: Mapped[list["UserModule"]] = relationship(back_populates="module", cascade="all, delete")


class UserModule(Base):
    """
    Tracks each student's progress per module (learning area).
    Created automatically when a diagnostic result is processed.
    """
    __tablename__ = "user_modules"

    id:           Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:      Mapped[str]   = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    module_id:    Mapped[int]   = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"))
    progress:     Mapped[float] = mapped_column(Float, default=0.0)    # 0–100 mastery %
    status:       Mapped[str]   = mapped_column(String(20), default="NOT_STARTED")  # NOT_STARTED | IN_PROGRESS | COMPLETED
    started_at:   Mapped[datetime|None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime|None] = mapped_column(DateTime, nullable=True)
    updated_at:   Mapped[datetime]      = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    module: Mapped["Module"]    = relationship(back_populates="user_modules")
    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint("user_id", "module_id", name="uq_user_module"),
    )
