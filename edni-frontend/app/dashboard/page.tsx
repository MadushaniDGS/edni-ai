"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/* =========================================================
   TYPES
========================================================= */

interface DashboardData {
  overall_mastery: number;

  bloom_summary?: Record<string, number>;

  concept_progress?: Array<{
    concept: string;
    mastery: number;
    severity: number;
    area: string;
  }>;

  critical_gaps?: string[];

  total_study_time?: number;

  tasks_today?: number;

  tasks_completed?: number;

  feedback_cycle?: number;

  /*
    Optional backend fields.

    If your backend returns these, they will automatically
    appear in the dashboard.

    If they do not exist, we DON'T create fake values.
  */
  study_streak?: number;
  study_days?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  due_date?: string;
  status?: string;
}

interface LearningArea {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  description: string;
}

/* =========================================================
   LEARNING AREAS
========================================================= */

const LEARNING_AREAS: LearningArea[] = [
  {
    id: "data-structures-algorithms",
    label: "Data Structures & Algorithms",
    shortLabel: "DSA",
    emoji: "🧩",
    color: "#6366F1",
    description: "Algorithms, trees, graphs & problem solving",
  },
  {
    id: "software-quality-assurance",
    label: "Software Quality Assurance",
    shortLabel: "SQA",
    emoji: "🧪",
    color: "#10B981",
    description: "Testing, quality practices & automation",
  },
  {
    id: "software-engineering",
    label: "Software Engineering",
    shortLabel: "SE",
    emoji: "🏗️",
    color: "#F59E0B",
    description: "Design, development & engineering practices",
  },
  {
    id: "database-systems",
    label: "Database Systems",
    shortLabel: "DB",
    emoji: "🗄️",
    color: "#8B5CF6",
    description: "SQL, databases & data modelling",
  },
  {
    id: "programming-languages",
    label: "Programming Languages",
    shortLabel: "PL",
    emoji: "💻",
    color: "#EC4899",
    description: "Programming concepts & language fundamentals",
  },
];

/* =========================================================
   LEARNING AREA MODAL
========================================================= */

