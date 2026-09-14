"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const BLOOM_LABELS: Record<number, string> = {
  1: "Remember",
  2: "Understand",
  3: "Apply",
  4: "Analyze",
  5: "Evaluate",
  6: "Create",
};

interface Resource {
  id: string;
  title: string;
  type: string;
  url: string;
  concept: string;
  learning_area: string;
  bloom_levels: number[];
  similarity_score?: number;
  rerank_score?: number;
  rag_confidence?: number;
  difficulty?: string;
  description?: string;
  estimated_minutes?: number;
}

interface Task {
  id: number;
  day: number;
  day_label: string;
  activity: string;
  description?: string;
  learning_objective?: string;
  hours: number;
  estimated_minutes?: number;
  bloom_level: number;
  bloom_label?: string;
  concept?: string | null;
  learning_area?: string | null;
  gap_severity?: string;
  status?: string;
  resources: Resource[];
  resource_count?: number;
}

interface WeekPlan {
  week_number: number;
  theme: string;
  concepts: string[];
  bloom_focus: string[];
  hours: number;
  tasks: Task[];
  priority: string;
  milestone?: string;
  task_count?: number;
  completed_tasks?: number;
  progress_percent?: number;
}

interface StudyPlan {
  id: string;
  profile_id: string;
  weeks: WeekPlan[];
  current_week: number;
  completed_weeks: number[];
  total_hours: number;
  version: number;
}

/* ============================================================
   HELPERS
============================================================ */

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("edni_access") ||
    sessionStorage.getItem("edni_access")
  );
}

function normalizeStatus(status?: string) {
  const value = String(status ?? "PENDING").toUpperCase();

  if (
    value === "DONE" ||
    value === "COMPLETED" ||
    value === "COMPLETE"
  ) {
    return "DONE";
  }

  if (value === "STARTED" || value === "IN_PROGRESS") {
    return "STARTED";
  }

  return "PENDING";
}

