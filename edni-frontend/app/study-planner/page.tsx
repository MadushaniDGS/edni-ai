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

  if (
    value === "STARTED" ||
    value === "IN_PROGRESS"
  ) {
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

export default function StudyPlannerPage() {
  const router = useRouter();

  const [plan, setPlan] =
    useState<StudyPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null);

  const [savingTask, setSavingTask] =
    useState<number | null>(null);

  const [generatingNext, setGeneratingNext] =
    useState(false);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("edni_access");
      localStorage.removeItem("edni_refresh");

      sessionStorage.removeItem("edni_access");
      sessionStorage.removeItem("edni_refresh");
    }

    router.push("/login");
  }, [router]);

  const fetchPlan = useCallback(async () => {
    const token = getToken();

    if (!token) {
      logout();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data } =
        await axios.get<StudyPlan>(
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

  const week = plan?.weeks?.[0] ?? null;

  const progress = useMemo(() => {
    if (!week) return 0;

    const done = week.tasks.filter(
      (task) =>
        normalizeStatus(task.status) === "DONE"
    ).length;

    return Math.round((done / 7) * 100);
  }, [week]);

  const updateTask = async (
    task: Task,
    endpoint: "complete" | "start" | "reset"
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

  if (loading) {
    return (
      <Shell>
        <div style={styles.center}>
          Loading your personalized study plan…
        </div>
      </Shell>
    );
  }

  if (error && !plan) {
    return (
      <Shell>
        <div style={styles.center}>
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
      </Shell>
    );
  }

  if (!plan || !week) {
    return (
      <Shell>
        <div style={styles.center}>
          <h2>No study plan available</h2>

          <p>
            Complete the diagnostic first so EDNI
            can identify your learning gaps.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={styles.wrapper}>
        {/* HEADER */}

        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>
              ADAPTIVE STUDY PLAN
            </div>

            <h1 style={styles.title}>
              Week {week.week_number}
            </h1>

            <p style={styles.subtitle}>
              {week.theme}
            </p>
          </div>

          <div style={styles.headerStats}>
            <div>
              <strong>
                {week.tasks.length}/7
              </strong>

              <span>Tasks</span>
            </div>

            <div>
              <strong>
                {minutesLabel(week.hours)}
              </strong>

              <span>This week</span>
            </div>

            <div>
              <strong>{progress}%</strong>

              <span>Progress</span>
            </div>
          </div>
        </div>

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

        {/* PROGRESS */}

        <section style={styles.progressCard}>
          <div style={styles.progressTop}>
            <span>Weekly progress</span>

            <strong>{progress}%</strong>
          </div>

          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>

          <div style={styles.progressBottom}>
            <span>
              {
                week.tasks.filter(
                  (task) =>
                    normalizeStatus(
                      task.status
                    ) === "DONE"
                ).length
              }{" "}
              completed
            </span>

            <span>
              7 required to unlock next week
            </span>
          </div>
        </section>

        {/* MAIN GRID */}

        <div style={styles.grid}>
          <main>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Your 7-day plan
                </h2>

                <p style={styles.sectionHint}>
                  Complete one task per day. Click
                  a task to see the objective and
                  RAG-retrieved resources.
                </p>
              </div>
            </div>

            <div style={styles.taskList}>
              {week.tasks.map((task) => {
                const status =
                  normalizeStatus(task.status);

                const isSaving =
                  savingTask === task.id;

                return (
                  <article
                    key={task.id}
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
                    <div style={styles.dayBubble}>
                      {status === "DONE"
                        ? "✓"
                        : task.day}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={styles.taskMetaRow}
                      >
                        <span
                          style={styles.dayLabel}
                        >
                          {task.day_label}
                        </span>

                        <span
                          style={styles.badge}
                        >
                          {BLOOM_LABELS[
                            task.bloom_level
                          ] ||
                            task.bloom_label ||
                            "Apply"}
                        </span>

                        <span
                          style={styles.duration}
                        >
                          {minutesLabel(
                            task.hours
                          )}
                        </span>
                      </div>

                      <h3
                        style={styles.taskTitle}
                      >
                        {task.activity}
                      </h3>

                      <p
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
                          <span
                            style={styles.tag}
                          >
                            {task.concept}
                          </span>
                        )}

                        {task.learning_area && (
                          <span
                            style={styles.tag}
                          >
                            {task.learning_area}
                          </span>
                        )}

                        {task.gap_severity && (
                          <span
                            style={styles.tag}
                          >
                            {task.gap_severity} GAP
                          </span>
                        )}

                        <span
                          style={
                            styles.resourceTag
                          }
                        >
                          {task.resource_count ??
                            task.resources?.length ??
                            0}{" "}
                          resources
                        </span>
                      </div>
                    </div>

                    <div
                      style={styles.actions}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <button
                        disabled={
                          isSaving ||
                          status === "DONE"
                        }
                        style={
                          styles.smallButton
                        }
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
                        disabled={
                          isSaving ||
                          status === "DONE"
                        }
                        style={
                          styles.doneButton
                        }
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
                          disabled={isSaving}
                          style={
                            styles.linkButton
                          }
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
          </main>

          {/* RIGHT SIDE */}

          <aside style={styles.sidebarArea}>
            <section style={styles.sideCard}>
              <h3 style={styles.sideTitle}>
                Focus concepts
              </h3>

              {week.concepts.length ? (
                week.concepts.map(
                  (concept) => (
                    <div
                      key={concept}
                      style={styles.concept}
                    >
                      {concept}
                    </div>
                  )
                )
              ) : (
                <p>
                  No gap concepts returned.
                </p>
              )}
            </section>

            <section style={styles.sideCard}>
              <h3 style={styles.sideTitle}>
                Week target
              </h3>

              <p>
                {week.milestone ||
                  "Complete all seven daily tasks."}
              </p>

              <div style={styles.priority}>
                {week.priority || "MEDIUM"}{" "}
                PRIORITY
              </div>
            </section>

            <section style={styles.sideCard}>
              <h3 style={styles.sideTitle}>
                Adaptive sequence
              </h3>

              <p>
                Week {week.week_number} is
                generated from your identified
                knowledge gaps. The next week is
                created only after all seven tasks
                are completed.
              </p>

              <div style={styles.nextWeek}>
                Next → Week{" "}
                {week.week_number + 1}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* TASK MODAL */}

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
              {selectedTask.description}
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
                {
                  BLOOM_LABELS[
                  selectedTask.bloom_level
                  ]
                }
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
                      style={
                        styles.resourceCard
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.resourceType
                          }
                        >
                          {resource.type}
                        </span>

                        <h4>
                          {resource.title}
                        </h4>

                        <p>
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
                  No vector matches were
                  returned for this task yet.
                  The task itself remains valid
                  and can be completed.
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
   IMPORTANT:
   Sidebar is kept outside the content flow.
   Main gets a fixed left offset so content never goes
   underneath the sidebar.
============================================================ */

function Shell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div style={styles.shell}>
      <Sidebar />

      <div style={styles.main}>
        <TopBar />

        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: "100vh",
    width: "100%",
    background: "#f6f7fb",
    color: "#151827",
    overflowX: "hidden",
  },

  /*
   * FIX:
   * Sidebar is normally fixed.
   * So don't use display:flex with Sidebar as a normal
   * flex child. Main reserves the sidebar width.
   */
  main: {
    minHeight: "100vh",
    width: "100%",
    minWidth: 0,
    marginLeft: "250px",
    position: "relative",
  },

  /*
   * TopBar is inside main.
   * Content starts below it.
   */
  content: {
    width: "100%",
    minHeight: "calc(100vh - 70px)",
    paddingTop: "70px",
  },

  wrapper: {
    width: "100%",
    maxWidth: 1400,
    margin: "0 auto",
    padding: "34px 36px 60px",
  },

  center: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 40,
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 24,
    alignItems: "end",
    marginBottom: 28,
  },

  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.8,
    color: "#6c63ff",
  },

  title: {
    margin: "8px 0 4px",
    fontSize: 40,
    lineHeight: 1.05,
  },

  subtitle: {
    margin: 0,
    color: "#667085",
    fontSize: 16,
  },

  headerStats: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  progressCard: {
    background: "white",
    border: "1px solid #e7e9f0",
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
  },

  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    marginBottom: 11,
  },

  progressTrack: {
    height: 10,
    background: "#eceef5",
    borderRadius: 99,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#6c63ff",
    borderRadius: 99,
    transition: "width .25s ease",
  },

  progressBottom: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 9,
    color: "#667085",
    fontSize: 12,
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) 330px",
    gap: 22,
    alignItems: "start",
  },

  sidebarArea: {
    minWidth: 0,
    width: "100%",
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 23,
  },

  sectionHint: {
    margin: "6px 0 0",
    color: "#667085",
  },

  taskList: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },

  taskCard: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    background: "white",
    border: "1px solid #e7e9f0",
    borderRadius: 18,
    padding: 18,
    cursor: "pointer",
    boxShadow:
      "0 6px 24px rgba(16,24,40,.04)",
    minWidth: 0,
  },

  taskDone: {
    opacity: 0.78,
    background: "#fbfffc",
  },

  dayBubble: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "#efedff",
    color: "#5b52ea",
    fontWeight: 800,
    flex: "0 0 auto",
  },

  taskMetaRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  dayLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#475467",
  },

  badge: {
    fontSize: 11,
    fontWeight: 800,
    background: "#edf7ff",
    color: "#1769aa",
    padding: "4px 7px",
    borderRadius: 999,
  },

  duration: {
    fontSize: 12,
    color: "#667085",
  },

  taskTitle: {
    margin: "7px 0 5px",
    fontSize: 17,
  },

  taskText: {
    margin: 0,
    color: "#667085",
    lineHeight: 1.5,
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },

  tag: {
    background: "#f2f4f7",
    color: "#475467",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
  },

  resourceTag: {
    background: "#eefbf3",
    color: "#137333",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700,
  },

  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    alignItems: "stretch",
    minWidth: 90,
    flex: "0 0 90px",
  },

  smallButton: {
    background: "#f8f9fc",
    border: "1px solid #dfe3eb",
    borderRadius: 9,
    padding: "7px 9px",
    cursor: "pointer",
  },

  doneButton: {
    background: "#6c63ff",
    color: "white",
    border: 0,
    borderRadius: 9,
    padding: "8px 9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  linkButton: {
    border: 0,
    background: "transparent",
    color: "#667085",
    cursor: "pointer",
    fontSize: 12,
  },

  sideCard: {
    background: "white",
    border: "1px solid #e7e9f0",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    width: "100%",
  },

  sideTitle: {
    margin: "0 0 13px",
    fontSize: 16,
  },

  concept: {
    padding: "10px 0",
    borderBottom: "1px solid #f0f1f5",
    fontSize: 14,
  },

  priority: {
    display: "inline-block",
    marginTop: 5,
    padding: "5px 8px",
    borderRadius: 999,
    background: "#fff4e5",
    color: "#a15c00",
    fontSize: 11,
    fontWeight: 800,
  },

  nextWeek: {
    marginTop: 12,
    fontWeight: 800,
    color: "#6c63ff",
  },

  error: {
    color: "#b42318",
    background: "#fef3f2",
    padding: 15,
    borderRadius: 12,
  },

  errorBanner: {
    background: "#fff1f0",
    color: "#b42318",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  infoBanner: {
    background: "#eef4ff",
    color: "#304fc0",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  primaryButton: {
    marginTop: 15,
    background: "#6c63ff",
    color: "white",
    border: 0,
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,.48)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 1000,
  },

  modal: {
    position: "relative",
    width: "min(820px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    background: "white",
    borderRadius: 22,
    padding: 28,
  },

  close: {
    position: "absolute",
    top: 12,
    right: 16,
    border: 0,
    background: "transparent",
    fontSize: 30,
    cursor: "pointer",
    color: "#667085",
  },

  modalEyebrow: {
    color: "#6c63ff",
    fontWeight: 800,
    fontSize: 12,
    letterSpacing: 1.2,
  },

  modalTitle: {
    margin: "7px 40px 8px 0",
    fontSize: 29,
  },

  modalText: {
    color: "#667085",
    lineHeight: 1.6,
  },

  objective: {
    background: "#f8f7ff",
    padding: 16,
    borderRadius: 14,
    display: "grid",
    gap: 6,
    margin: "16px 0",
  },

  modalMeta: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    color: "#475467",
    fontSize: 13,
  },

  resourcesTitle: {
    marginTop: 26,
  },

  resourcesList: {
    display: "grid",
    gap: 10,
  },

  resourceCard: {
    textDecoration: "none",
    color: "inherit",
    border: "1px solid #e7e9f0",
    borderRadius: 15,
    padding: 15,
    display: "block",
  },

  resourceType: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#6c63ff",
  },

  resourceFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#667085",
    fontSize: 11,
    marginTop: 10,
  },

  emptyResource: {
    background: "#f8f9fc",
    padding: 14,
    borderRadius: 12,
    color: "#667085",
  },
};

