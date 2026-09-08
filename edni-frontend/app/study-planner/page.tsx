"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

type TaskStatus = "pending" | "in_progress" | "completed";

interface Task {
  id: number;
  activity: string;
  hours: number;
  bloom_level: number;
  concept?: string | null;
  learning_area?: string | null;
  status?: string | null;
}

interface WeekPlan {
  week_number: number;
  theme: string;
  concepts: string[];
  bloom_focus: string[];
  hours: number;
  tasks: Task[];
  priority: string;
  milestone: string;
}

interface StudyPlan {
  id: string | number;
  user_id: string;
  profile_id: string | number;
  plan_id?: string | number;
  weeks: WeekPlan[];
  total_hours: number;
  critique: string;
  version: number;
  is_active?: boolean;
  current_week?: number;
  completed_weeks?: number[];
  created_at: string | null;
}

const BLOOM_LABELS: Record<number, string> = {
  1: "Remember",
  2: "Understand",
  3: "Apply",
  4: "Analyze",
  5: "Evaluate",
  6: "Create",
};

const BLOOM_COLORS: Record<number, string> = {
  1: "#3B82F6",
  2: "#06B6D4",
  3: "#10B981",
  4: "#F59E0B",
  5: "#F97316",
  6: "#EF4444",
};

export default function StudyPlannerPage() {
  const router = useRouter();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Local UI status.
   *
   * The backend currently supports persistence for:
   * PUT /tasks/{task_id}/complete
   *
   * Start/Reset do not currently have backend endpoints,
   * so those two states are only local until backend routes
   * are added.
   */
  const [taskStatus, setTaskStatus] = useState<
    Record<string, TaskStatus>
  >({});

  const [updatingTask, setUpdatingTask] = useState<number | null>(null);

  // ---------------------------------------------------------
  // TOKEN
  // ---------------------------------------------------------

  const getToken = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      localStorage.getItem("edni_access") ||
      sessionStorage.getItem("edni_access")
    );
  };

  // ---------------------------------------------------------
  // LOGOUT / UNAUTHORIZED
  // ---------------------------------------------------------

  const handleUnauthorized = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("edni_access");
      localStorage.removeItem("edni_refresh");

      sessionStorage.removeItem("edni_access");
      sessionStorage.removeItem("edni_refresh");
    }

    router.push("/login");
  }, [router]);

  // ---------------------------------------------------------
  // NORMALIZE BACKEND STATUS
  // ---------------------------------------------------------

  const normalizeTaskStatus = (
    status?: string | null
  ): TaskStatus => {
    const normalized = String(status || "")
      .trim()
      .toUpperCase();

    if (
      normalized === "DONE" ||
      normalized === "COMPLETED" ||
      normalized === "COMPLETE"
    ) {
      return "completed";
    }

    if (
      normalized === "IN_PROGRESS" ||
      normalized === "IN-PROGRESS"
    ) {
      return "in_progress";
    }

    return "pending";
  };

  // ---------------------------------------------------------
  // INITIALIZE TASK STATUS
  // ---------------------------------------------------------

  const initializeTaskStatus = (studyPlan: StudyPlan) => {
    const statuses: Record<string, TaskStatus> = {};

    studyPlan.weeks?.forEach((week) => {
      week.tasks?.forEach((task) => {
        /*
         * IMPORTANT:
         * Only use the real database ID.
         *
         * Do NOT create:
         * `${week.week_number}-${index}`
         */
        if (!task.id) {
          return;
        }

        statuses[String(task.id)] = normalizeTaskStatus(
          task.status
        );
      });
    });

    setTaskStatus(statuses);
  };

  // ---------------------------------------------------------
  // FETCH STUDY PLAN
  // ---------------------------------------------------------

  const fetchStudyPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await axios.get<StudyPlan>(
        `${API_URL}/study-plan/planner`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "Study Plan API Response:",
        response.data
      );

      if (!response.data) {
        throw new Error(
          "Empty study plan response."
        );
      }

      if (
        !response.data.weeks ||
        !Array.isArray(response.data.weeks)
      ) {
        throw new Error(
          "Invalid study plan format: weeks are missing."
        );
      }

      setPlan(response.data);
      initializeTaskStatus(response.data);
    } catch (err: any) {
      console.error(
        "Study Plan API Error:",
        err
      );

      const status = err?.response?.status;

      if (status === 401) {
        handleUnauthorized();
        return;
      }

      if (status === 403) {
        setError(
          "You are not authorized to access your study plan."
        );
      } else if (status === 404) {
        setError(
          "The study plan endpoint was not found. Please check GET /api/v1/study-plan/planner."
        );
      } else if (status === 500) {
        setError(
          err?.response?.data?.detail ||
          "The server encountered an error while loading your study plan."
        );
      } else {
        setError(
          err?.response?.data?.detail ||
          err?.message ||
          "Unable to load your study plan."
        );
      }

      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  // ---------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------

  useEffect(() => {
    fetchStudyPlan();
  }, [fetchStudyPlan]);

  // ---------------------------------------------------------
  // UPDATE TASK STATUS
  // ---------------------------------------------------------

  const updateTaskStatus = async (
    taskId: number,
    newStatus: TaskStatus
  ) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    if (!taskId || Number.isNaN(Number(taskId))) {
      setError("Invalid task ID.");
      return;
    }

    const key = String(taskId);

    const previousStatus =
      taskStatus[key] || "pending";

    setUpdatingTask(taskId);
    setError("");

    /*
     * ======================================================
     * COMPLETE
     * ======================================================
     *
     * Backend:
     *
     * PUT /api/v1/tasks/{task_id}/complete
     *
     * Example:
     *
     * PUT /api/v1/tasks/1/complete
     *
     * NOT:
     *
     * PATCH /api/v1/tasks/1
     */

    if (newStatus === "completed") {
      try {
        const response = await axios.put(
          `${API_URL}/tasks/${taskId}/complete`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        console.log(
          "Task completed:",
          response.data
        );

        setTaskStatus((previous) => ({
          ...previous,
          [key]: "completed",
        }));

        /*
         * Update the plan object locally as well so the UI
         * remains synchronized without needing another
         * study-plan request.
         */
        setPlan((previousPlan) => {
          if (!previousPlan) {
            return previousPlan;
          }

          return {
            ...previousPlan,
            weeks: previousPlan.weeks.map(
              (week) => ({
                ...week,
                tasks: week.tasks.map(
                  (task) =>
                    task.id === taskId
                      ? {
                        ...task,
                        status: "DONE",
                      }
                      : task
                ),
              })
            ),
          };
        });
      } catch (err: any) {
        console.error(
          "Failed to complete task:",
          err
        );

        if (err?.response?.status === 401) {
          handleUnauthorized();
          return;
        }

        setTaskStatus((previous) => ({
          ...previous,
          [key]: previousStatus,
        }));

        setError(
          err?.response?.data?.detail ||
          "Failed to complete task."
        );
      } finally {
        setUpdatingTask(null);
      }

      return;
    }

    /*
     * ======================================================
     * START / RESET
     * ======================================================
     *
     * Your current backend does not expose:
     *
     * PUT /tasks/{id}/start
     * PUT /tasks/{id}/reset
     *
     * Therefore these are kept as local UI states.
     *
     * They will not generate a 405 error.
     */

    setTaskStatus((previous) => ({
      ...previous,
      [key]: newStatus,
    }));

    setUpdatingTask(null);
  };

  // ---------------------------------------------------------
  // FORMAT HOURS
  // ---------------------------------------------------------

  const formatDuration = (
    hours: number
  ) => {
    const minutes = Math.round(
      Number(hours || 0) * 60
    );

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return m > 0
      ? `${h}h ${m}m`
      : `${h}h`;
  };

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div style={styles.pageWrapper}>
        <aside style={styles.sidebarWrapper}>
          <Sidebar />
        </aside>

        <div style={styles.mainWrapper}>
          <header style={styles.topBarWrapper}>
            <TopBar />
          </header>

          <main style={styles.mainContent}>
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />

              <h2 style={styles.loadingTitle}>
                Loading your study plan...
              </h2>

              <p style={styles.loadingText}>
                Getting your personalized learning plan.
              </p>
            </div>
          </main>
        </div>

        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // ---------------------------------------------------------
  // ERROR
  // ---------------------------------------------------------

  if (error || !plan) {
    return (
      <div style={styles.pageWrapper}>
        <aside style={styles.sidebarWrapper}>
          <Sidebar />
        </aside>

        <div style={styles.mainWrapper}>
          <header style={styles.topBarWrapper}>
            <TopBar />
          </header>

          <main style={styles.mainContent}>
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>
                !
              </div>

              <h2 style={styles.errorTitle}>
                Study Plan Not Available
              </h2>

              <p style={styles.errorText}>
                {error ||
                  "No personalized study plan was found for your account."}
              </p>

              <div style={styles.errorActions}>
                <button
                  type="button"
                  onClick={fetchStudyPlan}
                  style={styles.primaryButton}
                >
                  ↻ Try Again
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/diagnostic")
                  }
                  style={styles.secondaryButton}
                >
                  Take Diagnostic
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // NO WEEKS
  // ---------------------------------------------------------

  if (
    !plan.weeks ||
    plan.weeks.length === 0
  ) {
    return (
      <div style={styles.pageWrapper}>
        <aside style={styles.sidebarWrapper}>
          <Sidebar />
        </aside>

        <div style={styles.mainWrapper}>
          <header style={styles.topBarWrapper}>
            <TopBar />
          </header>

          <main style={styles.mainContent}>
            <div style={styles.errorContainer}>
              <div style={styles.emptyIcon}>
                📚
              </div>

              <h2 style={styles.errorTitle}>
                No Study Plan Found
              </h2>

              <p style={styles.errorText}>
                Complete your diagnostic assessment
                first. Your results will be used to
                generate your personalized study plan.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/diagnostic")
                }
                style={styles.primaryButton}
              >
                Take Diagnostic
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // CURRENT WEEK
  // ---------------------------------------------------------

  const currentWeekNumber =
    plan.current_week ||
    plan.weeks[0]?.week_number ||
    1;

  const week =
    plan.weeks.find(
      (item) =>
        item.week_number ===
        currentWeekNumber
    ) || plan.weeks[0];

  const completedCount = week.tasks.filter(
    (task) =>
      taskStatus[String(task.id)] ===
      "completed" ||
      normalizeTaskStatus(task.status) ===
      "completed"
  ).length;

  const inProgressCount = week.tasks.filter(
    (task) =>
      taskStatus[String(task.id)] ===
      "in_progress"
  ).length;

  const pendingCount = Math.max(
    week.tasks.length -
    completedCount -
    inProgressCount,
    0
  );

  const progress =
    week.tasks.length > 0
      ? Math.min(
        100,
        Math.round(
          (completedCount /
            week.tasks.length) *
          100
        )
      )
      : 0;

  // ---------------------------------------------------------
  // MAIN PAGE
  // ---------------------------------------------------------

  return (
    <div style={styles.pageWrapper}>
      {/* SIDEBAR */}
      <aside style={styles.sidebarWrapper}>
        <Sidebar />
      </aside>

      {/* MAIN AREA */}
      <div style={styles.mainWrapper}>
        {/* TOP BAR */}
        <header style={styles.topBarWrapper}>
          <TopBar />
        </header>

        {/* CONTENT */}
        <main style={styles.mainContent}>
          {/* HEADER */}
          <header style={styles.header}>
            <div>
              <div style={styles.eyebrow}>
                PERSONALIZED LEARNING
              </div>

              <h1 style={styles.title}>
                Study Planner
              </h1>

              <p style={styles.subtitle}>
                Your adaptive learning plan based on
                your diagnostic results.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchStudyPlan}
              style={styles.refreshButton}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </header>

          {/* WARNING */}
          {error && (
            <div style={styles.warningBox}>
              <span>⚠</span>

              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
          )}

          {/* WEEK HERO */}
          <section style={styles.weekHero}>
            <div style={styles.weekNumber}>
              WEEK {week.week_number}
            </div>

            <h2 style={styles.weekTheme}>
              {week.theme}
            </h2>

            <p style={styles.milestone}>
              {week.milestone}
            </p>

            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <span style={styles.statValue}>
                  {week.tasks.length}
                </span>

                <span style={styles.statLabel}>
                  Tasks
                </span>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statValue}>
                  {week.hours}
                </span>

                <span style={styles.statLabel}>
                  Hours
                </span>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statValue}>
                  {completedCount}/
                  {week.tasks.length}
                </span>

                <span style={styles.statLabel}>
                  Completed
                </span>
              </div>

              <div style={styles.statCard}>
                <span style={styles.statValue}>
                  {progress}%
                </span>

                <span style={styles.statLabel}>
                  Progress
                </span>
              </div>
            </div>
          </section>

          {/* PROGRESS */}
          <section style={styles.progressSection}>
            <div style={styles.progressHeader}>
              <span>
                Week {week.week_number} Progress
              </span>

              <strong>
                {progress}%
              </strong>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${progress}%`,
                }}
              />
            </div>

            <div style={styles.progressStats}>
              <span
                style={{
                  color: "#10B981",
                }}
              >
                ✓ {completedCount} completed
              </span>

              <span
                style={{
                  color: "#F59E0B",
                }}
              >
                ⚡ {inProgressCount} in progress
              </span>

              <span
                style={{
                  color: "#9CA3AF",
                }}
              >
                ○ {pendingCount} pending
              </span>
            </div>
          </section>

          {/* MAIN GRID */}
          <div style={styles.contentGrid}>
            {/* TASKS */}
            <section style={styles.tasksSection}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    This Week&apos;s Tasks
                  </h2>

                  <p style={styles.sectionSubtitle}>
                    Complete these activities to build
                    your knowledge progressively.
                  </p>
                </div>
              </div>

              <div style={styles.taskList}>
                {week.tasks.length === 0 ? (
                  <div style={styles.noTasksCard}>
                    <div style={styles.noTasksIcon}>
                      ✓
                    </div>

                    <h3>
                      No tasks available
                    </h3>

                    <p>
                      There are currently no tasks
                      assigned to this week.
                    </p>
                  </div>
                ) : (
                  week.tasks.map(
                    (task, index) => {
                      /*
                       * IMPORTANT:
                       * Do not create IDs such as 1-0.
                       */
                      if (!task.id) {
                        return null;
                      }

                      const taskId =
                        task.id;

                      const backendStatus =
                        normalizeTaskStatus(
                          task.status
                        );

                      const status =
                        taskStatus[
                        String(taskId)
                        ] ||
                        backendStatus;

                      const bloomNumber =
                        Number(
                          task.bloom_level
                        ) || 3;

                      const bloomLabel =
                        BLOOM_LABELS[
                        bloomNumber
                        ] || "Apply";

                      const bloomColor =
                        BLOOM_COLORS[
                        bloomNumber
                        ] || "#10B981";

                      const isUpdating =
                        updatingTask ===
                        taskId;

                      return (
                        <div
                          key={taskId}
                          style={{
                            ...styles.taskCard,
                            ...(status ===
                              "completed"
                              ? styles.taskCardCompleted
                              : {}),
                            ...(status ===
                              "in_progress"
                              ? styles.taskCardInProgress
                              : {}),
                          }}
                        >
                          {/* CHECKBOX */}
                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              status ===
                              "completed"
                            }
                            onClick={() =>
                              updateTaskStatus(
                                taskId,
                                "completed"
                              )
                            }
                            style={{
                              ...styles.checkbox,
                              ...(status ===
                                "completed"
                                ? styles.checkboxCompleted
                                : {}),
                              ...(status ===
                                "in_progress"
                                ? styles.checkboxInProgress
                                : {}),
                            }}
                            aria-label={
                              status ===
                                "completed"
                                ? "Task completed"
                                : "Mark task complete"
                            }
                          >
                            {status ===
                              "completed"
                              ? "✓"
                              : status ===
                                "in_progress"
                                ? "⚡"
                                : index +
                                1}
                          </button>

                          {/* TASK CONTENT */}
                          <div
                            style={
                              styles.taskContent
                            }
                          >
                            <div
                              style={
                                styles.taskTopRow
                              }
                            >
                              <span
                                style={{
                                  ...styles.bloomBadge,
                                  backgroundColor: `${bloomColor}18`,
                                  color:
                                    bloomColor,
                                }}
                              >
                                Bloom{" "}
                                {bloomNumber} ·{" "}
                                {bloomLabel}
                              </span>

                              <span
                                style={
                                  styles.duration
                                }
                              >
                                ⏱{" "}
                                {formatDuration(
                                  task.hours
                                )}
                              </span>
                            </div>

                            <h3
                              style={{
                                ...styles.taskTitle,
                                ...(status ===
                                  "completed"
                                  ? styles.taskTitleCompleted
                                  : {}),
                              }}
                            >
                              {task.activity}
                            </h3>

                            {(task.concept ||
                              task.learning_area) && (
                                <div
                                  style={
                                    styles.taskMeta
                                  }
                                >
                                  {task.concept && (
                                    <span>
                                      <strong>
                                        Concept:
                                      </strong>{" "}
                                      {
                                        task.concept
                                      }
                                    </span>
                                  )}

                                  {task.learning_area && (
                                    <span>
                                      <strong>
                                        Area:
                                      </strong>{" "}
                                      {
                                        task.learning_area
                                      }
                                    </span>
                                  )}
                                </div>
                              )}

                            {/* STATUS ACTIONS */}
                            <div
                              style={
                                styles.taskActions
                              }
                            >
                              {/* START */}
                              <button
                                type="button"
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateTaskStatus(
                                    taskId,
                                    "in_progress"
                                  )
                                }
                                style={{
                                  ...styles.actionButton,
                                  ...(status ===
                                    "in_progress"
                                    ? styles.actionButtonActive
                                    : {}),
                                }}
                              >
                                Start
                              </button>

                              {/* DONE */}
                              <button
                                type="button"
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateTaskStatus(
                                    taskId,
                                    "completed"
                                  )
                                }
                                style={{
                                  ...styles.actionButton,
                                  ...(status ===
                                    "completed"
                                    ? styles.actionButtonActive
                                    : {}),
                                }}
                              >
                                {isUpdating
                                  ? "Saving..."
                                  : "Done"}
                              </button>

                              {/* RESET */}
                              <button
                                type="button"
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateTaskStatus(
                                    taskId,
                                    "pending"
                                  )
                                }
                                style={{
                                  ...styles.actionButton,
                                  ...(status ===
                                    "pending"
                                    ? styles.actionButtonActive
                                    : {}),
                                }}
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </section>

            {/* RIGHT SIDEBAR */}
            <aside style={styles.planSidebar}>
              {/* FOCUS CONCEPTS */}
              <div style={styles.sideCard}>
                <h3 style={styles.sideTitle}>
                  Focus Concepts
                </h3>

                <div
                  style={
                    styles.conceptList
                  }
                >
                  {(week.concepts || [])
                    .length === 0 ? (
                    <p
                      style={
                        styles.emptySideText
                      }
                    >
                      No specific concepts
                      available.
                    </p>
                  ) : (
                    week.concepts.map(
                      (
                        concept,
                        index
                      ) => (
                        <div
                          key={`${concept}-${index}`}
                          style={
                            styles.conceptItem
                          }
                        >
                          <span
                            style={
                              styles.conceptDot
                            }
                          />

                          <span>
                            {concept}
                          </span>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              {/* BLOOM */}
              <div style={styles.sideCard}>
                <h3 style={styles.sideTitle}>
                  Cognitive Focus
                </h3>

                <div
                  style={
                    styles.bloomList
                  }
                >
                  {(week.bloom_focus || [])
                    .length === 0 ? (
                    <p
                      style={
                        styles.emptySideText
                      }
                    >
                      No cognitive focus
                      specified.
                    </p>
                  ) : (
                    week.bloom_focus.map(
                      (
                        focus,
                        index
                      ) => (
                        <div
                          key={`${focus}-${index}`}
                          style={
                            styles.bloomItem
                          }
                        >
                          <span
                            style={
                              styles.bloomIcon
                            }
                          >
                            {index + 1}
                          </span>

                          <span>
                            {focus}
                          </span>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              {/* PRIORITY */}
              <div
                style={
                  styles.priorityCard
                }
              >
                <span
                  style={
                    styles.priorityLabel
                  }
                >
                  PRIORITY
                </span>

                <strong
                  style={
                    styles.priorityValue
                  }
                >
                  {week.priority ||
                    "High"}
                </strong>

                <p
                  style={
                    styles.priorityText
                  }
                >
                  This week focuses on the
                  areas where your diagnostic
                  assessment identified the
                  greatest learning needs.
                </p>
              </div>

              {/* WEEK SUMMARY */}
              <div
                style={
                  styles.statsCardSide
                }
              >
                <p
                  style={
                    styles.statsLabel
                  }
                >
                  Week Summary
                </p>

                <div
                  style={
                    styles.quickStats
                  }
                >
                  <div
                    style={
                      styles.quickStat
                    }
                  >
                    <span
                      style={{
                        color:
                          "#10B981",
                        fontWeight: 700,
                      }}
                    >
                      {completedCount}
                    </span>

                    <span
                      style={{
                        color:
                          "#6B7280",
                        fontSize:
                          "12px",
                      }}
                    >
                      Completed
                    </span>
                  </div>

                  <div
                    style={
                      styles.quickStat
                    }
                  >
                    <span
                      style={{
                        color:
                          "#F59E0B",
                        fontWeight: 700,
                      }}
                    >
                      {inProgressCount}
                    </span>

                    <span
                      style={{
                        color:
                          "#6B7280",
                        fontSize:
                          "12px",
                      }}
                    >
                      In Progress
                    </span>
                  </div>

                  <div
                    style={
                      styles.quickStat
                    }
                  >
                    <span
                      style={{
                        color:
                          "#6B7280",
                        fontWeight: 700,
                      }}
                    >
                      {pendingCount}
                    </span>

                    <span
                      style={{
                        color:
                          "#6B7280",
                        fontSize:
                          "12px",
                      }}
                    >
                      Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* PLAN INFO */}
              <div
                style={
                  styles.planInfoCard
                }
              >
                <div
                  style={
                    styles.planInfoRow
                  }
                >
                  <span>
                    Plan version
                  </span>

                  <strong>
                    v{plan.version}
                  </strong>
                </div>

                <div
                  style={
                    styles.planInfoRow
                  }
                >
                  <span>
                    Total hours
                  </span>

                  <strong>
                    {plan.total_hours}h
                  </strong>
                </div>

                {plan.critique && (
                  <p
                    style={
                      styles.critique
                    }
                  >
                    {plan.critique}
                  </p>
                )}
              </div>
            </aside>
          </div>

          {/* BOTTOM */}
          <section
            style={
              styles.bottomCard
            }
          >
            <div>
              <h3
                style={
                  styles.bottomTitle
                }
              >
                Keep going
              </h3>

              <p
                style={
                  styles.bottomText
                }
              >
                Complete your current week and
                continue with the next adaptive
                learning cycle.
              </p>
            </div>

            <div
              style={
                styles.weekIndicator
              }
            >
              <span
                style={
                  styles.activeWeek
                }
              >
                {week.week_number}
              </span>

              <span
                style={
                  styles.weekLine
                }
              />

              <span
                style={
                  styles.futureWeek
                }
              >
                {week.week_number + 1}
              </span>

              <span
                style={
                  styles.weekLine
                }
              />

              <span
                style={
                  styles.futureWeek
                }
              >
                {week.week_number + 2}
              </span>

              <span
                style={
                  styles.weekLine
                }
              />

              <span
                style={
                  styles.futureWeek
                }
              >
                ...
              </span>

              <span
                style={
                  styles.weekLine
                }
              />

              <span
                style={
                  styles.futureWeek
                }
              >
                16
              </span>
            </div>
          </section>
        </main>
      </div>

      {/* RESPONSIVE STYLES */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1200px) {
          .study-plan-content-grid {
            grid-template-columns: minmax(0, 1fr) 280px !important;
          }
        }

        @media (max-width: 1000px) {
          .study-plan-content-grid {
            grid-template-columns: 1fr !important;
          }

          .study-plan-sidebar {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 800px) {
          .study-plan-main-content {
            padding: 88px 18px 30px !important;
          }

          .study-plan-header {
            flex-direction: column !important;
          }

          .study-plan-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .study-plan-sidebar {
            grid-template-columns: 1fr !important;
          }

          .study-plan-bottom {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 600px) {
          .study-plan-stats {
            grid-template-columns: 1fr !important;
          }

          .study-plan-task-card {
            flex-direction: column !important;
          }

          .study-plan-task-top {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .study-plan-actions {
            flex-wrap: wrap !important;
          }

          .study-plan-week-indicator {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles: Record<
  string,
  React.CSSProperties
> = {
  pageWrapper: {
    width: "100%",
    height: "100vh",
    display: "flex",
    overflow: "hidden",
    backgroundColor: "#FAFBFC",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  /*
   * IMPORTANT:
   * Sidebar is now part of the flex layout.
   * No margin-left is required.
   */
  sidebarWrapper: {
    width: "240px",
    minWidth: "240px",
    height: "100vh",
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
    zIndex: 200,
  },

  /*
   * Main content occupies exactly the remaining width.
   */
  mainWrapper: {
    flex: 1,
    minWidth: 0,
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  /*
   * TopBar is no longer fixed relative to the viewport.
   * It stays aligned with the main content automatically.
   */
  topBarWrapper: {
    width: "100%",
    height: "64px",
    minHeight: "64px",
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderBottom: "1px solid #E5E7EB",
    position: "relative",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
  },

  mainContent: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "28px 32px 36px",
    boxSizing: "border-box",
  },

  header: {
    maxWidth: "1400px",
    margin: "0 auto 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
  },

  eyebrow: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "#6366F1",
    marginBottom: "7px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#111827",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#6B7280",
    fontSize: "14px",
  },

  refreshButton: {
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    color: "#374151",
    borderRadius: "8px",
    padding: "9px 15px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    flexShrink: 0,
  },

  warningBox: {
    maxWidth: "1400px",
    margin: "0 auto 20px",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #FCD34D",
    backgroundColor: "#FFFBEB",
    color: "#92400E",
    display: "flex",
    alignItems: "center",
    gap: "9px",
    fontSize: "12px",
  },

  closeButton: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "#92400E",
    cursor: "pointer",
    fontSize: "18px",
    lineHeight: 1,
  },

  weekHero: {
    maxWidth: "1400px",
    margin: "0 auto",
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "12px",
    padding: "26px",
    boxShadow:
      "0 1px 3px rgba(0, 0, 0, 0.04)",
  },

  weekNumber: {
    color: "#6366F1",
    fontWeight: 700,
    fontSize: "11px",
    letterSpacing: "1px",
    marginBottom: "7px",
  },

  weekTheme: {
    margin: "6px 0",
    fontSize: "25px",
    fontWeight: 700,
    color: "#111827",
  },

  milestone: {
    margin: 0,
    color: "#6B7280",
    fontSize: "14px",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(120px, 1fr))",
    gap: "12px",
    marginTop: "22px",
  },

  statCard: {
    background: "#F9FAFB",
    borderRadius: "9px",
    padding: "13px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    border: "1px solid #E5E7EB",
  },

  statValue: {
    fontSize: "19px",
    fontWeight: 700,
    color: "#111827",
  },

  statLabel: {
    color: "#6B7280",
    fontSize: "11px",
    fontWeight: 600,
  },

  progressSection: {
    maxWidth: "1400px",
    margin: "20px auto 24px",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "7px",
    fontSize: "12px",
    color: "#6B7280",
    fontWeight: 500,
  },

  progressTrack: {
    height: "7px",
    background: "#E5E7EB",
    borderRadius: "99px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background: "#6366F1",
    borderRadius: "99px",
    transition:
      "width 0.3s ease",
  },

  progressStats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "18px",
    marginTop: "9px",
    fontSize: "11px",
    fontWeight: 500,
  },

  contentGrid: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) 310px",
    gap: "22px",
    alignItems: "start",
  },

  tasksSection: {
    minWidth: 0,
  },

  sectionHeader: {
    marginBottom: "16px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 700,
    color: "#111827",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#6B7280",
    fontSize: "12px",
  },

  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  taskCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "13px",
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "14px",
    transition:
      "all 0.2s ease",
  },

  taskCardCompleted: {
    opacity: 0.62,
    background: "#F9FAFB",
    borderColor: "#E5E7EB",
  },

  taskCardInProgress: {
    background: "#FFFBEB",
    borderColor: "#FCD34D",
  },

  checkbox: {
    flexShrink: 0,
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1.5px solid #D1D5DB",
    background: "#FFFFFF",
    color: "#6B7280",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxCompleted: {
    background: "#10B981",
    borderColor: "#10B981",
    color: "#FFFFFF",
  },

  checkboxInProgress: {
    background: "#FBBF24",
    borderColor: "#F59E0B",
    color: "#FFFFFF",
  },

  taskContent: {
    flex: 1,
    minWidth: 0,
  },

  taskTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "6px",
  },

  bloomBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 7px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: 700,
  },

  duration: {
    color: "#6B7280",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  taskTitle: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.45,
    fontWeight: 600,
    color: "#111827",
  },

  taskTitleCompleted: {
    textDecoration:
      "line-through",
    opacity: 0.7,
  },

  taskMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 15px",
    marginTop: "7px",
    color: "#6B7280",
    fontSize: "11px",
  },

  taskActions: {
    display: "flex",
    gap: "7px",
    marginTop: "10px",
  },

  actionButton: {
    padding: "5px 10px",
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 600,
  },

  actionButtonActive: {
    backgroundColor: "#6366F1",
    color: "#FFFFFF",
    borderColor: "#6366F1",
  },

  planSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  sideCard: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "14px",
  },

  sideTitle: {
    margin: "0 0 11px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#111827",
  },

  conceptList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  conceptItem: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
    color: "#374151",
  },

  conceptDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#6366F1",
    flexShrink: 0,
  },

  bloomList: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  bloomItem: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "12px",
    color: "#374151",
  },

  bloomIcon: {
    width: "21px",
    height: "21px",
    borderRadius: "6px",
    background: "#F3F4F6",
    color: "#6366F1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    flexShrink: 0,
  },

  priorityCard: {
    background: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "13px",
  },

  priorityLabel: {
    display: "block",
    fontSize: "9px",
    letterSpacing: "0.5px",
    fontWeight: 700,
    color: "#6366F1",
    marginBottom: "3px",
  },

  priorityValue: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
  },

  priorityText: {
    margin: "7px 0 0",
    color: "#6B7280",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  statsCardSide: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "13px",
  },

  statsLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 10px",
  },

  quickStats: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  quickStat: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  planInfoCard: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "13px",
  },

  planInfoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "5px 0",
    color: "#6B7280",
    fontSize: "11px",
  },

  critique: {
    borderTop:
      "1px solid #E5E7EB",
    margin: "9px 0 0",
    paddingTop: "9px",
    color: "#6B7280",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  bottomCard: {
    maxWidth: "1400px",
    margin: "22px auto 0",
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "17px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  bottomTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
  },

  bottomText: {
    margin: "4px 0 0",
    color: "#6B7280",
    fontSize: "11px",
  },

  weekIndicator: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: "7px",
  },

  activeWeek: {
    width: "27px",
    height: "27px",
    borderRadius: "50%",
    background: "#6366F1",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "11px",
  },

  futureWeek: {
    width: "27px",
    height: "27px",
    borderRadius: "50%",
    background: "#F3F4F6",
    color: "#9CA3AF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "10px",
  },

  weekLine: {
    width: "13px",
    height: "1px",
    background: "#D1D5DB",
  },

  noTasksCard: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "35px 20px",
    textAlign: "center",
  },

  noTasksIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#F3F4FF",
    color: "#6366F1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 10px",
    fontWeight: 700,
  },

  emptySideText: {
    margin: 0,
    color: "#9CA3AF",
    fontSize: "11px",
  },

  loadingContainer: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  spinner: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border:
      "3px solid #E5E7EB",
    borderTopColor: "#6366F1",
    animation:
      "spin 1s linear infinite",
    marginBottom: "18px",
  },

  loadingTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  },

  loadingText: {
    marginTop: "7px",
    color: "#6B7280",
    fontSize: "13px",
  },

  errorContainer: {
    minHeight:
      "calc(100vh - 64px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    maxWidth: "650px",
    margin: "auto",
    padding: "20px",
  },

  errorIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#FEE2E2",
    color: "#DC2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "15px",
  },

  emptyIcon: {
    fontSize: "42px",
    marginBottom: "15px",
  },

  errorTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 700,
    color: "#111827",
  },

  errorText: {
    color: "#6B7280",
    fontSize: "13px",
    lineHeight: 1.6,
    margin: "10px 0 18px",
  },

  errorActions: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  primaryButton: {
    border: "none",
    background: "#6366F1",
    color: "#FFFFFF",
    borderRadius: "8px",
    padding: "9px 18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  },

  secondaryButton: {
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    color: "#374151",
    borderRadius: "8px",
    padding: "9px 18px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  },
};