function minutesLabel(hours: number) {
  const minutes = Math.round(Number(hours || 0) * 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return m ? `${h}h ${m}m` : `${h}h`;
}

/* ============================================================
   CALENDAR HELPERS
============================================================ */

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const days: Array<Date | null> = [];

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function isSameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function StudyPlannerPage() {
  const router = useRouter();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);
  const [savingTask, setSavingTask] =
    useState<number | null>(null);
  const [generatingNext, setGeneratingNext] =
    useState(false);

  const [calendarDate, setCalendarDate] =
    useState(() => new Date());

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("edni_access");
      localStorage.removeItem("edni_refresh");

      sessionStorage.removeItem("edni_access");
      sessionStorage.removeItem("edni_refresh");
    }

    router.push("/login");
  }, [router]);

  /* ==========================================================
     FETCH STUDY PLAN
  ========================================================== */

  const fetchPlan = useCallback(async () => {
    const token = getToken();

    if (!token) {
      logout();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data } = await axios.get<StudyPlan>(
        `${API_URL}/study-plan/planner`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPlan(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        return;
      }

      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load study plan."
      );

      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  /* ==========================================================
     CURRENT WEEK
  ========================================================== */

  const week = plan?.weeks?.[0] ?? null;

  const progress = useMemo(() => {
    if (!week) return 0;

    const done = week.tasks.filter(
      (task) =>
        normalizeStatus(task.status) === "DONE"
    ).length;

    return week.tasks.length
      ? Math.round(
        (done / week.tasks.length) * 100
      )
      : 0;
  }, [week]);

  /* ==========================================================
     UPDATE TASK
  ========================================================== */

  const updateTask = async (
    task: Task,
    endpoint:
      | "complete"
      | "start"
      | "reset"
  ) => {
    const token = getToken();

    if (!token || !task.id) return;

    try {
      setSavingTask(task.id);
      setError("");

      const { data } = await axios.put(
        `${API_URL}/tasks/${task.id}/${endpoint}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPlan((current) => {
        if (!current?.weeks?.[0]) {
          return current;
        }

        const updated =
          current.weeks[0].tasks.map(
            (item) =>
              item.id === task.id
                ? {
                  ...item,
                  status:
                    data?.status ||
                    (endpoint === "complete"
                      ? "DONE"
                      : endpoint === "start"
                        ? "STARTED"
                        : "PENDING"),
                }
                : item
          );

        return {
          ...current,
          weeks: [
            {
              ...current.weeks[0],
              tasks: updated,
            },
          ],
        };
      });

      if (
        endpoint === "complete" &&
        data?.week_completed
      ) {
        setGeneratingNext(true);
        setSelectedTask(null);

        window.setTimeout(async () => {
          await fetchPlan();
          setGeneratingNext(false);
        }, 1500);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        return;
      }

      setError(
        err?.response?.data?.detail ||
        "Could not update task."
      );
    } finally {
      setSavingTask(null);
    }
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <Shell>
        <div style={styles.center}>
          <div style={styles.loadingBox}>
            <div style={styles.loadingSpinner} />
            <span>Loading your personalized study plan…</span>
          </div>
        </div>
      </Shell>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error && !plan) {
    return (
      <Shell>
        <div style={styles.center}>
          <div style={styles.errorBox}>
            <div style={styles.errorTitle}>
              Unable to load study plan
            </div>

            <div style={styles.error}>
              {error}
            </div>

            <button
              style={styles.primaryButton}
              onClick={fetchPlan}
            >
              Try again
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ==========================================================
     NO PLAN
  ========================================================== */

  if (!plan || !week) {
    return (
      <Shell>
        <div style={styles.center}>
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📚</div>

            <h2>No study plan available</h2>

            <p>
              Complete the diagnostic first so EDNI
              can identify your learning gaps.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  const monthDays = getMonthDays(calendarDate);

  const completedCount = week.tasks.filter(
    (task) =>
      normalizeStatus(task.status) === "DONE"
  ).length;

  return (
    <Shell>
      <div
        className="study-planner-wrapper"
        style={styles.wrapper}
      >
        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <header
          className="study-planner-header"
          style={styles.plannerHeader}
        >
          <div style={styles.headerText}>
            <div style={styles.eyebrow}>
              ADAPTIVE LEARNING PLANNER
            </div>

            <h1
              className="study-planner-title"
              style={styles.title}
            >
              Your Learning Journey
            </h1>

            <p style={styles.subtitle}>
              Week {week.week_number} · {week.theme}
            </p>
          </div>

          <div
            className="study-planner-header-stats"
            style={styles.headerStats}
          >
            <div
              className="study-planner-stat"
              style={styles.statCard}
            >
              <strong>
                {week.tasks.length}/7
              </strong>

              <span>Tasks</span>
            </div>

            <div
              className="study-planner-stat"
              style={styles.statCard}
            >
              <strong>
                {minutesLabel(week.hours)}
              </strong>

              <span>Study time</span>
            </div>

            <div
              className="study-planner-stat"
              style={styles.statCard}
            >
              <strong>{progress}%</strong>

              <span>Progress</span>
            </div>
          </div>
        </header>

        {/* ==================================================
            ALERTS
        ================================================== */}

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        {generatingNext && (
          <div style={styles.infoBanner}>
            Week {week.week_number} completed.
            Generating your next adaptive week
            from your remaining knowledge gaps…
          </div>
        )}

        {/* ==================================================
            COMPACT PINK CALENDAR
        ================================================== */}

        <section
          className="study-planner-calendar"
          style={styles.calendarCard}
        >
          <div
            className="study-planner-calendar-header"
            style={styles.calendarHeader}
          >
            <div style={styles.calendarHeaderText}>
              <div style={styles.calendarEyebrow}>
                STUDY CALENDAR
              </div>

              <h2
                className="study-planner-calendar-title"
                style={styles.calendarTitle}
              >
                {calendarDate.toLocaleString(
                  "default",
                  {
                    month: "long",
                    year: "numeric",
                  }
                )}
              </h2>
            </div>

            <div style={styles.calendarControls}>
              <button
                type="button"
                aria-label="Previous month"
                style={styles.calendarButton}
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() - 1,
                      1
                    )
                  )
                }
              >
                ‹
              </button>

              <button
                type="button"
                style={styles.todayButton}
                onClick={() =>
                  setCalendarDate(new Date())
                }
              >
                Today
              </button>

              <button
                type="button"
                aria-label="Next month"
                style={styles.calendarButton}
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() + 1,
                      1
                    )
                  )
                }
              >
                ›
              </button>
            </div>
          </div>

          <div
            className="study-planner-calendar-grid"
            style={styles.calendarGrid}
          >
            {[
              "SUN",
              "MON",
              "TUE",
              "WED",
              "THU",
              "FRI",
              "SAT",
            ].map((day) => (
              <div
                key={day}
                className="study-planner-calendar-weekday"
                style={styles.calendarWeekday}
              >
                {day}
              </div>
            ))}

            {monthDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="study-planner-calendar-empty"
                    style={styles.emptyDay}
                  />
                );
              }

              const today = isSameDate(
                date,
                new Date()
              );

              const calendarWeekday =
                date.getDay();

              const taskForDate =
                week.tasks.find(
                  (task) =>
                    ((task.day - 1) % 7) ===
                    calendarWeekday
                );

              const taskStatus = taskForDate
                ? normalizeStatus(
                  taskForDate.status
                )
                : null;

              return (
                <div
                  key={date.toISOString()}
                  className="study-planner-calendar-day"
                  style={{
                    ...styles.calendarDay,
                    ...(today
                      ? styles.calendarToday
                      : {}),
                    ...(taskForDate
                      ? styles.calendarHasTask
                      : {}),
                  }}
                  onClick={() => {
                    if (taskForDate) {
                      setSelectedTask(taskForDate);
                    }
                  }}
                >
                  <div
                    className="study-planner-calendar-day-number"
                    style={{
                      ...styles.calendarDayNumber,
                      ...(today
                        ? styles.calendarTodayNumber
                        : {}),
                    }}
                  >
                    {date.getDate()}
                  </div>

                  {taskForDate && (
                    <div
                      className="study-planner-calendar-task"
                      style={{
                        ...styles.calendarTask,
                        ...(taskStatus === "DONE"
                          ? styles.calendarTaskDone
                          : {}),
                      }}
                    >
                      <span>
                        {taskStatus === "DONE"
                          ? "✓ "
                          : ""}
                        {taskForDate.activity}
                      </span>

                      <small>
                        {minutesLabel(
                          taskForDate.hours
                        )}
                      </small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================
            ADAPTIVE PLAN
        ================================================== */}

        <section style={styles.planSection}>
          <div style={styles.planHeading}>
            <div style={styles.planHeadingText}>
              <div style={styles.eyebrow}>
                WEEK {week.week_number}
              </div>

              <h2 style={styles.planTitle}>
                Adaptive Study Plan
              </h2>

              <p style={styles.sectionHint}>
                Your tasks are generated from your
                identified knowledge gaps and
                learning priorities.
              </p>
            </div>

            <div style={styles.priorityLarge}>
              {week.priority || "MEDIUM"}
              <span> PRIORITY</span>
            </div>
          </div>

          {/* =================================================
              PROGRESS
          ================================================= */}

          <section style={styles.progressCard}>
            <div style={styles.progressTop}>
              <div>
                <span style={styles.progressLabel}>
                  Weekly completion
                </span>

                <strong
                  style={styles.progressNumber}
                >
                  {progress}%
                </strong>
              </div>

              <span
                style={styles.progressDescription}
              >
                {completedCount} of{" "}
                {week.tasks.length} tasks completed
              </span>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`,
                }}
              />
            </div>
          </section>

          {/* =================================================
              PLAN INFORMATION
          ================================================= */}

          <div
            className="study-planner-plan-info"
            style={styles.planInfoGrid}
          >
            {/* FOCUS CONCEPTS */}

            <section style={styles.infoCard}>
              <div style={styles.infoIcon}>
                🎯
              </div>

              <div style={styles.infoBody}>
                <h3 style={styles.infoTitle}>
                  Focus concepts
                </h3>

                <div style={styles.conceptList}>
                  {week.concepts.length ? (
                    week.concepts.map(
                      (concept) => (
                        <span
                          key={concept}
                          style={
                            styles.conceptPill
                          }
                        >
                          {concept}
                        </span>
                      )
                    )
                  ) : (
                    <span
                      style={styles.mutedText}
                    >
                      No gap concepts returned.
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* WEEK TARGET */}

            <section style={styles.infoCard}>
              <div style={styles.infoIcon}>
                🏆
              </div>

              <div style={styles.infoBody}>
                <h3 style={styles.infoTitle}>
                  Week target
                </h3>

                <p style={styles.infoText}>
                  {week.milestone ||
                    "Complete all seven daily tasks."}
                </p>
              </div>
            </section>

            {/* ADAPTIVE SEQUENCE */}

            <section style={styles.infoCard}>
              <div style={styles.infoIcon}>
                🧠
              </div>

              <div style={styles.infoBody}>
                <h3 style={styles.infoTitle}>
                  Adaptive sequence
                </h3>

                <p style={styles.infoText}>
                  This week was generated from
                  your identified knowledge gaps.
                </p>

                <div style={styles.nextWeek}>
                  Next → Week{" "}
                  {week.week_number + 1}
                </div>
              </div>
            </section>
          </div>

          {/* =================================================
              TASK HEADER
          ================================================= */}

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Your 7-day plan
              </h2>

              <p style={styles.sectionHint}>
                Select a task to view its objective
                and RAG-retrieved learning
                resources.
              </p>
            </div>
          </div>

          {/* =================================================
              TASK LIST
          ================================================= */}

          <div style={styles.taskList}>
            {week.tasks.map((task) => {
              const status =
                normalizeStatus(task.status);

              const isSaving =
                savingTask === task.id;

              const resourceCount =
                task.resource_count ??
                task.resources?.length ??
                0;

              return (
                <article
                  key={task.id}
                  className="study-planner-task"
                  style={{
                    ...styles.taskCard,
                    ...(status === "DONE"
                      ? styles.taskDone
                      : {}),
                  }}
                  onClick={() =>
                    setSelectedTask(task)
                  }
                >
                  {/* DAY */}

                  <div
                    style={styles.dayBubble}
                  >
                    {status === "DONE"
                      ? "✓"
                      : task.day}
                  </div>

                  {/* CONTENT */}

                  <div
                    className="study-planner-task-content"
                    style={styles.taskContent}
                  >
                    <div style={styles.taskMetaRow}>
                      <span style={styles.dayLabel}>
                        {task.day_label}
                      </span>

                      <span style={styles.badge}>
                        {BLOOM_LABELS[
                          task.bloom_level
                        ] ||
                          task.bloom_label ||
                          "Apply"}
                      </span>

                      <span style={styles.duration}>
                        {minutesLabel(task.hours)}
                      </span>
                    </div>

                    <h3 style={styles.taskTitle}>
                      {task.activity}
                    </h3>

                    <p
                      className="study-planner-task-text"
                      style={styles.taskText}
                    >
                      {task.description ||
                        task.learning_objective ||
                        `Work on ${task.concept ||
                        "this learning area"
                        }.`}
                    </p>

                    <div style={styles.tags}>
                      {task.concept && (
                        <span style={styles.tag}>
                          {task.concept}
                        </span>
                      )}

                      {task.learning_area && (
                        <span style={styles.tag}>
                          {task.learning_area}
                        </span>
                      )}

                      {task.gap_severity && (
                        <span style={styles.tag}>
                          {task.gap_severity} GAP
                        </span>
                      )}

                      {/* ONLY SHOW RESOURCE COUNT WHEN > 0 */}

                      {resourceCount > 0 && (
                        <span
                          style={
                            styles.resourceTag
                          }
                        >
                          {resourceCount} resources
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div
                    className="study-planner-actions"
                    style={styles.actions}
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <button
                      type="button"
                      disabled={
                        isSaving ||
                        status === "DONE"
                      }
                      style={styles.smallButton}
                      onClick={() =>
                        updateTask(
                          task,
                          "start"
                        )
                      }
                    >
                      {status === "STARTED"
                        ? "Started"
                        : "Start"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        isSaving ||
                        status === "DONE"
                      }
                      style={styles.doneButton}
                      onClick={() =>
                        updateTask(
                          task,
                          "complete"
                        )
                      }
                    >
                      {status === "DONE"
                        ? "Done"
                        : isSaving
                          ? "Saving…"
                          : "Mark done"}
                    </button>

                    {status !== "DONE" && (
                      <button
                        type="button"
                        disabled={isSaving}
                        style={styles.linkButton}
                        onClick={() =>
                          updateTask(
                            task,
                            "reset"
                          )
                        }
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* ======================================================
          TASK MODAL
      ====================================================== */}

      {selectedTask && (
        <div
          style={styles.modalBackdrop}
          onClick={() =>
            setSelectedTask(null)
          }
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              aria-label="Close"
              style={styles.close}
              onClick={() =>
                setSelectedTask(null)
              }
            >
              ×
            </button>

            <div style={styles.modalEyebrow}>
              {selectedTask.day_label} ·{" "}
              {selectedTask.learning_area ||
                "Study"}
            </div>

            <h2 style={styles.modalTitle}>
              {selectedTask.activity}
            </h2>

            <p style={styles.modalText}>
              {selectedTask.description ||
                "Complete this adaptive learning task based on your identified knowledge gap."}
            </p>

            <div style={styles.objective}>
              <strong>
                Learning objective
              </strong>

              <span>
                {selectedTask.learning_objective ||
                  "Build mastery through guided practice."}
              </span>
            </div>

            <div style={styles.modalMeta}>
              <span>
                Bloom:{" "}
                {BLOOM_LABELS[
                  selectedTask.bloom_level
                ] || selectedTask.bloom_label}
              </span>

              <span>
                Time:{" "}
                {minutesLabel(
                  selectedTask.hours
                )}
              </span>

              <span>
                Gap:{" "}
                {selectedTask.gap_severity ||
                  "MEDIUM"}
              </span>
            </div>

            <h3 style={styles.resourcesTitle}>
              RAG-retrieved resources
            </h3>

            <div style={styles.resourcesList}>
              {selectedTask.resources?.length ? (
                selectedTask.resources.map(
                  (resource) => (
                    <a
                      key={`${selectedTask.id}-${resource.id}`}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.resourceCard}
                    >
                      <div>
                        <span
                          style={
                            styles.resourceType
                          }
                        >
                          {resource.type}
                        </span>

                        <h4
                          style={
                            styles.resourceTitle
                          }
                        >
                          {resource.title}
                        </h4>

                        <p
                          style={
                            styles.resourceDescription
                          }
                        >
                          {resource.description ||
                            resource.concept}
                        </p>
                      </div>

                      <div
                        style={
                          styles.resourceFooter
                        }
                      >
                        <span>
                          {resource.difficulty ||
                            "Medium"}
                        </span>

                        <span>
                          {resource.estimated_minutes ||
                            0}{" "}
                          min
                        </span>

                        <strong>
                          {Math.round(
                            resource.rag_confidence ||
                            0
                          )}
                          % match
                        </strong>
                      </div>
                    </a>
                  )
                )
              ) : (
                <div
                  style={
                    styles.emptyResource
                  }
                >
                  No vector matches were returned
                  for this task yet. The task itself
                  remains valid and can be completed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ============================================================
   SHELL
============================================================ */

function Shell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div style={styles.shell}>
      <Sidebar />

      <div
        className="study-planner-main"
        style={styles.main}
      >
        <TopBar />

        <main
          className="study-planner-content"
          style={styles.content}
        >
          {children}
        </main>
      </div>

      <ResponsiveStyles />
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles: Record<
  string,
  CSSProperties
> = {
  /* ==========================================================
     SHELL
  ========================================================== */

  shell: {
    minHeight: "100vh",
    width: "100%",
    background: "#f7f8fb",
    color: "#171923",
    overflowX: "hidden",
  },

  main: {
    minHeight: "100vh",
    width: "calc(100% - 250px)",
    marginLeft: "250px",
    minWidth: 0,
    position: "relative",
    boxSizing: "border-box",
  },

  content: {
    width: "100%",
    minHeight: "calc(100vh - 70px)",
    paddingTop: "70px",
    boxSizing: "border-box",
  },

  wrapper: {
    width: "100%",
    maxWidth: 1440,
    margin: "0 auto",
    padding: "22px 32px 60px",
    boxSizing: "border-box",
  },

  center: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 30,
    boxSizing: "border-box",
  },

  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#667085",
    fontSize: 14,
  },

  loadingSpinner: {
    width: 18,
    height: 18,
    border: "2px solid #e4e7ec",
    borderTopColor: "#667085",
    borderRadius: "50%",
  },

  emptyState: {
    maxWidth: 420,
    padding: 35,
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 18,
  },

  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },

  errorBox: {
    width: "min(500px, 100%)",
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 18,
    padding: 25,
    boxSizing: "border-box",
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 12,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  plannerHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 28,
    marginBottom: 22,
  },

  headerText: {
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.5,
    color: "#667085",
  },

  title: {
    margin: "6px 0 5px",
    fontSize: 34,
    lineHeight: 1.1,
    letterSpacing: "-0.8px",
    fontWeight: 800,
  },

  subtitle: {
    margin: 0,
    color: "#667085",
    fontSize: 14,
  },

  headerStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(90px, 1fr))",
    gap: 9,
    flexShrink: 0,
  },

  statCard: {
    minWidth: 92,
    padding: "11px 14px",
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    boxShadow:
      "0 3px 12px rgba(16,24,40,.025)",
    boxSizing: "border-box",
  },

  /* ==========================================================
     CALENDAR
  ========================================================== */

  calendarCard: {
    width: "100%",
    background: "#fff9fb",
    border: "1px solid #f0ccd9",
    borderRadius: 17,
    padding: 16,
    marginBottom: 28,
    boxShadow:
      "0 7px 24px rgba(219,39,119,.045)",
    boxSizing: "border-box",
  },

  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    marginBottom: 11,
  },

  calendarHeaderText: {
    minWidth: 0,
  },

  calendarEyebrow: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.4,
    color: "#c24d74",
  },

  calendarTitle: {
    margin: "3px 0 0",
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 800,
    color: "#29232a",
  },

  calendarControls: {
    display: "flex",
    gap: 5,
    alignItems: "center",
    flexShrink: 0,
  },

  calendarButton: {
    width: 31,
    height: 31,
    padding: 0,
    borderRadius: 8,
    border: "1px solid #eccbd7",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    color: "#b63f68",
    display: "grid",
    placeItems: "center",
  },

  todayButton: {
    height: 31,
    padding: "0 11px",
    borderRadius: 8,
    border: "1px solid #eccbd7",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
    color: "#b63f68",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7, minmax(0, 1fr))",
    gap: 4,
    width: "100%",
  },

  calendarWeekday: {
    textAlign: "center",
    fontSize: 8,
    fontWeight: 800,
    color: "#a45b73",
    padding: "1px 0 5px",
  },

  emptyDay: {
    minHeight: 58,
    borderRadius: 8,
    background: "#fdf7f9",
    border: "1px solid transparent",
    boxSizing: "border-box",
  },

  calendarDay: {
    minHeight: 58,
    borderRadius: 8,
    background: "#ffffff",
    border: "1px solid #f1e0e7",
    padding: 6,
    cursor: "default",
    overflow: "hidden",
    boxSizing: "border-box",
    minWidth: 0,
  },

  calendarHasTask: {
    cursor: "pointer",
    borderColor: "#efc4d3",
  },

  calendarToday: {
    boxShadow:
      "inset 0 0 0 2px #df6b91",
    background: "#fffdfd",
  },

  calendarDayNumber: {
    fontSize: 10,
    fontWeight: 800,
    color: "#475467",
    marginBottom: 3,
  },

  calendarTodayNumber: {
    color: "#c24169",
  },

  calendarTask: {
    borderRadius: 5,
    padding: "3px 4px",
    fontSize: 7.5,
    fontWeight: 700,
    lineHeight: 1.2,
    display: "grid",
    gap: 1,
    background: "#fff0f5",
    color: "#a33d60",
    border: "1px solid #f5d4df",
    minWidth: 0,
  },

  calendarTaskDone: {
    background: "#fce9f0",
    color: "#9f3659",
  },

  /* ==========================================================
     PLAN
  ========================================================== */

  planSection: {
    width: "100%",
    marginTop: 0,
  },

  planHeading: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) auto",
    alignItems: "end",
    gap: 20,
    marginBottom: 16,
  },

  planHeadingText: {
    minWidth: 0,
  },

  planTitle: {
    margin: "5px 0 4px",
    fontSize: 25,
    lineHeight: 1.2,
    fontWeight: 800,
  },

  priorityLarge: {
    padding: "7px 11px",
    borderRadius: 999,
    background: "#f2f4f7",
    color: "#475467",
    fontSize: 9,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  /* ==========================================================
     PROGRESS
  ========================================================== */

  progressCard: {
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    boxSizing: "border-box",
  },

  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 15,
    marginBottom: 9,
  },

  progressLabel: {
    display: "block",
    fontSize: 10,
    color: "#667085",
    marginBottom: 2,
  },

  progressNumber: {
    fontSize: 22,
    lineHeight: 1,
  },

  progressDescription: {
    fontSize: 10,
    color: "#667085",
  },

  progressTrack: {
    height: 7,
    background: "#eef0f3",
    borderRadius: 99,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#344054",
    borderRadius: 99,
    transition: "width .4s ease",
  },

  /* ==========================================================
     INFO CARDS
  ========================================================== */

  planInfoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 27,
  },

  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 15,
    minWidth: 0,
    boxSizing: "border-box",
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: "grid",
    placeItems: "center",
    background: "#f2f4f7",
    flex: "0 0 auto",
    fontSize: 15,
  },

  infoBody: {
    minWidth: 0,
    flex: 1,
  },

  infoTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
  },

  infoText: {
    margin: "5px 0 0",
    fontSize: 10.5,
    color: "#667085",
    lineHeight: 1.5,
  },

  conceptList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },

  conceptPill: {
    padding: "4px 7px",
    borderRadius: 999,
    background: "#f2f4f7",
    color: "#475467",
    fontSize: 9,
    fontWeight: 600,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mutedText: {
    color: "#98a2b3",
    fontSize: 10,
  },

  nextWeek: {
    marginTop: 7,
    fontSize: 9.5,
    fontWeight: 800,
    color: "#475467",
  },

  /* ==========================================================
     TASK HEADER
  ========================================================== */

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 21,
    lineHeight: 1.2,
    fontWeight: 800,
  },

  sectionHint: {
    margin: "5px 0 0",
    color: "#667085",
    fontSize: 11,
    lineHeight: 1.5,
    maxWidth: 700,
  },

  /* ==========================================================
     TASK LIST
  ========================================================== */

  taskList: {
    display: "grid",
    gap: 9,
    width: "100%",
    minWidth: 0,
  },

  taskCard: {
    display: "grid",
    gridTemplateColumns:
      "44px minmax(0, 1fr) 108px",
    alignItems: "center",
    gap: 14,
    width: "100%",
    background: "#ffffff",
    border: "1px solid #e4e7ec",
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    boxShadow:
      "0 3px 14px rgba(16,24,40,.025)",
    minWidth: 0,
    boxSizing: "border-box",
  },

  taskDone: {
    opacity: 0.8,
    background: "#fafbfb",
  },

  dayBubble: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 12,
    background: "#f2f4f7",
    color: "#475467",
    border: "1px solid #e4e7ec",
    boxSizing: "border-box",
  },

  taskContent: {
    minWidth: 0,
    width: "100%",
  },

  taskMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
    minWidth: 0,
  },

  dayLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "#475467",
  },

  badge: {
    fontSize: 9,
    fontWeight: 700,
    padding: "3px 6px",
    borderRadius: 999,
    background: "#f2f4f7",
    color: "#475467",
  },

  duration: {
    fontSize: 10,
    color: "#667085",
  },

  taskTitle: {
    margin: "5px 0 3px",
    fontSize: 15,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "#20232d",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  taskText: {
    margin: 0,
    color: "#667085",
    lineHeight: 1.4,
    fontSize: 11,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 7,
    minWidth: 0,
  },

  tag: {
    background: "#f2f4f7",
    color: "#475467",
    borderRadius: 999,
    padding: "3px 6px",
    fontSize: 9,
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  resourceTag: {
    background: "#f2f4f7",
    color: "#475467",
    borderRadius: 999,
    padding: "3px 6px",
    fontSize: 9,
    fontWeight: 700,
  },

  /* ==========================================================
     TASK ACTIONS
  ========================================================== */

  actions: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 5,
    width: "108px",
    minWidth: 0,
  },

  smallButton: {
    width: "100%",
    background: "#f8f9fc",
    border: "1px solid #dfe3eb",
    borderRadius: 7,
    padding: "7px 6px",
    cursor: "pointer",
    fontSize: 10,
    color: "#344054",
    boxSizing: "border-box",
  },

  doneButton: {
    width: "100%",
    color: "#ffffff",
    background: "#344054",
    border: "1px solid #344054",
    borderRadius: 7,
    padding: "7px 6px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 10,
    boxSizing: "border-box",
  },

  linkButton: {
    border: 0,
    background: "transparent",
    color: "#667085",
    cursor: "pointer",
    fontSize: 10,
    padding: "3px",
  },

  /* ==========================================================
     ALERTS
  ========================================================== */

  error: {
    color: "#b42318",
    background: "#fef3f2",
    padding: 12,
    borderRadius: 10,
    fontSize: 12,
    lineHeight: 1.5,
  },

  errorBanner: {
    background: "#fff1f0",
    color: "#b42318",
    padding: 11,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 11,
    border: "1px solid #f8d2cf",
  },

  infoBanner: {
    background: "#f2f4f7",
    color: "#475467",
    padding: 11,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 11,
    border: "1px solid #e4e7ec",
  },

  primaryButton: {
    marginTop: 14,
    background: "#344054",
    color: "#ffffff",
    border: 0,
    borderRadius: 8,
    padding: "9px 15px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },

  /* ==========================================================
     MODAL
  ========================================================== */

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.48)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 1000,
    boxSizing: "border-box",
  },

  modal: {
    position: "relative",
    width: "min(820px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    background: "#ffffff",
    borderRadius: 20,
    padding: 26,
    boxSizing: "border-box",
  },

  close: {
    position: "absolute",
    top: 10,
    right: 14,
    width: 34,
    height: 34,
    border: 0,
    background: "#f2f4f7",
    borderRadius: 8,
    fontSize: 24,
    lineHeight: 1,
    cursor: "pointer",
    color: "#667085",
  },

  modalEyebrow: {
    color: "#667085",
    fontWeight: 800,
    fontSize: 10,
    letterSpacing: 1.1,
    paddingRight: 45,
  },

  modalTitle: {
    margin: "7px 45px 8px 0",
    fontSize: 25,
    lineHeight: 1.25,
  },

  modalText: {
    color: "#667085",
    lineHeight: 1.6,
    fontSize: 12,
  },

  objective: {
    background: "#f8f9fc",
    border: "1px solid #e7e9f0",
    padding: 14,
    borderRadius: 12,
    display: "grid",
    gap: 5,
    margin: "15px 0",
    fontSize: 12,
    lineHeight: 1.5,
  },

  modalMeta: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    color: "#475467",
    fontSize: 11,
  },

  resourcesTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 17,
  },

  resourcesList: {
    display: "grid",
    gap: 9,
  },

  resourceCard: {
    textDecoration: "none",
    color: "inherit",
    border: "1px solid #e7e9f0",
    borderRadius: 13,
    padding: 14,
    display: "block",
    boxSizing: "border-box",
  },

  resourceType: {
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#667085",
  },

  resourceTitle: {
    margin: "5px 0",
    fontSize: 14,
    lineHeight: 1.3,
  },

  resourceDescription: {
    margin: 0,
    color: "#667085",
    fontSize: 11,
    lineHeight: 1.5,
  },

  resourceFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    color: "#667085",
    fontSize: 10,
    marginTop: 9,
  },

  emptyResource: {
    background: "#f8f9fc",
    padding: 13,
    borderRadius: 10,
    color: "#667085",
    fontSize: 11,
    lineHeight: 1.5,
  },
};