/* ============================================================
   RESPONSIVE FIX
============================================================ */

if (typeof window === "undefined") {
  // SSR safe
}

/*
 * IMPORTANT:
 *
 * The styles above are inline CSSProperties, so media queries
 * cannot be placed directly inside styles.
 *
 * Add this global style block through a small component.
 */

function ResponsiveStyles() {
  return (
    <style jsx global>{`
      @media (max-width: 1200px) {
        .study-planner-wrapper {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }
      }

      @media (max-width: 1050px) {
        .study-planner-grid {
          grid-template-columns: minmax(0, 1fr) 280px !important;
        }
      }

      @media (max-width: 900px) {
        .study-planner-main {
          margin-left: 0 !important;
        }

        .study-planner-content {
          padding-top: 70px !important;
        }

        .study-planner-grid {
          grid-template-columns: 1fr !important;
        }

        .study-planner-header {
          align-items: flex-start !important;
          flex-direction: column !important;
        }

        .study-planner-stats {
          width: 100% !important;
        }
      }

      @media (max-width: 650px) {
        .study-planner-wrapper {
          padding: 22px 14px 40px !important;
        }

        .study-planner-title {
          font-size: 32px !important;
        }

        .study-planner-task {
          align-items: flex-start !important;
          flex-wrap: wrap !important;
        }

        .study-planner-task-content {
          min-width: calc(100% - 58px) !important;
        }

        .study-planner-actions {
          width: 100% !important;
          flex: 1 1 100% !important;
          flex-direction: row !important;
          min-width: 0 !important;
        }

        .study-planner-actions button {
          flex: 1 !important;
        }

        .study-planner-progress-bottom {
          gap: 10px !important;
          flex-wrap: wrap !important;
        }
      }

      @media (max-width: 480px) {
        .study-planner-header-stats {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          width: 100% !important;
        }

        .study-planner-header-stats > div {
          min-width: 0 !important;
        }

        .study-planner-header-stats strong {
          font-size: 15px !important;
        }

        .study-planner-header-stats span {
          font-size: 10px !important;
        }

        .study-planner-task {
          padding: 14px !important;
        }

        .study-planner-task-text {
          font-size: 13px !important;
        }
      }
    `}</style>
  );
}