"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import axios from "axios";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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
   PROGRESS RING
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
    <div style={styles.ringLarge}>
      <div
        style={{
          ...styles.ringLargeProgress,
          background: `conic-gradient(
            ${color} ${safeValue * 3.6}deg,
            #EEF2F7 ${safeValue * 3.6}deg
          )`,
        }}
      >
        <div style={styles.ringLargeInner}>
          <strong>{Math.round(safeValue)}</strong>
          <span>%</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DIFFICULTY
========================================================= */

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
   MINI CALENDAR
========================================================= */

function MiniCalendar() {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    setDate(new Date());
  }, []);

  if (!date) {
    return (
      <div style={styles.calendarCard}>
        <div style={styles.calendarLoading}>
          Loading calendar...
        </div>
      </div>
    );
  }

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const monthName = date.toLocaleString("default", {
    month: "long",
  });

  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div style={styles.calendarCard}>
      <div style={styles.calendarHeader}>
        <div>
          <div style={styles.calendarEyebrow}>
            TODAY
          </div>

          <div style={styles.calendarMonth}>
            {monthName} {year}
          </div>
        </div>

        <div style={styles.calendarToday}>
          {date.getDate()}
        </div>
      </div>

      <div style={styles.weekHeader}>
        {["S", "M", "T", "W", "T", "F", "S"].map(
          (day, index) => (
            <span key={`${day}-${index}`}>
              {day}
            </span>
          )
        )}
      </div>

      <div style={styles.calendarGrid}>
        {days.map((day, index) => {
          const isToday =
            day === date.getDate();

          return (
            <div
              key={index}
              style={{
                ...styles.calendarDay,
                ...(isToday
                  ? styles.calendarDayToday
                  : {}),
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   BLOOM NAMES
========================================================= */

const BLOOM_NAMES: Record<string, string> = {
  "1": "Remember",
  "2": "Understand",
  "3": "Apply",
  "4": "Analyze",
  "5": "Evaluate",
  "6": "Create",
};

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
      localStorage.getItem(
        "selected_learning_area"
      );

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

        const [
          analyticsResult,
          tasksResult,
        ] = await Promise.allSettled([
          axios.get(`${API_URL}/analytics`, {
            headers,
          }),

          axios.get(
            `${API_URL}/tasks/?column=TODAY`,
            {
              headers,
            }
          ),
        ]);

        if (
          analyticsResult.status ===
          "fulfilled"
        ) {
          setDashboard(
            analyticsResult.value.data
          );
        }

        if (
          tasksResult.status === "fulfilled"
        ) {
          const data =
            tasksResult.value.data;

          setTasks(
            data.today ||
            data.tasks ||
            data.items ||
            []
          );
        }

        if (
          analyticsResult.status ===
          "rejected" &&
          tasksResult.status ===
          "rejected"
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

  const completedTasks =
    dashboard?.tasks_completed ?? 0;

  const totalTasks =
    dashboard?.tasks_today ?? tasks.length;

  const taskCompletion =
    totalTasks > 0
      ? Math.min(
        100,
        Math.round(
          (completedTasks / totalTasks) *
          100
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
      dashboard?.critical_gaps?.slice(0, 5) ??
      []
    );
  }, [dashboard]);

  const currentArea =
    LEARNING_AREAS.find(
      (area) => area.id === selectedArea
    );

  /* =======================================================
     REAL MASTERY DATA
  ======================================================= */

  const masteryData = useMemo(() => {
    return (
      dashboard?.concept_progress
        ?.filter(
          (item) =>
            typeof item.mastery === "number"
        )
        .sort(
          (a, b) => b.mastery - a.mastery
        )
        .slice(0, 7)
        .map((item) => ({
          concept:
            item.concept.length > 17
              ? `${item.concept.slice(
                0,
                17
              )}...`
              : item.concept,
          mastery: Math.round(item.mastery),
        })) ?? []
    );
  }, [dashboard]);

  /* =======================================================
     REAL BLOOM DATA
  ======================================================= */

  const bloomData = useMemo(() => {
    return Object.entries(
      dashboard?.bloom_summary ?? {}
    ).map(([level, value]) => ({
      name:
        BLOOM_NAMES[level] ??
        `Level ${level}`,
      value,
      level,
    }));
  }, [dashboard]);

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
      `/diagnostic?area=${encodeURIComponent(
        areaId
      )}`
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
          onClick={() =>
            window.location.reload()
          }
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



      <main style={styles.main}><TopBar />
        <div style={styles.container}>

          {/* =================================================
              HEADER
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
                Here's a little look at your
                learning journey today.
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
              TWO COLUMN DASHBOARD
          ================================================= */}

          <div style={styles.dashboardMainGrid}>

            {/* =================================================
                LEFT COLUMN
            ================================================= */}

            <div style={styles.leftColumn}>

              {/* OVERALL LEARNER SCORE */}

              <section style={styles.scoreCard}>
                <div style={styles.scoreContent}>
                  <div style={styles.cardEyebrow}>
                    LEARNER SCORE 🎯
                  </div>

                  <h2 style={styles.scoreTitle}>
                    Your overall mastery
                  </h2>

                  <p style={styles.scoreDescription}>
                    Your current knowledge level
                    based on your latest learning
                    data.
                  </p>

                  <div style={styles.scoreMeta}>
                    {currentArea ? (
                      <span
                        style={
                          styles.areaPill
                        }
                      >
                        {currentArea.emoji}{" "}
                        {currentArea.shortLabel}
                      </span>
                    ) : (
                      <span
                        style={
                          styles.areaPill
                        }
                      >
                        All learning areas
                      </span>
                    )}

                    {dashboard.feedback_cycle !==
                      undefined && (
                        <span
                          style={
                            styles.cyclePill
                          }
                        >
                          Cycle{" "}
                          {
                            dashboard.feedback_cycle
                          }
                        </span>
                      )}
                  </div>
                </div>

                <ProgressRing
                  value={mastery}
                  color={masteryColor}
                />
              </section>

              {/* =================================================
                  LEARNER SNAPSHOT / RICH VISUAL
              ================================================= */}

              <section style={styles.snapshotCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardEyebrow}>
                      LEARNER SNAPSHOT 🧠
                    </div>

                    <h2 style={styles.cardTitle}>
                      Your learning picture
                    </h2>
                  </div>

                  <span style={styles.liveBadge}>
                    LIVE DATA
                  </span>
                </div>

                <div style={styles.snapshotVisual}>

                  <div style={styles.snapshotLineOne} />
                  <div style={styles.snapshotLineTwo} />
                  <div style={styles.snapshotLineThree} />
                  <div style={styles.snapshotLineFour} />

                  <div style={styles.snapshotNodeTop}>
                    <span>📊</span>
                    <strong>
                      Mastery
                    </strong>
                    <small>
                      {Math.round(mastery)}%
                    </small>
                  </div>

                  <div style={styles.snapshotNodeLeft}>
                    <span>🧠</span>
                    <strong>
                      Knowledge
                    </strong>
                    <small>
                      {dashboard.concept_progress
                        ?.length ?? 0}{" "}
                      concepts
                    </small>
                  </div>

                  <div style={styles.snapshotCenter}>
                    <div style={styles.snapshotCenterIcon}>
                      🎓
                    </div>

                    <strong>
                      Learner
                    </strong>

                    <span>
                      Edni AI Profile
                    </span>
                  </div>

                  <div style={styles.snapshotNodeRight}>
                    <span>🎯</span>
                    <strong>
                      Focus
                    </strong>
                    <small>
                      {topGaps.length} gaps
                    </small>
                  </div>

                  <div style={styles.snapshotNodeBottom}>
                    <span>🌱</span>
                    <strong>
                      Practice
                    </strong>
                    <small>
                      {tasks.length} today
                    </small>
                  </div>
                </div>
              </section>

              {/* =================================================
                  STUDENT MASTERY
              ================================================= */}

              <section style={styles.chartCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardEyebrow}>
                      STUDENT MASTERY 📈
                    </div>

                    <h2 style={styles.cardTitle}>
                      Concept mastery
                    </h2>
                  </div>
                </div>

                {masteryData.length > 0 ? (
                  <div style={styles.chartContainer}>
                    <ResponsiveContainer
                      width="100%"
                      height={270}
                    >
                      <BarChart
                        data={masteryData}
                        margin={{
                          top: 10,
                          right: 10,
                          left: -15,
                          bottom: 45,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#EEF0F5"
                        />

                        <XAxis
                          dataKey="concept"
                          tick={{
                            fontSize: 10,
                            fill: "#7E8798",
                          }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />

                        <YAxis
                          domain={[0, 100]}
                          tick={{
                            fontSize: 10,
                            fill: "#9AA2B1",
                          }}
                        />

                        <Tooltip
                          formatter={(value) => [
                            `${value}%`,
                            "Mastery",
                          ]}
                          contentStyle={{
                            borderRadius: 10,
                            border:
                              "1px solid #E9EAF0",
                            fontSize: 11,
                          }}
                        />

                        <Bar
                          dataKey="mastery"
                          fill="#6366F1"
                          radius={[
                            6,
                            6,
                            0,
                            0,
                          ]}
                          maxBarSize={42}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={styles.emptyChart}>
                    <span>📊</span>
                    <strong>
                      No mastery data available
                    </strong>
                    <small>
                      Complete an assessment to
                      build your learner profile.
                    </small>
                  </div>
                )}
              </section>

              {/* =================================================
                  BLOOM DISTRIBUTION
              ================================================= */}

              <section style={styles.chartCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardEyebrow}>
                      COGNITIVE PROFILE 🌈
                    </div>

                    <h2 style={styles.cardTitle}>
                      Bloom distribution
                    </h2>
                  </div>
                </div>

                {bloomData.length > 0 ? (
                  <div style={styles.bloomLayout}>
                    <div style={styles.bloomChart}>
                      <ResponsiveContainer
                        width="100%"
                        height={220}
                      >
                        <PieChart>
                          <Pie
                            data={bloomData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={82}
                            paddingAngle={3}
                          >
                            {bloomData.map(
                              (_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    [
                                      "#6366F1",
                                      "#8B5CF6",
                                      "#A855F7",
                                      "#EC4899",
                                      "#F59E0B",
                                      "#10B981",
                                    ][
                                    index %
                                    6
                                    ]
                                  }
                                />
                              )
                            )}
                          </Pie>

                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={styles.bloomList}>
                      {bloomData.map(
                        (item, index) => (
                          <div
                            key={item.level}
                            style={
                              styles.bloomItem
                            }
                          >
                            <span
                              style={{
                                ...styles.bloomDot,
                                backgroundColor:
                                  [
                                    "#6366F1",
                                    "#8B5CF6",
                                    "#A855F7",
                                    "#EC4899",
                                    "#F59E0B",
                                    "#10B981",
                                  ][
                                  index % 6
                                  ],
                              }}
                            />

                            <span
                              style={
                                styles.bloomName
                              }
                            >
                              {item.name}
                            </span>

                            <strong
                              style={
                                styles.bloomValue
                              }
                            >
                              {item.value}%
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={styles.emptyChart}>
                    <span>🌈</span>
                    <strong>
                      No Bloom data available
                    </strong>
                    <small>
                      Bloom-level results will
                      appear after assessment.
                    </small>
                  </div>
                )}
              </section>

              {/* =================================================
                  KNOWLEDGE GAPS
              ================================================= */}

              <section style={styles.chartCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardEyebrow}>
                      KNOWLEDGE GAPS 🎯
                    </div>

                    <h2 style={styles.cardTitle}>
                      Areas that need attention
                    </h2>
                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/learning-resources"
                      )
                    }
                    style={
                      styles.resourcesButton
                    }
                  >
                    Resources →
                  </button>
                </div>

                {topGaps.length > 0 ? (
                  <div style={styles.gapGrid}>
                    {topGaps.map(
                      (gap, index) => {
                        const detail =
                          dashboard.concept_progress?.find(
                            (item) =>
                              item.concept ===
                              gap
                          );

                        return (
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
                              styles.gapCard
                            }
                          >
                            <div
                              style={
                                styles.gapNumber
                              }
                            >
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </div>

                            <div
                              style={
                                styles.gapContent
                              }
                            >
                              <strong>
                                {gap}
                              </strong>

                              <span>
                                {detail
                                  ? `${Math.round(
                                    detail.mastery
                                  )}% mastery`
                                  : "Needs attention"}
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
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div
                    style={
                      styles.noGaps
                    }
                  >
                    <span>🌸</span>
                    <strong>
                      No critical gaps
                    </strong>
                    <small>
                      Your current learner
                      profile looks healthy.
                    </small>
                  </div>
                )}
              </section>

              {/* =================================================
                  NEW ASSESSMENT
              ================================================= */}

              <section style={styles.assessmentCta}>
                <div>
                  <div style={styles.ctaEyebrow}>
                    CONTINUE LEARNING ✨
                  </div>

                  <h2 style={styles.ctaTitle}>
                    Ready for your next
                    learning step?
                  </h2>

                  <p style={styles.ctaText}>
                    Take a quick diagnostic and
                    let Edni identify what you
                    should focus on next.
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

            {/* =================================================
                RIGHT COLUMN
            ================================================= */}

            <aside style={styles.rightColumn}>

              {/* SMALL TRANSPARENT CALENDAR */}

              <MiniCalendar />

              {/* TODAY'S TASKS */}

              <section
                style={styles.tasksCard}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardEyebrow}>
                      TODAY 📝
                    </div>

                    <h2 style={styles.cardTitle}>
                      Today's tasks
                    </h2>
                  </div>

                  <div
                    style={
                      styles.taskCount
                    }
                  >
                    {tasks.length}
                  </div>
                </div>

                <div
                  style={
                    styles.taskProgressArea
                  }
                >
                  <div
                    style={
                      styles.taskProgressTop
                    }
                  >
                    <span>
                      Today's progress
                    </span>

                    <strong>
                      {taskCompletion}%
                    </strong>
                  </div>

                  <div
                    style={
                      styles.taskProgressTrack
                    }
                  >
                    <div
                      style={{
                        ...styles.taskProgressFill,
                        width: `${taskCompletion}%`,
                      }}
                    />
                  </div>
                </div>

                {tasks.length > 0 ? (
                  <div
                    style={
                      styles.taskList
                    }
                  >
                    {tasks
                      .slice(0, 7)
                      .map(
                        (
                          task,
                          index
                        ) => {
                          const completed =
                            task.status?.toLowerCase() ===
                            "completed";

                          return (
                            <div
                              key={
                                task.id ||
                                index
                              }
                              style={{
                                ...styles.taskItem,
                                opacity:
                                  completed
                                    ? 0.58
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
                                  {
                                    task.title
                                  }
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
                        }
                      )}
                  </div>
                ) : (
                  <div
                    style={
                      styles.emptyTasks
                    }
                  >
                    <div
                      style={
                        styles.emptySticker
                      }
                    >
                      🌈
                    </div>

                    <strong>
                      You're all caught
                      up!
                    </strong>

                    <span>
                      No tasks waiting for
                      you today.
                    </span>
                  </div>
                )}

                {tasks.length > 7 && (
                  <button
                    onClick={() =>
                      router.push(
                        "/study-planner"
                      )
                    }
                    style={
                      styles.viewButton
                    }
                  >
                    View all tasks →
                  </button>
                )}
              </section>

              {/* STUDY SUMMARY */}

              <section
                style={
                  styles.sideSummaryCard
                }
              >
                <div
                  style={
                    styles.cardEyebrow
                  }
                >
                  LEARNING SUMMARY
                </div>

                <div
                  style={
                    styles.summaryRows
                  }
                >
                  <div
                    style={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Study time
                    </span>

                    <strong>
                      {dashboard.total_study_time !==
                        undefined
                        ? `${dashboard.total_study_time.toFixed(
                          1
                        )}h`
                        : "—"}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Study streak
                    </span>

                    <strong>
                      {dashboard.study_streak !==
                        undefined
                        ? `${dashboard.study_streak} days`
                        : dashboard.study_days !==
                          undefined
                          ? `${dashboard.study_days} days`
                          : "—"}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.summaryRow
                    }
                  >
                    <span>
                      Knowledge gaps
                    </span>

                    <strong>
                      {dashboard.critical_gaps
                        ?.length ??
                        0}
                    </strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
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
          ANIMATIONS / RESPONSIVE
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

        @media (max-width: 1180px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 800px) {
          .dashboard-container {
            padding: 25px 18px !important;
          }

          .dashboard-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .dashboard-header {
            flex-direction: column !important;
          }

          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-score {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .dashboard-snapshot {
            min-height: 390px !important;
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
    marginLeft: "260px",
    minHeight: "100vh",
  },

  container: {
    maxWidth: "1500px",
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
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#8B5CF6",
    marginBottom: "9px",
  },

  mainTitle: {
    margin: 0,
    fontSize: "38px",
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
    margin: "10px 0 0",
    fontSize: "14px",
    color: "#7B8496",
  },

  headerSticker: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "13px 16px",
    borderRadius: "15px",
    background: "#FFFFFF",
    border: "1px solid #ECECF5",
    boxShadow:
      "0 8px 25px rgba(99, 102, 241, 0.06)",
  },

  stickerEmoji: {
    width: "43px",
    height: "43px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    background: "#F3F0FF",
    fontSize: "23px",
  },

  stickerTitle: {
    fontSize: "13px",
    fontWeight: 750,
    color: "#3C4254",
  },

  stickerText: {
    marginTop: "3px",
    fontSize: "11px",
    color: "#969EAF",
  },

  /* =======================================================
     TWO COLUMN LAYOUT
  ======================================================= */

  dashboardMainGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) 330px",
    gap: "22px",
    alignItems: "start",
  },

  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    minWidth: 0,
  },

  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    minWidth: 0,
  },

  /* =======================================================
     COMMON CARD
  ======================================================= */

  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
  },

  cardEyebrow: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.11em",
    color: "#A0A7B7",
    marginBottom: "6px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 800,
    color: "#272C3C",
  },

  /* =======================================================
     SCORE
  ======================================================= */

  scoreCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "25px",
    minHeight: "190px",
    padding: "24px 26px",
    borderRadius: "18px",
    background:
      "linear-gradient(120deg, #F0EEFF 0%, #FAF8FF 55%, #FFF6FB 100%)",
    border: "1px solid #E9E4FF",
    overflow: "hidden",
  },

  scoreContent: {
    minWidth: 0,
  },

  scoreTitle: {
    margin: 0,
    fontSize: "25px",
    fontWeight: 800,
    letterSpacing: "-0.025em",
    color: "#292C43",
  },

  scoreDescription: {
    maxWidth: "530px",
    margin: "7px 0 14px",
    fontSize: "13px",
    lineHeight: 1.5,
    color: "#7C8293",
  },

  scoreMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  areaPill: {
    padding: "7px 10px",
    borderRadius: "99px",
    background: "#FFFFFF",
    color: "#6366F1",
    fontSize: "10px",
    fontWeight: 750,
    border: "1px solid #E6E0FF",
  },

  cyclePill: {
    padding: "7px 10px",
    borderRadius: "99px",
    background: "#FFFFFF",
    color: "#7B8496",
    fontSize: "10px",
    fontWeight: 700,
    border: "1px solid #ECEEF3",
  },

  ringLarge: {
    width: "125px",
    height: "125px",
    flexShrink: 0,
  },

  ringLargeProgress: {
    width: "125px",
    height: "125px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  ringLargeInner: {
    width: "99px",
    height: "99px",
    borderRadius: "50%",
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#34394A",
    gap: "2px",
    boxShadow:
      "0 5px 20px rgba(99, 102, 241, 0.07)",
  },

  /* =======================================================
     SNAPSHOT
  ======================================================= */

  snapshotCard: {
    padding: "21px",
    background: "#FFFFFF",
    border: "1px solid #EAECF2",
    borderRadius: "17px",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.025)",
  },

  liveBadge: {
    padding: "6px 9px",
    borderRadius: "99px",
    background: "#ECFDF5",
    color: "#10B981",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.06em",
  },

  snapshotVisual: {
    position: "relative",
    height: "275px",
    marginTop: "4px",
    overflow: "hidden",
  },

  snapshotCenter: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background:
      "linear-gradient(145deg, #F3F0FF, #FFF3F8)",
    border: "1px solid #E5DEFF",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    boxShadow:
      "0 15px 40px rgba(99, 102, 241, 0.10)",
  },

  snapshotCenterIcon: {
    fontSize: "34px",
    marginBottom: "5px",
  },



  snapshotNodeTop: {
    position: "absolute",
    left: "50%",
    top: "4px",
    transform: "translateX(-50%)",
    width: "135px",
    padding: "10px",
    borderRadius: "13px",
    background: "#FFFFFF",
    border: "1px solid #E9EAF1",
    boxShadow:
      "0 7px 20px rgba(15, 23, 42, 0.05)",
    textAlign: "center",
    zIndex: 4,
  },

  snapshotNodeLeft: {
    position: "absolute",
    left: "4%",
    top: "50%",
    transform: "translateY(-50%)",
    width: "135px",
    padding: "10px",
    borderRadius: "13px",
    background: "#FFFFFF",
    border: "1px solid #E9EAF1",
    boxShadow:
      "0 7px 20px rgba(15, 23, 42, 0.05)",
    textAlign: "center",
    zIndex: 4,
  },

  snapshotNodeRight: {
    position: "absolute",
    right: "4%",
    top: "50%",
    transform: "translateY(-50%)",
    width: "135px",
    padding: "10px",
    borderRadius: "13px",
    background: "#FFFFFF",
    border: "1px solid #E9EAF1",
    boxShadow:
      "0 7px 20px rgba(15, 23, 42, 0.05)",
    textAlign: "center",
    zIndex: 4,
  },

  snapshotNodeBottom: {
    position: "absolute",
    left: "50%",
    bottom: "4px",
    transform: "translateX(-50%)",
    width: "135px",
    padding: "10px",
    borderRadius: "13px",
    background: "#FFFFFF",
    border: "1px solid #E9EAF1",
    boxShadow:
      "0 7px 20px rgba(15, 23, 42, 0.05)",
    textAlign: "center",
    zIndex: 4,
  },

  snapshotLineOne: {
    position: "absolute",
    width: "2px",
    height: "55px",
    background: "#DDD6FE",
    left: "50%",
    top: "66px",
  },

  snapshotLineTwo: {
    position: "absolute",
    width: "100px",
    height: "2px",
    background: "#DDD6FE",
    left: "calc(50% - 150px)",
    top: "50%",
  },

  snapshotLineThree: {
    position: "absolute",
    width: "100px",
    height: "2px",
    background: "#FBCFE8",
    right: "calc(50% - 150px)",
    top: "50%",
  },

  snapshotLineFour: {
    position: "absolute",
    width: "2px",
    height: "55px",
    background: "#FBCFE8",
    left: "50%",
    bottom: "66px",
  },

  /* =======================================================
     CHARTS
  ======================================================= */

  chartCard: {
    padding: "21px",
    background: "#FFFFFF",
    border: "1px solid #EAECF2",
    borderRadius: "17px",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.025)",
  },

  chartContainer: {
    width: "100%",
    height: "270px",
  },

  emptyChart: {
    minHeight: "220px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: "7px",
    color: "#6B7280",
  },

  bloomLayout: {
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 0.9fr) minmax(200px, 1fr)",
    alignItems: "center",
    gap: "20px",
  },

  bloomChart: {
    minWidth: 0,
  },

  bloomList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  bloomItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 10px",
    borderRadius: "9px",
    background: "#FAFBFD",
  },

  bloomDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },

  bloomName: {
    flex: 1,
    fontSize: "11px",
    color: "#656D7D",
  },

  bloomValue: {
    fontSize: "11px",
    color: "#34394A",
  },

  /* =======================================================
     KNOWLEDGE GAPS
  ======================================================= */

  gapGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "10px",
  },

  gapCard: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "13px",
    borderRadius: "12px",
    background: "#FFF9FA",
    border: "1px solid #FCE7F3",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.18s ease",
  },

  gapNumber: {
    width: "35px",
    height: "35px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    background: "#FFFFFF",
    color: "#EC4899",
    fontSize: "10px",
    fontWeight: 800,
  },

  gapContent: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
    minWidth: 0,
  },

  gapArrow: {
    fontSize: "17px",
    color: "#EC4899",
    fontWeight: 700,
  },

  resourcesButton: {
    border: "none",
    background: "#F5F3FF",
    color: "#7C3AED",
    borderRadius: "8px",
    padding: "7px 10px",
    fontSize: "10px",
    fontWeight: 750,
    cursor: "pointer",
  },

  noGaps: {
    minHeight: "150px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    textAlign: "center",
    color: "#555C6C",
  },

  /* =======================================================
     CALENDAR
  ======================================================= */

  calendarCard: {
    padding: "18px",
    borderRadius: "17px",
    background:
      "rgba(255,255,255,0.58)",
    border: "1px solid rgba(226,229,238,0.85)",
    backdropFilter: "blur(10px)",
    boxShadow:
      "0 7px 25px rgba(15, 23, 42, 0.035)",
  },

  calendarLoading: {
    padding: "30px",
    textAlign: "center",
    fontSize: "11px",
    color: "#9AA1AF",
  },

  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },

  calendarEyebrow: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.11em",
    color: "#A0A7B7",
    marginBottom: "4px",
  },

  calendarMonth: {
    fontSize: "17px",
    fontWeight: 800,
    color: "#303648",
  },

  calendarToday: {
    width: "39px",
    height: "39px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "11px",
    background: "#F1EEFF",
    color: "#6366F1",
    fontSize: "14px",
    fontWeight: 800,
  },

  weekHeader: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7, 1fr)",
    marginBottom: "6px",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7, 1fr)",
    gap: "3px",
  },

  calendarDay: {
    height: "31px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    fontSize: "10px",
    color: "#737B8D",
  },

  calendarDayToday: {
    background: "#6366F1",
    color: "#FFFFFF",
    fontWeight: 800,
    boxShadow:
      "0 5px 12px rgba(99, 102, 241, 0.22)",
  },

  /* =======================================================
     TASKS
  ======================================================= */

  tasksCard: {
    padding: "20px",
    background: "#FFFFFF",
    border: "1px solid #EAECF2",
    borderRadius: "17px",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.025)",
  },

  taskCount: {
    minWidth: "30px",
    height: "30px",
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

  taskProgressArea: {
    marginBottom: "15px",
  },

  taskProgressTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "7px",
    fontSize: "10px",
    color: "#8B93A3",
  },

  taskProgressTrack: {
    height: "7px",
    width: "100%",
    overflow: "hidden",
    borderRadius: "99px",
    background: "#EEF0F5",
  },

  taskProgressFill: {
    height: "100%",
    borderRadius: "99px",
    background:
      "linear-gradient(90deg, #6366F1, #A855F7)",
    transition: "width 0.5s ease",
  },

  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  taskItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
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
    fontSize: "10px",
    fontWeight: 800,
    flexShrink: 0,
  },

  taskMain: {
    flex: 1,
    minWidth: 0,
  },

  taskTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#404758",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  taskDescription: {
    marginTop: "3px",
    fontSize: "10px",
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
    gap: "4px",
  },

  emptySticker: {
    fontSize: "38px",
    marginBottom: "6px",
  },

  viewButton: {
    width: "100%",
    marginTop: "11px",
    padding: "10px",
    border: "none",
    borderRadius: "8px",
    background: "#F5F3FF",
    color: "#7C3AED",
    fontSize: "10px",
    fontWeight: 750,
    cursor: "pointer",
  },

  /* =======================================================
     SIDE SUMMARY
  ======================================================= */

  sideSummaryCard: {
    padding: "18px",
    borderRadius: "17px",
    background:
      "linear-gradient(145deg, #FFFFFF, #FAF8FF)",
    border: "1px solid #EDE8FF",
  },

  summaryRows: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "11px 0",
    borderBottom: "1px solid #F0F0F5",
    fontSize: "11px",
    color: "#858D9D",
  },

  /* =======================================================
     CTA
  ======================================================= */

  assessmentCta: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "25px",
    padding: "24px 26px",
    borderRadius: "17px",
    background:
      "linear-gradient(110deg, #F1EEFF, #FFF0F7)",
    border: "1px solid #E9E1FF",
  },

  ctaEyebrow: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#8B5CF6",
    marginBottom: "6px",
  },

  ctaTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: 800,
    color: "#292D40",
  },

  ctaText: {
    maxWidth: "620px",
    margin: "6px 0 0",
    fontSize: "11px",
    lineHeight: 1.5,
    color: "#8C92A2",
  },

  ctaButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#6366F1",
    color: "#FFFFFF",
    fontSize: "12px",
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
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#8B5CF6",
    marginBottom: "6px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "25px",
    fontWeight: 800,
    color: "#252A3B",
  },

  modalSubtitle: {
    margin: "6px 0 0",
    fontSize: "12px",
    color: "#8C93A3",
  },

  closeButton: {
    width: "33px",
    height: "33px",
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
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginBottom: "3px",
  },

  areaLabel: {
    maxWidth: "170px",
    fontSize: "13px",
    fontWeight: 750,
    lineHeight: 1.35,
    color: "#363B4B",
  },

  areaDescription: {
    marginTop: "5px",
    maxWidth: "175px",
    fontSize: "10px",
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
    fontSize: "10px",
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
    fontSize: "15px",
    fontWeight: 750,
    color: "#454B5D",
  },

  loadingText: {
    marginTop: "5px",
    fontSize: "11px",
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
    fontSize: "18px",
    color: "#353A4B",
  },

  errorText: {
    margin: 0,
    fontSize: "12px",
    color: "#8C93A3",
  },

  retryButton: {
    marginTop: "15px",
    border: "none",
    borderRadius: "9px",
    padding: "10px 15px",
    background: "#6366F1",
    color: "#FFFFFF",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};