"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface Task {
  id?: string;
  activity: string;
  hours: number;
  bloom_level: number;
  concept?: string;
  learning_area?: string;
  status?: "pending" | "in_progress" | "completed";
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
  id: string;
  user_id: string;
  profile_id: string;
  weeks: WeekPlan[];
  total_hours: number;
  critique: string;
  version: number;
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

// Mock data for development
const MOCK_PLAN: StudyPlan = {
  id: "plan-1",
  user_id: "user-1",
  profile_id: "profile-1",
  total_hours: 20,
  critique: "Well-structured for progressive learning",
  version: 1,
  created_at: new Date().toISOString(),
  weeks: [
    {
      week_number: 1,
      theme: "Foundations of Data Structures",
      concepts: [
        "Arrays and Lists",
        "Stacks and Queues",
        "Time Complexity Analysis",
      ],
      bloom_focus: ["Remember", "Understand", "Apply"],
      hours: 20,
      priority: "High",
      milestone: "Master fundamental data structures",
      tasks: [
        {
          id: "task-1",
          activity: "Review array operations and indexing",
          hours: 2,
          bloom_level: 1,
          concept: "Arrays",
          learning_area: "Data Structures",
          status: "pending",
        },
        {
          id: "task-2",
          activity: "Implement basic list operations (insert, delete, search)",
          hours: 3,
          bloom_level: 3,
          concept: "Lists",
          learning_area: "Data Structures",
          status: "pending",
        },
        {
          id: "task-3",
          activity: "Study stack and queue use cases",
          hours: 2.5,
          bloom_level: 2,
          concept: "Stacks & Queues",
          learning_area: "Data Structures",
          status: "pending",
        },
        {
          id: "task-4",
          activity: "Practice time complexity calculations with Big O notation",
          hours: 3.5,
          bloom_level: 3,
          concept: "Complexity Analysis",
          learning_area: "Algorithms",
          status: "pending",
        },
        {
          id: "task-5",
          activity: "Complete coding exercises on LeetCode (Easy level)",
          hours: 4,
          bloom_level: 3,
          concept: "Data Structures",
          learning_area: "Data Structures",
          status: "pending",
        },
        {
          id: "task-6",
          activity: "Quiz: Data structure fundamentals",
          hours: 2,
          bloom_level: 2,
          concept: "Assessment",
          learning_area: "Data Structures",
          status: "pending",
        },
      ],
    },
  ],
};