function LearningAreaSelector({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (areaId: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalTop}>
          <div>
            <div style={styles.modalEyebrow}>
              QUICK ASSESSMENT ✨
            </div>

            <h2 style={styles.modalTitle}>
              What do you want to practise?
            </h2>

            <p style={styles.modalSubtitle}>
              Choose a learning area and start your diagnostic.
            </p>
          </div>

          <button
            onClick={onClose}
            style={styles.closeButton}
          >
            ×
          </button>
        </div>

        <div style={styles.areaGrid}>
          {LEARNING_AREAS.map((area) => (
            <button
              key={area.id}
              onClick={() => onSelect(area.id)}
              style={{
                ...styles.areaCard,
                borderColor: `${area.color}35`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-4px)";
                e.currentTarget.style.borderColor =
                  area.color;
                e.currentTarget.style.boxShadow =
                  `0 14px 35px ${area.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  "translateY(0)";
                e.currentTarget.style.borderColor =
                  `${area.color}35`;
                e.currentTarget.style.boxShadow =
                  "none";
              }}
            >
              <div
                style={{
                  ...styles.areaEmoji,
                  backgroundColor: `${area.color}12`,
                }}
              >
                {area.emoji}
              </div>

              <div
                style={{
                  ...styles.areaShort,
                  color: area.color,
                }}
              >
                {area.shortLabel}
              </div>

              <div style={styles.areaLabel}>
                {area.label}
              </div>

              <div style={styles.areaDescription}>
                {area.description}
              </div>

              <div
                style={{
                  ...styles.areaArrow,
                  color: area.color,
                }}
              >
                →
              </div>
            </button>
          ))}
        </div>

        <div style={styles.modalTip}>
          💡 You can choose another subject whenever you start
          a new assessment.
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function ProgressRing({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const safeValue = Math.max(
    0,
    Math.min(100, value || 0)
  );

  return (
    <div style={styles.ring}>
      <div
        style={{
          ...styles.ringProgress,
          background: `conic-gradient(
            ${color} ${safeValue * 3.6}deg,
            #EEF2F7 ${safeValue * 3.6}deg
          )`,
        }}
      >
        <div style={styles.ringInner}>
          <strong>{Math.round(safeValue)}</strong>
          <span>%</span>
        </div>
      </div>
    </div>
  );
}

function DifficultyBadge({
  difficulty,
}: {
  difficulty?: string;
}) {
  const value = difficulty?.toLowerCase() || "normal";

  let color = "#10B981";
  let background = "#ECFDF5";

  if (value === "hard") {
    color = "#EF4444";
    background = "#FEF2F2";
  } else if (value === "medium") {
    color = "#F59E0B";
    background = "#FFFBEB";
  }

  return (
    <span
      style={{
        ...styles.difficulty,
        color,
        backgroundColor: background,
      }}
    >
      {difficulty || "Normal"}
    </span>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const router = useRouter();
  const fetchedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);

  const [showAreaSelector, setShowAreaSelector] =
    useState(false);

  const [selectedArea, setSelectedArea] =
    useState<string | null>(null);

  /* =======================================================
     FETCH DATA
  ======================================================= */

  useEffect(() => {
    const storedArea =
      localStorage.getItem("selected_learning_area");

    setSelectedArea(storedArea);

    if (fetchedRef.current) return;

    fetchedRef.current = true;

    async function fetchDashboard() {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("edni_access");

        if (!token) {
          router.replace("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [analyticsResult, tasksResult] =
          await Promise.allSettled([
            axios.get(`${API_URL}/analytics`, {
              headers,
            }),

            axios.get(`${API_URL}/tasks/?column=TODAY`, {
              headers,
            }),
          ]);

        if (
          analyticsResult.status === "fulfilled"
        ) {
          setDashboard(
            analyticsResult.value.data
          );
        }

        if (
          tasksResult.status === "fulfilled"
        ) {
          const data = tasksResult.value.data;

          setTasks(
            data.today ||
            data.tasks ||
            data.items ||
            []
          );
        }

        if (
          analyticsResult.status === "rejected" &&
          tasksResult.status === "rejected"
        ) {
          setError(
            "Unable to load your learning data."
          );
        }
      } catch (err) {
        console.error(err);
        setError(
          "Something went wrong while loading your dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [router]);

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const completedTasks = dashboard?.tasks_completed ?? 0;

  const totalTasks =
    dashboard?.tasks_today ?? tasks.length;

  const taskCompletion =
    totalTasks > 0
      ? Math.min(
        100,
        Math.round(
          (completedTasks / totalTasks) * 100
        )
      )
      : 0;

  const mastery =
    dashboard?.overall_mastery ?? 0;

  const masteryColor =
    mastery >= 70
      ? "#10B981"
      : mastery >= 50
        ? "#F59E0B"
        : "#EF4444";

  const topGaps = useMemo(() => {
    return (
      dashboard?.critical_gaps?.slice(0, 3) ?? []
    );
  }, [dashboard]);

  const currentArea = LEARNING_AREAS.find(
    (area) => area.id === selectedArea
  );

  /* =======================================================
     ACTIONS
  ======================================================= */

  function handleSelectArea(areaId: string) {
    setSelectedArea(areaId);

    localStorage.setItem(
      "selected_learning_area",
      areaId
    );

    setShowAreaSelector(false);

    router.push(
      `/diagnostic?area=${encodeURIComponent(areaId)}`
    );
  }

  function openAssessment() {
    setShowAreaSelector(true);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingSticker}>
          🌱
        </div>

        <div style={styles.loadingTitle}>
          Getting your study space ready...
        </div>

        <div style={styles.loadingText}>
          Checking your latest progress ✨
        </div>

        <div style={styles.loadingDots}>
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.errorEmoji}>
          😕
        </div>

        <h2 style={styles.errorTitle}>
          We couldn't load your dashboard
        </h2>

        <p style={styles.errorText}>
          {error ||
            "Please check your connection and try again."}
        </p>

        <button
          onClick={() => window.location.reload()}
          style={styles.retryButton}
        >
          Try again
        </button>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div style={styles.page}>
      <Sidebar />
      <TopBar />

      <main style={styles.main}>
        <div style={styles.container}>

          {/* =================================================
              WELCOME HEADER
          ================================================= */}

          <section style={styles.welcomeSection}>
            <div>
              <div style={styles.miniGreeting}>
                ✨ YOUR LEARNING SPACE
              </div>

              <h1 style={styles.mainTitle}>
                Keep going,
                <br />
                <span style={styles.gradientText}>
                  you're doing great.
                </span>{" "}
                🌷
              </h1>

              <p style={styles.mainSubtitle}>
                Here's a little look at your learning
                journey today.
              </p>
            </div>

            <div style={styles.headerSticker}>
              <div style={styles.stickerEmoji}>
                📚
              </div>

              <div>
                <div style={styles.stickerTitle}>
                  Keep learning
                </div>

                <div style={styles.stickerText}>
                  One small step at a time 💜
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              TODAY HERO
          ================================================= */}

          <section style={styles.todayHero}>
            <div style={styles.todayLeft}>
              <div style={styles.todayBadge}>
                ☀️ TODAY
              </div>

              <h2 style={styles.todayTitle}>
                Your study day
              </h2>

              <p style={styles.todayText}>
                {tasks.length > 0
                  ? `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"
                  } waiting for you today.`
                  : "Your study list is clear today. Nice work! 🎉"}
              </p>

              <div style={styles.todayProgress}>
                <div
                  style={styles.todayProgressTrack}
                >
                  <div
                    style={{
                      ...styles.todayProgressFill,
                      width: `${taskCompletion}%`,
                    }}
                  />
                </div>

                <div style={styles.todayProgressText}>
                  <strong>
                    {completedTasks}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {totalTasks}
                  </strong>{" "}
                  tasks completed
                  <span>
                    {taskCompletion}%
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.todayIllustration}>
              <div style={styles.cloudOne}>
                ☁️
              </div>

              <div style={styles.studyEmoji}>
                🧑‍💻
              </div>

              <div style={styles.sparkleOne}>
                ✦
              </div>

              <div style={styles.sparkleTwo}>
                ✧
              </div>

              <div style={styles.flower}>
                🌸
              </div>
            </div>
          </section>

          {/* =================================================
              QUICK STATS
          ================================================= */}

          <section style={styles.statsGrid}>

            {/* MASTERY */}

            <div style={styles.statCard}>
              <div style={styles.statIconPurple}>
                🎯
              </div>

              <div style={styles.statContent}>
                <div style={styles.statLabel}>
                  OVERALL MASTERY
                </div>

                <div
                  style={{
                    ...styles.statNumber,
                    color: masteryColor,
                  }}
                >
                  {Math.round(mastery)}
                  <span>%</span>
                </div>

                <div style={styles.statHint}>
                  Your current knowledge level
                </div>
              </div>

              <ProgressRing
                value={mastery}
                color={masteryColor}
              />
            </div>

            {/* STUDY TIME */}

            <div style={styles.statCard}>
              <div style={styles.statIconBlue}>
                ⏱️
              </div>

              <div style={styles.statContent}>
                <div style={styles.statLabel}>
                  STUDY TIME
                </div>

                <div style={styles.statNumber}>
                  {(
                    dashboard.total_study_time ?? 0
                  ).toFixed(1)}
                  <span>h</span>
                </div>

                <div style={styles.statHint}>
                  Total recorded learning time
                </div>
              </div>

              <div style={styles.hourVisual}>
                <div>🌙</div>
                <div style={styles.hourDots}>
                  • • • •
                </div>
              </div>
            </div>

            {/* STREAK */}

            <div style={styles.statCard}>
              <div style={styles.statIconOrange}>
                🔥
              </div>

              <div style={styles.statContent}>
                <div style={styles.statLabel}>
                  STUDY STREAK
                </div>

                <div style={styles.statNumber}>
                  {dashboard.study_streak ??
                    dashboard.study_days ??
                    "—"}
                  <span>
                    {dashboard.study_streak !==
                      undefined ||
                      dashboard.study_days !==
                      undefined
                      ? " days"
                      : ""}
                  </span>
                </div>

                <div style={styles.statHint}>
                  Keep the learning flame alive
                </div>
              </div>

              <div style={styles.fireSticker}>
                🔥
              </div>
            </div>

            {/* TASKS */}

            <div style={styles.statCard}>
              <div style={styles.statIconGreen}>
                ✅
              </div>

              <div style={styles.statContent}>
                <div style={styles.statLabel}>
                  TODAY'S PROGRESS
                </div>

                <div style={styles.statNumber}>
                  {completedTasks}
                  <span>
                    /{totalTasks}
                  </span>
                </div>

                <div style={styles.statHint}>
                  {taskCompletion}% completed
                </div>
              </div>

              <div style={styles.checkSticker}>
                ✓
              </div>
            </div>
          </section>

          {/* =================================================
              QUICK ACCESS
          ================================================= */}

          <section style={styles.quickSection}>
            <div style={styles.sectionHeading}>
              <div>
                <div style={styles.sectionEyebrow}>
                  QUICK ACCESS ⚡
                </div>

                <h2 style={styles.sectionTitle}>
                  Ready for a quick assessment?
                </h2>

                <p style={styles.sectionSubtitle}>
                  Pick a learning area and jump straight
                  into your diagnostic.
                </p>
              </div>

              {currentArea && (
                <div style={styles.currentAreaBadge}>
                  {currentArea.emoji}{" "}
                  {currentArea.shortLabel}
                </div>
              )}
            </div>

            <div style={styles.quickGrid}>
              {LEARNING_AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() =>
                    handleSelectArea(area.id)
                  }
                  style={{
                    ...styles.quickCard,
                    borderColor: `${area.color}25`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      `0 16px 35px ${area.color}18`;
                    e.currentTarget.style.borderColor =
                      `${area.color}70`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "none";
                    e.currentTarget.style.borderColor =
                      `${area.color}25`;
                  }}
                >
                  <div
                    style={{
                      ...styles.quickEmoji,
                      backgroundColor: `${area.color}12`,
                    }}
                  >
                    {area.emoji}
                  </div>

                  <div style={styles.quickText}>
                    <strong
                      style={{
                        color: area.color,
                      }}
                    >
                      {area.shortLabel}
                    </strong>

                    <span>
                      {area.label}
                    </span>
                  </div>

                  <div
                    style={{
                      ...styles.quickArrow,
                      color: area.color,
                    }}
                  >
                    →
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <section style={styles.contentGrid}>

            {/* TODAY TASKS */}

            <div style={styles.largeCard}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardEyebrow}>
                    TODAY'S PLAN 📝
                  </div>

                  <h2 style={styles.cardTitle}>
                    Little things to finish
                  </h2>
                </div>

                <div style={styles.cardCount}>
                  {tasks.length}
                </div>
              </div>

              {tasks.length > 0 ? (
                <div style={styles.taskList}>
                  {tasks
                    .slice(0, 5)
                    .map((task, index) => {
                      const completed =
                        task.status?.toLowerCase() ===
                        "completed";

                      return (
                        <div
                          key={
                            task.id || index
                          }
                          style={{
                            ...styles.taskItem,
                            opacity: completed
                              ? 0.62
                              : 1,
                          }}
                        >
                          <div
                            style={{
                              ...styles.taskCheck,
                              backgroundColor:
                                completed
                                  ? "#10B981"
                                  : "#FFFFFF",
                              borderColor:
                                completed
                                  ? "#10B981"
                                  : "#D7DCE5",
                            }}
                          >
                            {completed
                              ? "✓"
                              : ""}
                          </div>

                          <div
                            style={
                              styles.taskMain
                            }
                          >
                            <div
                              style={{
                                ...styles.taskTitle,
                                textDecoration:
                                  completed
                                    ? "line-through"
                                    : "none",
                              }}
                            >
                              {task.title}
                            </div>

                            {task.description && (
                              <div
                                style={
                                  styles.taskDescription
                                }
                              >
                                {
                                  task.description
                                }
                              </div>
                            )}
                          </div>

                          <DifficultyBadge
                            difficulty={
                              task.difficulty
                            }
                          />
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={styles.emptyTasks}>
                  <div style={styles.emptySticker}>
                    🌈
                  </div>

                  <strong>
                    You're all caught up!
                  </strong>

                  <span>
                    No tasks waiting for you today.
                  </span>
                </div>
              )}

              {tasks.length > 5 && (
                <button
                  onClick={() =>
                    router.push(
                      "/study-planner"
                    )
                  }
                  style={styles.viewButton}
                >
                  View all tasks →
                </button>
              )}
            </div>

            {/* KNOWLEDGE GAPS */}

            <div style={styles.largeCard}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardEyebrow}>
                    FOCUS AREAS 🎯
                  </div>

                  <h2 style={styles.cardTitle}>
                    Things to practise
                  </h2>
                </div>

                <button
                  onClick={() =>
                    router.push(
                      "/learning-resources"
                    )
                  }
                  style={styles.resourcesButton}
                >
                  Resources
                </button>
              </div>

              {topGaps.length > 0 ? (
                <div style={styles.gapList}>
                  {topGaps.map(
                    (gap, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          router.push(
                            `/learning-resources?gap=${encodeURIComponent(
                              gap
                            )}`
                          )
                        }
                        style={
                          styles.gapItem
                        }
                      >
                        <div
                          style={
                            styles.gapEmoji
                          }
                        >
                          {index === 0
                            ? "🌱"
                            : index === 1
                              ? "📖"
                              : "💡"}
                        </div>

                        <div
                          style={
                            styles.gapMain
                          }
                        >
                          <strong>
                            {gap}
                          </strong>

                          <span>
                            A little more practice
                            will help here
                          </span>
                        </div>

                        <span
                          style={
                            styles.gapArrow
                          }
                        >
                          →
                        </span>
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div style={styles.emptyTasks}>
                  <div style={styles.emptySticker}>
                    🌸
                  </div>

                  <strong>
                    No critical gaps
                  </strong>

                  <span>
                    Your current profile looks
                    healthy.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              STUDY JOURNEY
          ================================================= */}

          <section style={styles.journeyCard}>
            <div style={styles.journeyLeft}>
              <div style={styles.journeySticker}>
                🐣
              </div>

              <div>
                <div style={styles.cardEyebrow}>
                  YOUR LEARNING JOURNEY
                </div>

                <h2 style={styles.journeyTitle}>
                  Small progress becomes big progress.
                </h2>

                <p style={styles.journeyText}>
                  Keep showing up, complete today's
                  tasks, and build your study streak
                  one day at a time.
                </p>
              </div>
            </div>

            <div style={styles.journeyPath}>
              <div style={styles.pathLine} />

              <div style={styles.pathPoint}>
                <span>🌱</span>
                <small>Start</small>
              </div>

              <div style={styles.pathPoint}>
                <span>📚</span>
                <small>Learn</small>
              </div>

              <div style={styles.pathPoint}>
                <span>🧠</span>
                <small>Practise</small>
              </div>

              <div style={styles.pathPoint}>
                <span>🏆</span>
                <small>Master</small>
              </div>
            </div>
          </section>

          {/* =================================================
              FINAL CTA
          ================================================= */}

          <section style={styles.bottomCta}>
            <div style={styles.ctaDecoration}>
              ✦
            </div>

            <div>
              <div style={styles.ctaEyebrow}>
                KEEP GOING 💜
              </div>

              <h2 style={styles.ctaTitle}>
                Ready for your next learning step?
              </h2>

              <p style={styles.ctaText}>
                Take a quick assessment and let Edni
                understand what you should focus on next.
              </p>
            </div>

            <button
              onClick={openAssessment}
              style={styles.ctaButton}
            >
              <span>＋</span>
              New Assessment
            </button>
          </section>
        </div>
      </main>

      {/* =====================================================
          MODAL
      ===================================================== */}

      <LearningAreaSelector
        isOpen={showAreaSelector}
        onClose={() =>
          setShowAreaSelector(false)
        }
        onSelect={handleSelectArea}
      />

      {/* =====================================================
          ANIMATIONS
      ===================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        button {
          font-family: inherit;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 800px) {
          .dashboard-container {
            padding: 25px 18px !important;
          }
        }

        @media (max-width: 600px) {
          .dashboard-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .dashboard-stats {
            grid-template-columns: 1fr !important;
          }

          .dashboard-quick {
            grid-template-columns: 1fr !important;
          }

          .dashboard-content {
            grid-template-columns: 1fr !important;
          }

          .dashboard-today {
            flex-direction: column !important;
          }

          .dashboard-cta {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #FCFCFF 0%, #F7F8FC 100%)",
    color: "#172033",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  main: {
    marginLeft: "240px",
    paddingTop: "64px",
    minHeight: "100vh",
  },

  container: {
    maxWidth: "1450px",
    margin: "0 auto",
    padding: "34px 34px 70px",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  welcomeSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
    marginBottom: "28px",
  },

  miniGreeting: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#8B5CF6",
    marginBottom: "8px",
  },

  mainTitle: {
    margin: 0,
    fontSize: "35px",
    lineHeight: 1.14,
    fontWeight: 800,
    letterSpacing: "-0.035em",
    color: "#182033",
  },

  gradientText: {
    background:
      "linear-gradient(90deg, #6366F1, #A855F7, #EC4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  mainSubtitle: {
    margin: "9px 0 0",
    fontSize: "13px",
    color: "#7B8496",
  },

  headerSticker: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "12px 15px",
    borderRadius: "15px",
    background: "#FFFFFF",
    border: "1px solid #ECECF5",
    boxShadow:
      "0 8px 25px rgba(99, 102, 241, 0.06)",
  },

  stickerEmoji: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    background: "#F3F0FF",
    fontSize: "23px",
  },

  stickerTitle: {
    fontSize: "12px",
    fontWeight: 750,
    color: "#3C4254",
  },

  stickerText: {
    marginTop: "3px",
    fontSize: "10px",
    color: "#969EAF",
  },

  /* =======================================================
     TODAY
  ======================================================= */

  todayHero: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: "190px",
    padding: "27px 31px",
    marginBottom: "18px",
    borderRadius: "20px",
    background:
      "linear-gradient(120deg, #F0EEFF 0%, #FAF7FF 50%, #FFF5FA 100%)",
    border: "1px solid #E9E4FF",
  },

  todayLeft: {
    position: "relative",
    zIndex: 2,
    maxWidth: "620px",
  },

  todayBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "99px",
    background: "#FFFFFF",
    color: "#7C3AED",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    boxShadow:
      "0 5px 15px rgba(124, 58, 237, 0.08)",
  },

  todayTitle: {
    margin: "13px 0 5px",
    fontSize: "23px",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    color: "#292C43",
  },

  todayText: {
    margin: 0,
    fontSize: "12px",
    color: "#777C91",
  },

  todayProgress: {
    marginTop: "19px",
    maxWidth: "430px",
  },

  todayProgressTrack: {
    width: "100%",
    height: "8px",
    borderRadius: "99px",
    background: "#E8E4F6",
    overflow: "hidden",
  },

  todayProgressFill: {
    height: "100%",
    borderRadius: "99px",
    background:
      "linear-gradient(90deg, #6366F1, #A855F7)",
    transition: "width 0.5s ease",
  },

  todayProgressText: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    marginTop: "7px",
    fontSize: "10px",
    color: "#8A8FA3",
  },

  todayIllustration: {
    position: "relative",
    width: "230px",
    height: "150px",
    flexShrink: 0,
  },

  cloudOne: {
    position: "absolute",
    right: "22px",
    top: "5px",
    fontSize: "38px",
    opacity: 0.65,
  },

  studyEmoji: {
    position: "absolute",
    right: "70px",
    bottom: "4px",
    fontSize: "78px",
    animation: "float 3s ease-in-out infinite",
  },

  sparkleOne: {
    position: "absolute",
    right: "170px",
    top: "35px",
    color: "#8B5CF6",
    fontSize: "23px",
  },

  sparkleTwo: {
    position: "absolute",
    right: "35px",
    bottom: "48px",
    color: "#EC4899",
    fontSize: "17px",
  },

  flower: {
    position: "absolute",
    left: "15px",
    bottom: "5px",
    fontSize: "34px",
  },

  /* =======================================================
     STATS
  ======================================================= */

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(235px, 1fr))",
    gap: "14px",
    marginBottom: "25px",
  },

  statCard: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minHeight: "128px",
    padding: "18px",
    background: "#FFFFFF",
    border: "1px solid #EAECF2",
    borderRadius: "16px",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.025)",
  },

  statIconPurple: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    background: "#F1EEFF",
    fontSize: "19px",
    flexShrink: 0,
  },

  statIconBlue: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    background: "#EFF6FF",
    fontSize: "19px",
    flexShrink: 0,
  },

  statIconOrange: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    background: "#FFF7ED",
    fontSize: "19px",
    flexShrink: 0,
  },

  statIconGreen: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    background: "#ECFDF5",
    fontSize: "19px",
    flexShrink: 0,
  },

  statContent: {
    minWidth: 0,
    flex: 1,
  },

  statLabel: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#A1A8B7",
    marginBottom: "6px",
  },

  statNumber: {
    fontSize: "25px",
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#202638",
  },

  statHint: {
    marginTop: "6px",
    fontSize: "9px",
    color: "#9BA2B1",
    whiteSpace: "nowrap",
  },

  ring: {
    width: "52px",
    height: "52px",
    flexShrink: 0,
  },

  ringProgress: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  ringInner: {
    width: "41px",
    height: "41px",
    borderRadius: "50%",
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1px",
    color: "#34394A",
  },

  hourVisual: {
    width: "52px",
    height: "52px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#F8FAFF",
    fontSize: "20px",
    flexShrink: 0,
  },

  hourDots: {
    marginTop: "-2px",
    fontSize: "7px",
    color: "#93C5FD",
    letterSpacing: "2px",
  },

  fireSticker: {
    fontSize: "34px",
    animation: "float 2.8s ease-in-out infinite",
  },

  checkSticker: {
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#ECFDF5",
    color: "#10B981",
    fontSize: "22px",
    fontWeight: 800,
  },

  /* =======================================================
     QUICK ACCESS
  ======================================================= */

  quickSection: {
    marginBottom: "20px",
  },

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "13px",
  },

  sectionEyebrow: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#A0A7B7",
    marginBottom: "5px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 800,
    color: "#252A3B",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    fontSize: "11px",
    color: "#969DAC",
  },

  currentAreaBadge: {
    padding: "7px 11px",
    borderRadius: "99px",
    background: "#F5F3FF",
    color: "#7C3AED",
    fontSize: "10px",
    fontWeight: 750,
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "11px",
  },

  quickCard: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minHeight: "75px",
    padding: "12px",
    background: "#FFFFFF",
    border: "1px solid",
    borderRadius: "13px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  },

  quickEmoji: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    fontSize: "20px",
    flexShrink: 0,
  },

  quickText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },

  quickArrow: {
    marginLeft: "auto",
    fontSize: "17px",
    fontWeight: 700,
  },

  /* =======================================================
     CONTENT
  ======================================================= */

  contentGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(430px, 1fr))",
    gap: "15px",
    marginBottom: "18px",
  },

  largeCard: {
    padding: "20px",
    background: "#FFFFFF",
    border: "1px solid #EAECF2",
    borderRadius: "17px",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.025)",
  },

  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "15px",
  },

  cardEyebrow: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.11em",
    color: "#A0A7B7",
    marginBottom: "5px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 800,
    color: "#272C3C",
  },

  cardCount: {
    minWidth: "28px",
    height: "28px",
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9px",
    background: "#F1EEFF",
    color: "#7C3AED",
    fontSize: "11px",
    fontWeight: 800,
  },

  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  taskItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "11px",
    background: "#FAFBFD",
    border: "1px solid #F0F1F5",
  },

  taskCheck: {
    width: "19px",
    height: "19px",
    borderRadius: "6px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: "11px",
    fontWeight: 800,
    flexShrink: 0,
  },

  taskMain: {
    flex: 1,
    minWidth: 0,
  },

  taskTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#404758",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  taskDescription: {
    marginTop: "3px",
    fontSize: "9px",
    color: "#9AA1AF",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  difficulty: {
    padding: "5px 7px",
    borderRadius: "6px",
    fontSize: "8px",
    fontWeight: 800,
    flexShrink: 0,
  },

  emptyTasks: {
    minHeight: "180px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#555C6C",
  },

  emptySticker: {
    fontSize: "38px",
    marginBottom: "9px",
  },

  viewButton: {
    width: "100%",
    marginTop: "11px",
    padding: "9px",
    border: "none",
    borderRadius: "8px",
    background: "#F5F3FF",
    color: "#7C3AED",
    fontSize: "10px",
    fontWeight: 750,
    cursor: "pointer",
  },

  resourcesButton: {
    border: "none",
    background: "#F5F3FF",
    color: "#7C3AED",
    borderRadius: "8px",
    padding: "7px 10px",
    fontSize: "9px",
    fontWeight: 750,
    cursor: "pointer",
  },

  gapList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },

  gapItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "11px",
    borderRadius: "11px",
    background: "#FFF9FA",
    border: "1px solid #FCE7F3",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.18s ease",
  },

  gapEmoji: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    background: "#FFFFFF",
    fontSize: "18px",
    flexShrink: 0,
  },

  gapMain: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    minWidth: 0,
  },

  gapArrow: {
    color: "#EC4899",
    fontSize: "16px",
    fontWeight: 700,
  },

  /* =======================================================
     JOURNEY
  ======================================================= */

  journeyCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
    padding: "21px 23px",
    marginBottom: "18px",
    borderRadius: "17px",
    background:
      "linear-gradient(110deg, #FFFFFF, #FAF8FF)",
    border: "1px solid #EDE8FF",
  },

  journeyLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  journeySticker: {
    width: "53px",
    height: "53px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "15px",
    background: "#F4F1FF",
    fontSize: "28px",
  },

  journeyTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 800,
    color: "#292D40",
  },

  journeyText: {
    maxWidth: "600px",
    margin: "5px 0 0",
    fontSize: "10px",
    lineHeight: 1.5,
    color: "#9299A8",
  },

  journeyPath: {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "390px",
    flexShrink: 0,
  },

  pathLine: {
    position: "absolute",
    left: "18px",
    right: "18px",
    top: "17px",
    height: "2px",
    background:
      "linear-gradient(90deg, #C4B5FD, #FBCFE8)",
  },

  pathPoint: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
  },

  /* =======================================================
     CTA
  ======================================================= */

  bottomCta: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "25px",
    padding: "23px 25px",
    borderRadius: "17px",
    background:
      "linear-gradient(110deg, #F1EEFF, #FFF0F7)",
    border: "1px solid #E9E1FF",
  },

  ctaDecoration: {
    position: "absolute",
    right: "180px",
    top: "5px",
    fontSize: "70px",
    color: "#DDD6FE",
    opacity: 0.45,
  },

  ctaEyebrow: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#8B5CF6",
    marginBottom: "5px",
  },

  ctaTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 800,
    color: "#292D40",
  },

  ctaText: {
    maxWidth: "620px",
    margin: "5px 0 0",
    fontSize: "10px",
    color: "#8C92A2",
  },

  ctaButton: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 15px",
    border: "none",
    borderRadius: "10px",
    background: "#6366F1",
    color: "#FFFFFF",
    fontSize: "11px",
    fontWeight: 750,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow:
      "0 8px 20px rgba(99, 102, 241, 0.22)",
  },

  /* =======================================================
     MODAL
  ======================================================= */

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "rgba(15, 23, 42, 0.42)",
    backdropFilter: "blur(7px)",
  },

  modal: {
    width: "100%",
    maxWidth: "780px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "27px",
    borderRadius: "20px",
    background: "#FFFFFF",
    boxShadow:
      "0 35px 90px rgba(15, 23, 42, 0.25)",
  },

  modalTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  modalEyebrow: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#8B5CF6",
    marginBottom: "6px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
    color: "#252A3B",
  },

  modalSubtitle: {
    margin: "6px 0 0",
    fontSize: "11px",
    color: "#8C93A3",
  },

  closeButton: {
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "9px",
    background: "#F5F6FA",
    color: "#6B7280",
    fontSize: "20px",
    cursor: "pointer",
  },

  areaGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "10px",
  },

  areaCard: {
    position: "relative",
    minHeight: "145px",
    padding: "15px",
    border: "1px solid",
    borderRadius: "13px",
    background: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s ease",
  },

  areaEmoji: {
    width: "38px",
    height: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    fontSize: "19px",
    marginBottom: "10px",
  },

  areaShort: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginBottom: "3px",
  },

  areaLabel: {
    maxWidth: "170px",
    fontSize: "12px",
    fontWeight: 750,
    lineHeight: 1.35,
    color: "#363B4B",
  },

  areaDescription: {
    marginTop: "5px",
    maxWidth: "175px",
    fontSize: "9px",
    lineHeight: 1.4,
    color: "#9AA1AF",
  },

  areaArrow: {
    position: "absolute",
    right: "13px",
    bottom: "12px",
    fontSize: "17px",
    fontWeight: 700,
  },

  modalTip: {
    marginTop: "17px",
    padding: "10px",
    borderRadius: "9px",
    background: "#F8FAFC",
    color: "#858D9D",
    fontSize: "9px",
    textAlign: "center",
  },

  /* =======================================================
     LOADING / ERROR
  ======================================================= */

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#F8F8FC",
  },

  loadingSticker: {
    fontSize: "46px",
    animation: "float 2s ease-in-out infinite",
  },

  loadingTitle: {
    marginTop: "15px",
    fontSize: "14px",
    fontWeight: 750,
    color: "#454B5D",
  },

  loadingText: {
    marginTop: "5px",
    fontSize: "10px",
    color: "#9AA1AF",
  },

  loadingDots: {
    marginTop: "9px",
    color: "#8B5CF6",
    letterSpacing: "4px",
    animation: "pulse 1.3s infinite",
  },

  errorEmoji: {
    fontSize: "48px",
  },

  errorTitle: {
    margin: "12px 0 4px",
    fontSize: "17px",
    color: "#353A4B",
  },

  errorText: {
    margin: 0,
    fontSize: "11px",
    color: "#8C93A3",
  },

  retryButton: {
    marginTop: "15px",
    border: "none",
    borderRadius: "9px",
    padding: "9px 14px",
    background: "#6366F1",
    color: "#FFFFFF",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
};