/* ============================================================
   RESPONSIVE STYLES
============================================================ */

function ResponsiveStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      .study-planner-wrapper {
        width: 100%;
      }

      .study-planner-calendar-day,
      .study-planner-calendar-empty {
        min-width: 0;
      }

      .study-planner-calendar-task span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }

      .study-planner-calendar-task small {
        display: block;
        opacity: 0.75;
      }

      .study-planner-task button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      @media (max-width: 1200px) {
        .study-planner-wrapper {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }

        .study-planner-task {
          grid-template-columns:
            42px minmax(0, 1fr) 100px !important;
          gap: 12px !important;
        }

        .study-planner-actions {
          width: 100px !important;
        }
      }

      @media (max-width: 1000px) {
        .study-planner-plan-info {
          grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
        }

        .study-planner-calendar-day,
        .study-planner-calendar-empty {
          min-height: 56px !important;
        }

        .study-planner-task {
          grid-template-columns:
            42px minmax(0, 1fr) !important;
        }

        .study-planner-actions {
          grid-column: 2 !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }

        .study-planner-actions button {
          flex: 1 !important;
        }

        .study-planner-actions .linkButton {
          flex: 0 0 55px !important;
        }
      }

      @media (max-width: 900px) {
        .study-planner-main {
          width: 100% !important;
          margin-left: 0 !important;
        }

        .study-planner-content {
          padding-top: 70px !important;
        }

        .study-planner-header {
          grid-template-columns: 1fr !important;
          gap: 15px !important;
          align-items: start !important;
        }

        .study-planner-header-stats {
          width: 100% !important;
        }

        .study-planner-calendar {
          margin-bottom: 24px !important;
        }

        .study-planner-plan-info {
          grid-template-columns:
            repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 700px) {
        .study-planner-wrapper {
          padding: 17px 14px 40px !important;
        }

        .study-planner-title {
          font-size: 29px !important;
        }

        .study-planner-header-stats {
          grid-template-columns:
            repeat(3, minmax(0, 1fr)) !important;
        }

        .study-planner-stat {
          min-width: 0 !important;
          padding: 10px !important;
        }

        .study-planner-stat strong {
          font-size: 15px !important;
        }

        .study-planner-stat span {
          font-size: 9px !important;
        }

        .study-planner-calendar {
          padding: 12px !important;
          border-radius: 14px !important;
        }

        .study-planner-calendar-header {
          align-items: center !important;
        }

        .study-planner-calendar-title {
          font-size: 18px !important;
        }

        .study-planner-calendar-grid {
          gap: 3px !important;
        }

        .study-planner-calendar-day,
        .study-planner-calendar-empty {
          min-height: 51px !important;
          padding: 5px !important;
          border-radius: 7px !important;
        }

        .study-planner-calendar-task {
          font-size: 7px !important;
          padding: 3px !important;
        }

        .study-planner-plan-info {
          grid-template-columns: 1fr !important;
        }

        .study-planner-plan-heading {
          align-items: start !important;
        }

        .study-planner-task {
          grid-template-columns:
            40px minmax(0, 1fr) !important;
          align-items: start !important;
          padding: 13px !important;
        }

        .study-planner-task-content {
          min-width: 0 !important;
        }

        .study-planner-actions {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: row !important;
          gap: 6px !important;
        }

        .study-planner-actions button {
          flex: 1 !important;
        }

        .study-planner-actions .linkButton {
          flex: 0 0 50px !important;
        }
      }

      @media (max-width: 520px) {
        .study-planner-wrapper {
          padding-left: 10px !important;
          padding-right: 10px !important;
        }

        .study-planner-header-stats {
          gap: 5px !important;
        }

        .study-planner-stat {
          padding: 9px 6px !important;
          border-radius: 9px !important;
        }

        .study-planner-stat strong {
          font-size: 13px !important;
        }

        .study-planner-stat span {
          font-size: 8px !important;
        }

        .study-planner-calendar {
          padding: 9px !important;
        }

        .study-planner-calendar-header {
          align-items: flex-start !important;
          flex-direction: column !important;
          gap: 8px !important;
        }

        .study-planner-calendar-controls {
          width: 100% !important;
        }

        .study-planner-calendar-grid {
          gap: 2px !important;
        }

        .study-planner-calendar-day,
        .study-planner-calendar-empty {
          min-height: 47px !important;
          padding: 4px !important;
        }

        .study-planner-calendar-weekday {
          font-size: 7px !important;
        }

        .study-planner-calendar-day-number {
          font-size: 9px !important;
          margin-bottom: 2px !important;
        }

        .study-planner-calendar-task {
          font-size: 6.5px !important;
        }

        .study-planner-task {
          grid-template-columns:
            36px minmax(0, 1fr) !important;
          gap: 10px !important;
        }

        .study-planner-task .dayBubble {
          width: 36px !important;
          height: 36px !important;
        }

        .study-planner-task-title {
          font-size: 14px !important;
        }

        .study-planner-task-text {
          font-size: 10px !important;
        }

        .study-planner-actions {
          flex-wrap: wrap !important;
        }

        .study-planner-actions .linkButton {
          flex: 0 0 48px !important;
        }

        .study-planner-modal {
          padding: 20px !important;
        }
      }

      @media (max-width: 380px) {
        .study-planner-header-stats {
          grid-template-columns: 1fr !important;
        }

        .study-planner-stat {
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: center !important;
        }

        .study-planner-calendar-button {
          width: 29px !important;
        }

        .study-planner-calendar-today {
          padding-left: 9px !important;
          padding-right: 9px !important;
        }

        .study-planner-actions {
          flex-wrap: wrap !important;
        }

        .study-planner-actions button {
          min-width: 0 !important;
        }
      }
    `}</style>
  );
}