export default function StudyPlannerPage() {
  const router = useRouter();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskStatus, setTaskStatus] = useState<Record<string, "pending" | "in_progress" | "completed">>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    fetchStudyPlan();
  }, []);

  const fetchStudyPlan = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("edni_access");

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await axios.get<StudyPlan>(
          `${API_URL}/study-plan/planner`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPlan(response.data);
        initializeTaskStatus(response.data);
      } catch (apiErr: any) {
        console.warn("API failed, using mock data:", apiErr.message);
        setPlan(MOCK_PLAN);
        initializeTaskStatus(MOCK_PLAN);
      }
    } catch (err: any) {
      console.error("Failed to load study plan:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("edni_access");
        localStorage.removeItem("edni_refresh");
        router.push("/login");
      } else {
        setError(
          err.response?.data?.detail ||
          "Unable to load your study plan."
        );
        setPlan(MOCK_PLAN);
        initializeTaskStatus(MOCK_PLAN);
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeTaskStatus = (studyPlan: StudyPlan) => {
    const status: Record<string, "pending" | "in_progress" | "completed"> = {};
    studyPlan.weeks.forEach((week) => {
      week.tasks.forEach((task) => {
        status[task.id || task.activity] = task.status || "pending";
      });
    });
    setTaskStatus(status);
  };

  const updateTaskStatus = async (taskId: string, newStatus: "pending" | "in_progress" | "completed") => {
    setTaskStatus((prev) => ({
      ...prev,
      [taskId]: newStatus,
    }));

    // Optional: sync with backend
    try {
      await axios.patch(
        `${API_URL}/tasks/${taskId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("edni_access")}`,
          },
        }
      );
    } catch (err) {
      console.warn("Failed to update task status on backend", err);
    }
  };

  const formatDuration = (hours: number) => {
    const minutes = Math.round(hours * 60);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) {
    return (
      <div style={styles.pageWrapper}>
        <Sidebar />
        <TopBar />
        <div style={styles.mainContent}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <h2 style={styles.loadingTitle}>
              Preparing your study plan...
            </h2>
            <p style={styles.loadingText}>
              Your personalized Week 1 plan is being generated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div style={styles.pageWrapper}>
        <Sidebar />
        <TopBar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>!</div>

            <h2 style={styles.errorTitle}>
              Study Plan Not Available
            </h2>

            <p style={styles.errorText}>{error}</p>

            <button
              onClick={fetchStudyPlan}
              style={styles.primaryButton}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan || !plan.weeks || plan.weeks.length === 0) {
    return (
      <div style={styles.pageWrapper}>
        <Sidebar />
        <TopBar />
        <div style={styles.mainContent}>
          <div style={styles.errorContainer}>
            <h2 style={styles.errorTitle}>
              No Study Plan Found
            </h2>

            <p style={styles.errorText}>
              Complete your diagnostic assessment to generate your
              personalized study plan.
            </p>

            <button
              onClick={() => router.push("/diagnostic")}
              style={styles.primaryButton}
            >
              Take Diagnostic
            </button>
          </div>
        </div>
      </div>
    );
  }

  const week = plan.weeks[0];

  const completedCount = Object.values(taskStatus).filter((s) => s === "completed").length;
  const inProgressCount = Object.values(taskStatus).filter((s) => s === "in_progress").length;

  const progress =
    week.tasks.length > 0
      ? Math.round((completedCount / week.tasks.length) * 100)
      : 0;

  return (
    <div style={styles.pageWrapper}>
      <Sidebar />
      <TopBar />

      <div style={styles.mainContent}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>PERSONALIZED LEARNING</div>

            <h1 style={styles.title}>Study Planner</h1>

            <p style={styles.subtitle}>
              Your adaptive learning plan based on your diagnostic results.
            </p>
          </div>

          <button
            onClick={fetchStudyPlan}
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </header>

        {/* Week Hero */}
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
                {completedCount}/{week.tasks.length}
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

        {/* Progress Bar */}
        <section style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span>Week 1 Progress</span>
            <strong>{progress}%</strong>
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
            <span style={{ color: "#10B981" }}>✓ {completedCount} completed</span>
            <span style={{ color: "#F59E0B" }}>⚡ {inProgressCount} in progress</span>
            <span style={{ color: "#9CA3AF" }}>○ {week.tasks.length - completedCount - inProgressCount} pending</span>
          </div>
        </section>

        {/* Main Content */}
        <div style={styles.contentGrid}>
          {/* Tasks */}
          <section style={styles.tasksSection}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  This Week's Tasks
                </h2>

                <p style={styles.sectionSubtitle}>
                  Complete these activities in order to build your
                  knowledge progressively.
                </p>
              </div>
            </div>

            <div style={styles.taskList}>
              {week.tasks.map((task, index) => {
                const taskId = task.id || task.activity;
                const status = taskStatus[taskId] || "pending";
                const bloomNumber = Number(task.bloom_level) || 3;
                const bloomLabel = BLOOM_LABELS[bloomNumber] || "Apply";
                const bloomColor = BLOOM_COLORS[bloomNumber] || "#10B981";
                const isExpanded = expandedTask === taskId;

                return (
                  <div
                    key={taskId}
                    style={{
                      ...styles.taskCard,
                      ...(status === "completed" ? styles.taskCardCompleted : {}),
                      ...(status === "in_progress" ? styles.taskCardInProgress : {}),
                    }}
                  >
                    {/* Task Header */}
                    <button
                      onClick={() => updateTaskStatus(taskId, status === "completed" ? "pending" : "completed")}
                      style={{
                        ...styles.checkbox,
                        ...(status === "completed" ? styles.checkboxCompleted : {}),
                        ...(status === "in_progress" ? styles.checkboxInProgress : {}),
                      }}
                      aria-label={
                        status === "completed"
                          ? "Mark task incomplete"
                          : "Mark task complete"
                      }
                      title={`Click to toggle: ${status}`}
                    >
                      {status === "completed" ? "✓" : status === "in_progress" ? "⚡" : index + 1}
                    </button>

                    {/* Task Content */}
                    <div style={styles.taskContent}>
                      <div style={styles.taskTopRow}>
                        <span
                          style={{
                            ...styles.bloomBadge,
                            backgroundColor: `${bloomColor}18`,
                            color: bloomColor,
                          }}
                        >
                          Bloom {bloomNumber} · {bloomLabel}
                        </span>

                        <span style={styles.duration}>
                          ⏱ {formatDuration(task.hours)}
                        </span>
                      </div>

                      <h3
                        style={{
                          ...styles.taskTitle,
                          ...(status === "completed" ? styles.taskTitleCompleted : {}),
                        }}
                      >
                        {task.activity}
                      </h3>

                      {task.concept || task.learning_area ? (
                        <div style={styles.taskMeta}>
                          {task.concept && (
                            <span>
                              <strong>Concept:</strong> {task.concept}
                            </span>
                          )}

                          {task.learning_area && (
                            <span>
                              <strong>Area:</strong> {task.learning_area}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* Status Controls */}
                      <div style={styles.taskActions}>
                        <button
                          onClick={() => updateTaskStatus(taskId, "in_progress")}
                          style={{
                            ...styles.actionButton,
                            ...(status === "in_progress" ? styles.actionButtonActive : {}),
                          }}
                        >
                          Start
                        </button>

                        <button
                          onClick={() => updateTaskStatus(taskId, "completed")}
                          style={{
                            ...styles.actionButton,
                            ...(status === "completed" ? styles.actionButtonActive : {}),
                          }}
                        >
                          Done
                        </button>

                        <button
                          onClick={() => updateTaskStatus(taskId, "pending")}
                          style={{
                            ...styles.actionButton,
                            ...(status === "pending" ? styles.actionButtonActive : {}),
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sidebar */}
          <aside style={styles.sidebar}>
            {/* Concepts */}
            <div style={styles.sideCard}>
              <h3 style={styles.sideTitle}>
                Focus Concepts
              </h3>

              <div style={styles.conceptList}>
                {week.concepts?.map((concept, index) => (
                  <div
                    key={index}
                    style={styles.conceptItem}
                  >
                    <span style={styles.conceptDot} />
                    <span>{concept}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloom Focus */}
            <div style={styles.sideCard}>
              <h3 style={styles.sideTitle}>
                Cognitive Focus
              </h3>

              <div style={styles.bloomList}>
                {week.bloom_focus?.map((focus, index) => (
                  <div
                    key={index}
                    style={styles.bloomItem}
                  >
                    <span style={styles.bloomIcon}>
                      {index + 1}
                    </span>

                    <span>{focus}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div style={styles.priorityCard}>
              <span style={styles.priorityLabel}>
                PRIORITY
              </span>

              <strong style={styles.priorityValue}>
                {week.priority || "High"}
              </strong>

              <p style={styles.priorityText}>
                This week focuses on the areas where your
                diagnostic assessment identified the greatest
                learning needs.
              </p>
            </div>

            {/* Quick Stats */}
            <div style={styles.statsCardSide}>
              <p style={styles.statsLabel}>Week Summary</p>
              <div style={styles.quickStats}>
                <div style={styles.quickStat}>
                  <span style={{ color: "#10B981", fontWeight: 700 }}>
                    {completedCount}
                  </span>
                  <span style={{ color: "#6B7280", fontSize: "12px" }}>
                    Completed
                  </span>
                </div>
                <div style={styles.quickStat}>
                  <span style={{ color: "#F59E0B", fontWeight: 700 }}>
                    {inProgressCount}
                  </span>
                  <span style={{ color: "#6B7280", fontSize: "12px" }}>
                    In Progress
                  </span>
                </div>
                <div style={styles.quickStat}>
                  <span style={{ color: "#6B7280", fontWeight: 700 }}>
                    {week.tasks.length - completedCount - inProgressCount}
                  </span>
                  <span style={{ color: "#6B7280", fontSize: "12px" }}>
                    Pending
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom Card */}
        <section style={styles.bottomCard}>
          <div>
            <h3 style={styles.bottomTitle}>
              Keep going
            </h3>

            <p style={styles.bottomText}>
              Complete Week 1 and take your next assessment.
              Your results will be used to adapt your next
              learning week.
            </p>
          </div>

          <div style={styles.weekIndicator}>
            <span style={styles.activeWeek}>1</span>

            <span style={styles.weekLine} />

            <span style={styles.futureWeek}>2</span>

            <span style={styles.weekLine} />

            <span style={styles.futureWeek}>3</span>

            <span style={styles.weekLine} />

            <span style={styles.futureWeek}>...</span>

            <span style={styles.weekLine} />

            <span style={styles.futureWeek}>16</span>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: "100vh",
    backgroundColor: "#FAFBFC",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },

  mainContent: {
    marginLeft: "240px",
    paddingTop: "64px",
    minHeight: "100vh",
    padding: "40px 32px",
  },

  header: {
    maxWidth: "1400px",
    margin: "0 auto 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
  },

  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: "#6366F1",
    marginBottom: "8px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#111827",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "#6B7280",
    fontSize: "15px",
  },

  refreshButton: {
    border: "1px solid #E5E7EB",
    background: "#ffffff",
    color: "#374151",
    borderRadius: "8px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s",
  },

  weekHero: {
    maxWidth: "1400px",
    margin: "0 auto",
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  },

  weekNumber: {
    color: "#6366F1",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "1px",
    marginBottom: "8px",
  },

  weekTheme: {
    margin: "8px 0 8px",
    fontSize: "28px",
    fontWeight: 700,
    color: "#111827",
  },

  milestone: {
    margin: 0,
    color: "#6B7280",
    fontSize: "15px",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "14px",
    marginTop: "28px",
  },

  statCard: {
    background: "#F9FAFB",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    border: "1px solid #E5E7EB",
  },

  statValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#111827",
  },

  statLabel: {
    color: "#6B7280",
    fontSize: "12px",
    fontWeight: 600,
  },

  progressSection: {
    maxWidth: "1400px",
    margin: "24px auto 32px",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "13px",
    color: "#6B7280",
    fontWeight: 500,
  },

  progressTrack: {
    height: "8px",
    background: "#E5E7EB",
    borderRadius: "99px",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    background: "#6366F1",
    borderRadius: "99px",
    transition: "width 0.3s ease",
  },

  progressStats: {
    display: "flex",
    gap: "20px",
    marginTop: "12px",
    fontSize: "13px",
    fontWeight: 500,
  },

  contentGrid: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: "24px",
    alignItems: "start",
  },

  tasksSection: {
    minWidth: 0,
  },

  sectionHeader: {
    marginBottom: "20px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#6B7280",
    fontSize: "14px",
  },

  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  taskCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "16px",
    transition: "all 0.2s ease",
  },

  taskCardCompleted: {
    opacity: 0.6,
    background: "#F9FAFB",
    borderColor: "#E5E7EB",
  },

  taskCardInProgress: {
    background: "#FFFFF0",
    borderColor: "#FCD34D",
  },

  checkbox: {
    flexShrink: 0,
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    border: "1.5px solid #D1D5DB",
    background: "#ffffff",
    color: "#6B7280",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxCompleted: {
    background: "#10B981",
    borderColor: "#10B981",
    color: "#ffffff",
  },

  checkboxInProgress: {
    background: "#FBBF24",
    borderColor: "#F59E0B",
    color: "#ffffff",
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
    marginBottom: "8px",
  },

  bloomBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: 700,
  },

  duration: {
    color: "#6B7280",
    fontSize: "12px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  taskTitle: {
    margin: 0,
    fontSize: "15px",
    lineHeight: 1.5,
    fontWeight: 600,
    color: "#111827",
  },

  taskTitleCompleted: {
    textDecoration: "line-through",
    opacity: 0.7,
  },

  taskMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 16px",
    marginTop: "8px",
    color: "#6B7280",
    fontSize: "12px",
  },

  taskActions: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },

  actionButton: {
    padding: "6px 12px",
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    transition: "all 0.2s",
  },

  actionButtonActive: {
    backgroundColor: "#6366F1",
    color: "#ffffff",
    borderColor: "#6366F1",
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  sideCard: {
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "16px",
  },

  sideTitle: {
    margin: "0 0 12px",
    fontSize: "13px",
    fontWeight: 700,
    color: "#111827",
  },

  conceptList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  conceptItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
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
    gap: "8px",
  },

  bloomItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#374151",
  },

  bloomIcon: {
    width: "22px",
    height: "22px",
    borderRadius: "6px",
    background: "#F3F4F6",
    color: "#6366F1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
  },

  priorityCard: {
    background: "#F3F4F6",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "14px",
  },

  priorityLabel: {
    display: "block",
    fontSize: "10px",
    letterSpacing: "0.5px",
    fontWeight: 700,
    color: "#6366F1",
    marginBottom: "4px",
  },

  priorityValue: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
  },

  priorityText: {
    margin: "8px 0 0",
    color: "#6B7280",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  statsCardSide: {
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "14px",
  },

  statsLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px",
  },

  quickStats: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  quickStat: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  bottomCard: {
    maxWidth: "1400px",
    margin: "32px auto 0",
    background: "#ffffff",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
  },

  bottomTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
  },

  bottomText: {
    margin: "4px 0 0",
    color: "#6B7280",
    fontSize: "13px",
  },

  weekIndicator: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: "8px",
  },

  activeWeek: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#6366F1",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "12px",
  },

  futureWeek: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#F3F4F6",
    color: "#9CA3AF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "11px",
  },

  weekLine: {
    width: "16px",
    height: "1px",
    background: "#D1D5DB",
  },

  loadingContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  spinner: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "3px solid #E5E7EB",
    borderTopColor: "#6366F1",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },

  loadingTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
  },

  loadingText: {
    marginTop: "8px",
    color: "#6B7280",
    fontSize: "14px",
  },

  errorContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    maxWidth: "500px",
    margin: "auto",
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
    marginBottom: "16px",
  },

  errorTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827",
  },

  errorText: {
    color: "#6B7280",
    fontSize: "14px",
    lineHeight: 1.6,
    margin: "12px 0 20px",
  },

  primaryButton: {
    border: "none",
    background: "#6366F1",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
  },
};