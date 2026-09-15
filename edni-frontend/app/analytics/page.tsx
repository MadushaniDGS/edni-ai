"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import axios from "axios";

import Topbar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  BookOpen,
  Activity,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Award,
  Clock3,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

interface CriticalGap {
  concept?: string;
  mastery?: number;
  severity?: string;
  area?: string;
}

interface AnalyticsData {
  overall_mastery: number;
  overall_theta: number;

  bloom_summary: Record<string, number>;

  learning_area_summary: Record<string, number>;

  critical_gaps: Array<string | CriticalGap>;

  feedback_cycle: number;

  diagnostic_history: {
    mastery: number;
    theta: number;
    cycle: number;
    date: string;
  }[];

  concept_progress: {
    concept: string;
    mastery: number;
    severity: string;
    area: string;
  }[];

  weekly_hours: {
    day: string;
    hours: number;
  }[];
}

const bloomNames: Record<string, string> = {
  "1": "Remember",
  "2": "Understand",
  "3": "Apply",
  "4": "Analyze",
  "5": "Evaluate",
  "6": "Create",
};

const clamp = (
  value: number,
  min = 0,
  max = 100
): number => {
  return Math.min(max, Math.max(min, value));
};

const formatDate = (date: string) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getSeverity = (severity?: string) => {
  const value = String(severity ?? "").toLowerCase();

  if (value.includes("critical")) {
    return {
      label: "Critical",
      background: "#FEF2F2",
      color: "#DC2626",
      border: "#FECACA",
    };
  }

  if (value.includes("high")) {
    return {
      label: "High",
      background: "#FFF7ED",
      color: "#EA580C",
      border: "#FED7AA",
    };
  }

  if (value.includes("medium")) {
    return {
      label: "Medium",
      background: "#FEFCE8",
      color: "#CA8A04",
      border: "#FEF08A",
    };
  }

  return {
    label: severity || "Gap",
    background: "#F5F3FF",
    color: "#7C3AED",
    border: "#DDD6FE",
  };
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] =
    useState<AnalyticsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * ============================================================
   * FETCH ANALYTICS
   * ============================================================
   */

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("edni_access") ||
          sessionStorage.getItem("edni_access");

        const response = await axios.get(
          `${API_URL}/analytics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setAnalytics(response.data);
      } catch (err: any) {
        console.error("Analytics error:", err);

        setError(
          err?.response?.data?.detail ||
          "Unable to load analytics. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  /*
   * ============================================================
   * CHART DATA
   * ============================================================
   */

  const bloomChart = useMemo(() => {
    if (!analytics?.bloom_summary) {
      return [];
    }

    return Object.entries(
      analytics.bloom_summary
    ).map(([level, value]) => ({
      level: `L${level}`,
      name: bloomNames[level] || `Level ${level}`,
      mastery: Number(value) || 0,
    }));
  }, [analytics]);

  const learningAreas = useMemo(() => {
    if (!analytics?.learning_area_summary) {
      return [];
    }

    return Object.entries(
      analytics.learning_area_summary
    ).map(([area, value]) => ({
      area,
      mastery: Number(value) || 0,
    }));
  }, [analytics]);

  /*
   * ============================================================
   * CYCLE HISTORY
   * ============================================================
   */

  const cycleHistory = useMemo(() => {
    if (!analytics?.diagnostic_history) {
      return [];
    }

    return [...analytics.diagnostic_history].sort(
      (a, b) => Number(a.cycle) - Number(b.cycle)
    );
  }, [analytics]);

  /*
   * ============================================================
   * CRITICAL GAPS
   * ============================================================
   */

  const criticalGaps = useMemo(() => {
    if (!analytics?.critical_gaps) {
      return [];
    }

    return analytics.critical_gaps.map((gap) => {
      if (typeof gap === "string") {
        return gap;
      }

      return (
        gap?.concept ||
        gap?.area ||
        "Knowledge gap"
      );
    });
  }, [analytics]);

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div style={styles.page}>
        <Sidebar />

        <main style={styles.main}>
          <Topbar title="Progress Analytics" />

          <div style={styles.loadingContainer}>
            <div style={styles.loadingGraphic}>
              <div style={styles.loadingGlowOne}></div>
              <div style={styles.loadingGlowTwo}></div>

              <div style={styles.loadingIcon}>
                <Brain size={29} />
              </div>
            </div>

            <div style={styles.loadingBadge}>
              ✨ PERSONALIZED ANALYTICS
            </div>

            <h2 style={styles.loadingTitle}>
              Building your learning analytics
            </h2>

            <p style={styles.loadingText}>
              Analyzing your diagnostic progress...
            </p>

            <div style={styles.loadingBar}>
              <div style={styles.loadingBarInner} />
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes loadingMove {
            0% {
              transform: translateX(-120%);
            }

            100% {
              transform: translateX(300%);
            }
          }
        `}</style>
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR
   * ============================================================
   */

  if (error || !analytics) {
    return (
      <div style={styles.page}>
        <Sidebar />

        <main style={styles.main}>
          <Topbar title="Progress Analytics" />

          <div style={styles.errorContainer}>
            <div style={styles.errorGlow}></div>

            <div style={styles.errorIcon}>
              <TriangleAlert size={30} />
            </div>

            <div style={styles.errorBadge}>
              ANALYTICS UNAVAILABLE
            </div>

            <h2 style={styles.errorTitle}>
              Analytics unavailable
            </h2>

            <p style={styles.errorText}>
              {error}
            </p>
          </div>
        </main>
      </div>
    );
  }

  /*
   * ============================================================
   * SUMMARY VALUES
   * ============================================================
   */

  const overallMastery = clamp(
    Number(analytics.overall_mastery) || 0
  );

  const overallTheta =
    Number(analytics.overall_theta) || 0;

  const latestCycle =
    cycleHistory.length > 0
      ? cycleHistory[cycleHistory.length - 1]
      : null;

  const firstCycle =
    cycleHistory.length > 0
      ? cycleHistory[0]
      : null;

  const totalCycleChange =
    firstCycle && latestCycle
      ? Number(latestCycle.mastery) -
      Number(firstCycle.mastery)
      : 0;

  const currentCycle =
    Number(analytics.feedback_cycle) ||
    Number(latestCycle?.cycle) ||
    0;

  const masteryData = [
    {
      name: "Mastery",
      value: overallMastery,
      fill: "#7C3AED",
    },
  ];

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div style={styles.page}>
      <Sidebar />

      <main style={styles.main}>
        <Topbar title="Progress Analytics" />

        <div style={styles.content}>

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div style={styles.pageHeader}>
            <div>
              <div style={styles.eyebrow}>
                <Activity size={14} />
                LEARNING ANALYTICS
              </div>

              <h1 style={styles.pageTitle}>
                Your Learning Progress
              </h1>

              <p style={styles.pageSubtitle}>
                Track your mastery, diagnostic cycles,
                knowledge gaps, and learning growth.
              </p>
            </div>

            <div style={styles.currentCycleBadge}>
              <div style={styles.currentCycleIcon}>
                <Sparkles size={16} />
              </div>

              <div>
                <span style={styles.badgeLabel}>
                  CURRENT CYCLE
                </span>

                <strong style={styles.badgeValue}>
                  Cycle {currentCycle}
                </strong>
              </div>
            </div>
          </div>

          {/* ================================================= */}
          {/* SUMMARY CARDS */}
          {/* ================================================= */}

          <section style={styles.summaryGrid}>

            {/* MASTERY */}

            <div
              style={{
                ...styles.masteryCard,
                background:
                  "linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 58%, #EFF6FF 100%)",
              }}
            >
              <div style={styles.decorativeCircleLarge}></div>
              <div style={styles.decorativeCircleSmall}></div>

              <div style={styles.cardTop}>
                <div>
                  <span style={styles.cardEyebrow}>
                    OVERALL MASTERY
                  </span>

                  <h2 style={styles.bigNumber}>
                    {overallMastery.toFixed(1)}
                    <span>%</span>
                  </h2>

                  <p style={styles.cardDescription}>
                    Your current knowledge mastery
                  </p>
                </div>

                <div style={styles.iconBoxPurple}>
                  <Brain size={20} />
                </div>
              </div>

              <div style={styles.masteryChart}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <RadialBarChart
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                    data={masteryData}
                    barSize={15}
                  >
                    <RadialBar
                      background={{
                        fill: "#EDE9FE",
                      }}
                      dataKey="value"
                      cornerRadius={20}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>

                <div style={styles.masteryCenter}>
                  <Award size={18} />

                  <strong>
                    {overallMastery.toFixed(0)}%
                  </strong>

                  <span>Mastery</span>
                </div>
              </div>

              <div style={styles.masteryFooter}>
                <span>Current performance</span>
                <span style={styles.masteryFooterPill}>
                  {overallMastery >= 75
                    ? "Strong"
                    : overallMastery >= 50
                      ? "Growing"
                      : "Developing"}
                </span>
              </div>
            </div>

            {/* THETA */}

            <div
              style={{
                ...styles.metricCard,
                background:
                  "linear-gradient(135deg, #FFFFFF 0%, #F8FAFF 100%)",
              }}
            >
              <div
                style={{
                  ...styles.metricTopDecor,
                  background:
                    "linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 100%)",
                }}
              />

              <div style={styles.metricHeader}>
                <div style={styles.iconBoxBlue}>
                  <Target size={20} />
                </div>

                <span style={styles.cardEyebrow}>
                  IRT ABILITY
                </span>
              </div>

              <div style={styles.metricValue}>
                {overallTheta.toFixed(2)}
              </div>

              <p style={styles.metricDescription}>
                Estimated ability level based on
                diagnostic performance.
              </p>

              <div style={styles.metricFooter}>
                <span>Ability estimate</span>

                <div style={styles.thetaPill}>
                  <TrendingUp size={13} />
                  Active
                </div>
              </div>
            </div>

            {/* CYCLE */}

            <div
              style={{
                ...styles.metricCard,
                background:
                  "linear-gradient(135deg, #FFFFFF 0%, #F7F5FF 100%)",
              }}
            >
              <div
                style={{
                  ...styles.metricTopDecor,
                  background:
                    "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                }}
              />

              <div style={styles.metricHeader}>
                <div style={styles.iconBoxGreen}>
                  <Activity size={20} />
                </div>

                <span style={styles.cardEyebrow}>
                  LEARNING CYCLE
                </span>
              </div>

              <div style={styles.metricValue}>
                {currentCycle}
              </div>

              <p style={styles.metricDescription}>
                Diagnostic feedback cycles completed
                so far.
              </p>

              <div style={styles.metricFooter}>
                <span>Cycles completed</span>

                <div style={styles.cyclePill}>
                  <CalendarDays size={13} />
                  Ongoing
                </div>
              </div>
            </div>

            {/* GROWTH */}

            <div
              style={{
                ...styles.metricCard,
                background:
                  "linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)",
              }}
            >
              <div
                style={{
                  ...styles.metricTopDecor,
                  background:
                    "linear-gradient(135deg, #D1FAE5 0%, #DBEAFE 100%)",
                }}
              />

              <div style={styles.metricHeader}>
                <div style={styles.iconBoxOrange}>
                  {totalCycleChange >= 0 ? (
                    <TrendingUp size={20} />
                  ) : (
                    <TrendingDown size={20} />
                  )}
                </div>

                <span style={styles.cardEyebrow}>
                  TOTAL GROWTH
                </span>
              </div>

              <div
                style={{
                  ...styles.metricValue,
                  color:
                    totalCycleChange >= 0
                      ? "#059669"
                      : "#DC2626",
                }}
              >
                {totalCycleChange >= 0 ? "+" : ""}
                {totalCycleChange.toFixed(1)}%
              </div>

              <p style={styles.metricDescription}>
                Mastery change from your first diagnostic
                cycle.
              </p>

              <div style={styles.metricFooter}>
                <span>
                  {firstCycle
                    ? `Cycle ${firstCycle.cycle} → Cycle ${latestCycle?.cycle ??
                    firstCycle.cycle
                    }`
                    : "No comparison yet"}
                </span>
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* CYCLE PROGRESS */}
          {/* ================================================= */}

          <section style={styles.journeyCard}>
            <div
              style={styles.journeyBackgroundOne}
            />
            <div
              style={styles.journeyBackgroundTwo}
            />

            <div style={styles.journeyHeader}>
              <div>
                <div style={styles.sectionKicker}>
                  <Activity size={14} />
                  LEARNING JOURNEY
                </div>

                <h2 style={styles.sectionTitle}>
                  Progress Across Diagnostic Cycles
                </h2>

                <p style={styles.sectionSubtitle}>
                  See how your mastery changes after every
                  diagnostic cycle.
                </p>
              </div>

              <div
                style={{
                  ...styles.growthBadge,
                  ...(totalCycleChange < 0
                    ? styles.growthBadgeNegative
                    : {}),
                }}
              >
                {totalCycleChange >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}

                <div>
                  <strong>
                    {totalCycleChange >= 0 ? "+" : ""}
                    {totalCycleChange.toFixed(1)}%
                  </strong>

                  <span>since first cycle</span>
                </div>
              </div>
            </div>

            {cycleHistory.length === 0 ? (
              <div style={styles.emptyJourney}>
                <Activity size={28} />

                <strong>
                  No diagnostic cycles yet
                </strong>

                <span>
                  Complete a diagnostic assessment to
                  start tracking your learning journey.
                </span>
              </div>
            ) : (
              <>
                {/* ========================================= */}
                {/* INDIVIDUAL CYCLES */}
                {/* ========================================= */}

                <div style={styles.cycleTimeline}>
                  {cycleHistory.map(
                    (item, index) => {
                      const mastery = clamp(
                        Number(item.mastery) || 0
                      );

                      const theta =
                        Number(item.theta) || 0;

                      const previous =
                        index > 0
                          ? cycleHistory[index - 1]
                          : null;

                      const change = previous
                        ? mastery -
                        Number(
                          previous.mastery || 0
                        )
                        : 0;

                      const isLatest =
                        index ===
                        cycleHistory.length - 1;

                      return (
                        <div
                          key={`${item.cycle}-${item.date}-${index}`}
                          style={styles.timelineItem}
                        >
                          {/* TIMELINE */}

                          <div
                            style={styles.timelineRail}
                          >
                            <div
                              style={{
                                ...styles.timelineDot,
                                ...(isLatest
                                  ? styles.timelineDotActive
                                  : {}),
                              }}
                            >
                              {isLatest ? (
                                <Sparkles size={12} />
                              ) : (
                                <span>
                                  {index + 1}
                                </span>
                              )}
                            </div>

                            {index <
                              cycleHistory.length -
                              1 && (
                                <div
                                  style={
                                    styles.timelineLine
                                  }
                                />
                              )}
                          </div>

                          {/* CYCLE CARD */}

                          <div
                            style={{
                              ...styles.cycleProgressCard,
                              ...(isLatest
                                ? styles.currentCycleCard
                                : {}),
                            }}
                          >
                            <div
                              style={
                                styles.cycleCardHeader
                              }
                            >
                              <div>
                                <div
                                  style={
                                    styles.cycleTitleRow
                                  }
                                >
                                  <h3
                                    style={
                                      styles.cycleTitle
                                    }
                                  >
                                    Cycle {item.cycle}
                                  </h3>

                                  {isLatest && (
                                    <span
                                      style={
                                        styles.currentLabel
                                      }
                                    >
                                      CURRENT
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={
                                    styles.dateRow
                                  }
                                >
                                  <CalendarDays
                                    size={12}
                                  />

                                  {formatDate(
                                    item.date
                                  )}
                                </div>
                              </div>

                              <div
                                style={{
                                  ...styles.cycleChange,
                                  ...(change < 0
                                    ? styles.cycleChangeNegative
                                    : {}),
                                }}
                              >
                                {index === 0 ? (
                                  <span>
                                    Baseline
                                  </span>
                                ) : (
                                  <>
                                    {change >= 0 ? (
                                      <TrendingUp
                                        size={13}
                                      />
                                    ) : (
                                      <TrendingDown
                                        size={13}
                                      />
                                    )}

                                    {change >= 0
                                      ? "+"
                                      : ""}
                                    {change.toFixed(
                                      1
                                    )}
                                    %
                                  </>
                                )}
                              </div>
                            </div>

                            {/* STATS */}

                            <div
                              style={
                                styles.cycleStats
                              }
                            >
                              <div>
                                <span>
                                  Mastery
                                </span>

                                <strong>
                                  {mastery.toFixed(
                                    1
                                  )}
                                  %
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Theta
                                </span>

                                <strong>
                                  {theta.toFixed(
                                    2
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Progress
                                </span>

                                <strong>
                                  {mastery >= 75
                                    ? "Strong"
                                    : mastery >= 50
                                      ? "Growing"
                                      : "Developing"}
                                </strong>
                              </div>
                            </div>

                            {/* PROGRESS */}

                            <div
                              style={
                                styles.progressHeader
                              }
                            >
                              <span>
                                Mastery level
                              </span>

                              <span>
                                {mastery.toFixed(0)}%
                              </span>
                            </div>

                            <div
                              style={
                                styles.cycleProgressTrack
                              }
                            >
                              <div
                                style={{
                                  ...styles.cycleProgressFill,
                                  width: `${mastery}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* ========================================= */}
                {/* CYCLE TREND */}
                {/* ========================================= */}

                <div
                  style={
                    styles.cycleChartContainer
                  }
                >
                  <div style={styles.chartHeader}>
                    <div>
                      <h3
                        style={styles.chartTitle}
                      >
                        Mastery Trend
                      </h3>

                      <p
                        style={
                          styles.chartSubtitle
                        }
                      >
                        Your mastery across diagnostic
                        cycles
                      </p>
                    </div>

                    <div
                      style={styles.chartLegend}
                    >
                      <span
                        style={styles.legendDot}
                      />

                      Mastery
                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 270,
                    }}
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart
                        data={cycleHistory}
                        margin={{
                          top: 15,
                          right: 15,
                          left: -10,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="4 4"
                          vertical={false}
                          stroke="#E5E7EB"
                        />

                        <XAxis
                          dataKey="cycle"
                          tickFormatter={(value) =>
                            `C${value}`
                          }
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#64748B",
                            fontSize: 11,
                          }}
                        />

                        <YAxis
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#94A3B8",
                            fontSize: 10,
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border:
                              "1px solid #DDD6FE",
                            boxShadow:
                              "0 12px 30px rgba(76,29,149,0.10)",
                          }}
                          formatter={(value: any) => [
                            `${Number(
                              value
                            ).toFixed(1)}%`,
                            "Mastery",
                          ]}
                          labelFormatter={(value) =>
                            `Cycle ${value}`
                          }
                        />

                        <Line
                          type="monotone"
                          dataKey="mastery"
                          stroke="#7C3AED"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: "#7C3AED",
                            strokeWidth: 3,
                            stroke: "#FFFFFF",
                          }}
                          activeDot={{
                            r: 7,
                            fill: "#3B82F6",
                            stroke: "#FFFFFF",
                            strokeWidth: 3,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ================================================= */}
          {/* BLOOM + LEARNING AREAS */}
          {/* ================================================= */}

          <section style={styles.twoColumnGrid}>

            {/* BLOOM */}

            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div
                    style={styles.sectionKicker}
                  >
                    <Brain size={14} />
                    BLOOM'S TAXONOMY
                  </div>

                  <h2
                    style={styles.sectionTitle}
                  >
                    Cognitive Performance
                  </h2>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Performance across cognitive
                    learning levels.
                  </p>
                </div>
              </div>

              <div style={styles.chartBox}>
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={bloomChart}
                    margin={{
                      top: 10,
                      right: 5,
                      left: -20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="#E5E7EB"
                    />

                    <XAxis
                      dataKey="level"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#64748B",
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94A3B8",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #DDD6FE",
                      }}
                      formatter={(value: any) => [
                        `${Number(
                          value
                        ).toFixed(1)}%`,
                        "Mastery",
                      ]}
                    />

                    <Bar
                      dataKey="mastery"
                      fill="#8B5CF6"
                      radius={[8, 8, 0, 0]}
                      barSize={34}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.bloomList}>
                {bloomChart.map((item) => (
                  <div
                    key={item.level}
                    style={styles.bloomItem}
                  >
                    <div
                      style={
                        styles.bloomItemLeft
                      }
                    >
                      <span
                        style={styles.bloomLevel}
                      >
                        {item.level}
                      </span>

                      <span>
                        {item.name}
                      </span>
                    </div>

                    <strong
                      style={{
                        color:
                          item.mastery >= 75
                            ? "#059669"
                            : item.mastery >= 50
                              ? "#7C3AED"
                              : "#EA580C",
                      }}
                    >
                      {item.mastery.toFixed(0)}%
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* LEARNING AREAS */}

            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div
                    style={styles.sectionKicker}
                  >
                    <BookOpen size={14} />
                    LEARNING AREAS
                  </div>

                  <h2
                    style={styles.sectionTitle}
                  >
                    Subject Mastery
                  </h2>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Compare your mastery across
                    learning areas.
                  </p>
                </div>
              </div>

              <div style={styles.areaList}>
                {learningAreas.length === 0 ? (
                  <div style={styles.emptySmall}>
                    No learning area data available.
                  </div>
                ) : (
                  learningAreas.map(
                    (item, index) => {
                      const mastery = clamp(
                        item.mastery
                      );

                      return (
                        <div
                          key={item.area}
                          style={
                            styles.areaItem
                          }
                        >
                          <div
                            style={
                              styles.areaHeader
                            }
                          >
                            <div
                              style={
                                styles.areaNameWrap
                              }
                            >
                              <div
                                style={{
                                  ...styles.areaNumber,
                                  background:
                                    index % 2 === 0
                                      ? "#EDE9FE"
                                      : "#DBEAFE",
                                  color:
                                    index % 2 === 0
                                      ? "#7C3AED"
                                      : "#2563EB",
                                }}
                              >
                                {String(
                                  index + 1
                                ).padStart(2, "0")}
                              </div>

                              <span
                                style={
                                  styles.areaName
                                }
                              >
                                {item.area}
                              </span>
                            </div>

                            <strong
                              style={
                                styles.areaValue
                              }
                            >
                              {mastery.toFixed(
                                0
                              )}
                              %
                            </strong>
                          </div>

                          <div
                            style={
                              styles.areaTrack
                            }
                          >
                            <div
                              style={{
                                ...styles.areaFill,
                                width: `${mastery}%`,
                                background:
                                  index % 2 === 0
                                    ? "linear-gradient(90deg, #A78BFA, #7C3AED)"
                                    : "linear-gradient(90deg, #93C5FD, #2563EB)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* GAPS + CONCEPTS */}
          {/* ================================================= */}

          <section style={styles.twoColumnGrid}>

            {/* KNOWLEDGE GAPS */}

            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div
                    style={{
                      ...styles.sectionKicker,
                      color: "#DC2626",
                    }}
                  >
                    <TriangleAlert size={14} />
                    KNOWLEDGE GAPS
                  </div>

                  <h2
                    style={styles.sectionTitle}
                  >
                    Critical Areas
                  </h2>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Topics that may need additional
                    attention.
                  </p>
                </div>

                <div style={styles.countBadge}>
                  {criticalGaps.length}
                </div>
              </div>

              {criticalGaps.length === 0 ? (
                <div style={styles.successBox}>
                  <div
                    style={styles.successIcon}
                  >
                    <Award size={18} />
                  </div>

                  <div>
                    <strong>
                      Excellent progress
                    </strong>

                    <p>
                      No critical knowledge gaps
                      were identified.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={styles.gapList}>
                  {criticalGaps.map(
                    (gap, index) => (
                      <div
                        key={`${gap}-${index}`}
                        style={styles.gapItem}
                      >
                        <div
                          style={
                            styles.gapIcon
                          }
                        >
                          <TriangleAlert
                            size={15}
                          />
                        </div>

                        <span>
                          {gap}
                        </span>

                        <ChevronRight
                          size={15}
                          color="#94A3B8"
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* CONCEPT PROGRESS */}

            <div style={styles.card}>
              <div style={styles.sectionHeader}>
                <div>
                  <div
                    style={styles.sectionKicker}
                  >
                    <Target size={14} />
                    CONCEPT PROGRESS
                  </div>

                  <h2
                    style={styles.sectionTitle}
                  >
                    Concept Mastery
                  </h2>

                  <p
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Detailed progress across individual
                    concepts.
                  </p>
                </div>
              </div>

              {analytics.concept_progress
                ?.length === 0 ? (
                <div
                  style={styles.emptySmall}
                >
                  No concept progress available.
                </div>
              ) : (
                <div
                  style={styles.conceptList}
                >
                  {analytics.concept_progress
                    ?.slice(0, 6)
                    .map((concept) => {
                      const mastery = clamp(
                        Number(
                          concept.mastery
                        ) || 0
                      );

                      const severity =
                        getSeverity(
                          concept.severity
                        );

                      return (
                        <div
                          key={`${concept.area}-${concept.concept}`}
                          style={
                            styles.conceptItem
                          }
                        >
                          <div
                            style={
                              styles.conceptHeader
                            }
                          >
                            <div>
                              <strong
                                style={
                                  styles.conceptName
                                }
                              >
                                {
                                  concept.concept
                                }
                              </strong>

                              <span
                                style={
                                  styles.conceptArea
                                }
                              >
                                {concept.area}
                              </span>
                            </div>

                            <div
                              style={
                                styles.conceptRight
                              }
                            >
                              <span
                                style={{
                                  ...styles.severityBadge,
                                  background:
                                    severity.background,
                                  color:
                                    severity.color,
                                  borderColor:
                                    severity.border,
                                }}
                              >
                                {
                                  severity.label
                                }
                              </span>

                              <strong
                                style={{
                                  color:
                                    mastery >= 75
                                      ? "#059669"
                                      : mastery >= 50
                                        ? "#7C3AED"
                                        : "#EA580C",
                                }}
                              >
                                {mastery.toFixed(
                                  0
                                )}
                                %
                              </strong>
                            </div>
                          </div>

                          <div
                            style={
                              styles.conceptTrack
                            }
                          >
                            <div
                              style={{
                                ...styles.conceptFill,
                                width: `${mastery}%`,
                                background:
                                  mastery >= 75
                                    ? "linear-gradient(90deg, #34D399, #059669)"
                                    : mastery >= 50
                                      ? "linear-gradient(90deg, #A78BFA, #7C3AED)"
                                      : "linear-gradient(90deg, #FDBA74, #EA580C)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </section>

          {/* ================================================= */}
          {/* WEEKLY STUDY */}
          {/* ================================================= */}

          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <div
                  style={styles.sectionKicker}
                >
                  <Clock3 size={14} />
                  STUDY ACTIVITY
                </div>

                <h2
                  style={styles.sectionTitle}
                >
                  Weekly Study Hours
                </h2>

                <p
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Your study activity across the
                  current week.
                </p>
              </div>

              <div style={styles.activityBadge}>
                <Clock3 size={13} />
                Weekly activity
              </div>
            </div>

            <div style={styles.chartBox}>
              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <BarChart
                  data={
                    analytics.weekly_hours ?? []
                  }
                  margin={{
                    top: 10,
                    right: 5,
                    left: -20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#E5E7EB"
                  />

                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748B",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94A3B8",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border:
                        "1px solid #DDD6FE",
                    }}
                    formatter={(value: any) => [
                      `${Number(
                        value
                      ).toFixed(1)} hrs`,
                      "Study time",
                    ]}
                  />

                  <Bar
                    dataKey="hours"
                    fill="#6366F1"
                    radius={[8, 8, 0, 0]}
                    barSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ================================================= */}
          {/* AI INSIGHT */}
          {/* ================================================= */}

          <section style={styles.insightCard}>
            <div style={styles.insightCircleOne}></div>
            <div style={styles.insightCircleTwo}></div>

            <div style={styles.insightIcon}>
              <Sparkles size={23} />
            </div>

            <div style={styles.insightContent}>
              <span style={styles.insightLabel}>
                AI LEARNING INSIGHT
              </span>

              <h2 style={styles.insightTitle}>
                {overallMastery >= 75
                  ? "You are building strong mastery."
                  : overallMastery >= 50
                    ? "Your learning foundation is growing."
                    : "Your next cycles are an opportunity to build stronger foundations."}
              </h2>

              <p style={styles.insightText}>
                Your current mastery is{" "}
                <strong>
                  {overallMastery.toFixed(1)}%
                </strong>{" "}
                across your diagnostic profile.
                Continue focusing on your identified
                knowledge gaps and use each diagnostic
                cycle to measure improvement.
              </p>
            </div>

            <div style={styles.insightStats}>
              <div>
                <span>Cycle</span>

                <strong>
                  {currentCycle}
                </strong>
              </div>

              <div>
                <span>Mastery</span>

                <strong>
                  {overallMastery.toFixed(0)}%
                </strong>
              </div>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        @keyframes loadingMove {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(300%);
          }
        }

        .dummy {
          display: none;
        }

        @media (max-width: 1200px) {
          .dummy {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

/*
 * ==============================================================
 * STYLES
 * ==============================================================
 */

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #F8F7FC 0%, #F5F7FF 52%, #FAF5FF 100%)",
    color: "#0F172A",
    overflowX: "hidden",
  },

  main: {
    marginLeft: 260,
    minHeight: "100vh",
  },

  content: {
    padding: "28px 34px 56px",
    maxWidth: 1600,
    margin: "0 auto",
  },

  // =========================================================
  // HEADER
  // =========================================================

  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 22,
    marginBottom: 22,
  },

  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#7C3AED",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.13em",
    marginBottom: 7,
  },

  pageTitle: {
    margin: 0,
    fontSize: 31,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-0.035em",
    background:
      "linear-gradient(90deg, #4C1D95 0%, #7C3AED 50%, #2563EB 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  pageSubtitle: {
    margin: "8px 0 0",
    color: "#64748B",
    fontSize: 13,
    lineHeight: 1.55,
    maxWidth: 680,
  },

  currentCycleBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background:
      "linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 58%, #EFF6FF 100%)",
    border: "1px solid #DDD6FE",
    borderRadius: 15,
    padding: "11px 14px",
    boxShadow:
      "0 8px 25px rgba(91,33,182,0.07)",
  },

  currentCycleIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
    color: "#FFFFFF",
  },

  badgeLabel: {
    display: "block",
    fontSize: 8,
    fontWeight: 800,
    color: "#94A3B8",
    letterSpacing: "0.09em",
  },

  badgeValue: {
    display: "block",
    marginTop: 2,
    fontSize: 13,
    color: "#334155",
  },

  // =========================================================
  // SUMMARY
  // =========================================================

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(270px, 1.35fr) repeat(3, minmax(180px, 1fr))",
    gap: 13,
    marginBottom: 17,
  },

  masteryCard: {
    position: "relative",
    minHeight: 230,
    padding: 20,
    border: "1px solid #E7E5EE",
    borderRadius: 19,
    boxShadow:
      "0 9px 30px rgba(91,33,182,0.05)",
    overflow: "hidden",
  },

  decorativeCircleLarge: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: "50%",
    right: -70,
    top: -75,
    background:
      "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)",
  },

  decorativeCircleSmall: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: "50%",
    left: -50,
    bottom: -50,
    background:
      "radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%)",
  },

  cardTop: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  cardEyebrow: {
    fontSize: 9,
    fontWeight: 800,
    color: "#94A3B8",
    letterSpacing: "0.1em",
  },

  bigNumber: {
    margin: "6px 0 0",
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#111827",
  },

  cardDescription: {
    margin: "3px 0 0",
    fontSize: 10.5,
    color: "#64748B",
  },

  iconBoxPurple: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
    color: "#7C3AED",
    position: "relative",
    zIndex: 2,
  },

  iconBoxBlue: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%)",
    color: "#2563EB",
  },

  iconBoxGreen: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #D1FAE5 0%, #DBEAFE 100%)",
    color: "#059669",
  },

  iconBoxOrange: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #FFEDD5 0%, #FCE7F3 100%)",
    color: "#EA580C",
  },

  masteryChart: {
    position: "absolute",
    right: 18,
    bottom: 17,
    width: 118,
    height: 118,
    zIndex: 2,
  },

  masteryCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    color: "#7C3AED",
  },

  masteryFooter: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#94A3B8",
    fontSize: 9.5,
    zIndex: 2,
  },

  masteryFooterPill: {
    padding: "4px 7px",
    borderRadius: 999,
    background: "#EDE9FE",
    color: "#7C3AED",
    fontWeight: 800,
  },

  metricCard: {
    position: "relative",
    minHeight: 230,
    padding: 20,
    border: "1px solid #E7E5EE",
    borderRadius: 19,
    boxShadow:
      "0 7px 25px rgba(17,24,39,0.035)",
    overflow: "hidden",
  },

  metricTopDecor: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: "50%",
    right: -50,
    top: -60,
    opacity: 0.65,
  },

  metricHeader: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  metricValue: {
    position: "relative",
    zIndex: 2,
    marginTop: 26,
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#111827",
  },

  metricDescription: {
    position: "relative",
    zIndex: 2,
    margin: "8px 0 0",
    color: "#64748B",
    fontSize: 10.5,
    lineHeight: 1.55,
    maxWidth: 240,
  },

  metricFooter: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    paddingTop: 13,
    borderTop: "1px solid #F1F5F9",
    color: "#64748B",
    fontSize: 9.5,
  },

  thetaPill: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 7px",
    borderRadius: 8,
    background: "#ECFDF5",
    color: "#059669",
    fontWeight: 700,
  },

  cyclePill: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 7px",
    borderRadius: 8,
    background: "#EFF6FF",
    color: "#2563EB",
    fontWeight: 700,
  },

  // =========================================================
  // JOURNEY
  // =========================================================

  journeyCard: {
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #FFFFFF 0%, #FAF9FF 58%, #F8FAFF 100%)",
    border: "1px solid #E7E5EE",
    borderRadius: 21,
    padding: 23,
    marginBottom: 17,
    boxShadow:
      "0 9px 30px rgba(91,33,182,0.045)",
  },

  journeyBackgroundOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: "50%",
    right: -130,
    top: -120,
    background:
      "radial-gradient(circle, rgba(124,58,237,0.07), transparent 70%)",
  },

  journeyBackgroundTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: "50%",
    left: -100,
    bottom: -110,
    background:
      "radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)",
  },

  journeyHeader: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 24,
  },

  sectionHeader: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
  },

  sectionKicker: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#7C3AED",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.1em",
    marginBottom: 6,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
    letterSpacing: "-0.025em",
    color: "#111827",
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#64748B",
    fontSize: 10.5,
    lineHeight: 1.5,
  },

  growthBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 11px",
    borderRadius: 11,
    background: "#ECFDF5",
    color: "#059669",
    border: "1px solid #D1FAE5",
    flexShrink: 0,
  },

  growthBadgeNegative: {
    background: "#FEF2F2",
    color: "#DC2626",
    borderColor: "#FECACA",
  },

  // =========================================================
  // TIMELINE
  // =========================================================

  cycleTimeline: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
  },

  timelineItem: {
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    gap: 11,
  },

  timelineRail: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  timelineDot: {
    width: 29,
    height: 29,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #F1F5F9 0%, #EDE9FE 100%)",
    color: "#64748B",
    border: "4px solid #FFFFFF",
    boxShadow:
      "0 0 0 1px #E2E8F0",
    zIndex: 2,
    fontSize: 10,
    fontWeight: 800,
  },

  timelineDotActive: {
    background:
      "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 0 0 4px #EDE9FE",
  },

  timelineLine: {
    position: "absolute",
    top: 30,
    bottom: 0,
    width: 2,
    background:
      "linear-gradient(180deg, #DDD6FE, #DBEAFE)",
  },

  cycleProgressCard: {
    padding: "15px 16px 17px",
    marginBottom: 11,
    border: "1px solid #E7E5EE",
    borderRadius: 14,
    background: "#FFFFFF",
  },

  currentCycleCard: {
    border: "1px solid #DDD6FE",
    background:
      "linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)",
    boxShadow:
      "0 7px 23px rgba(124,58,237,0.07)",
  },

  cycleCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
  },

  cycleTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  cycleTitle: {
    margin: 0,
    fontSize: 13.5,
    fontWeight: 800,
    color: "#1E293B",
  },

  currentLabel: {
    padding: "3px 6px",
    borderRadius: 5,
    background:
      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
    color: "#7C3AED",
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: "0.08em",
  },

  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 9.5,
  },

  cycleChange: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "#059669",
    background: "#ECFDF5",
    borderRadius: 7,
    padding: "4px 7px",
    fontSize: 10,
    fontWeight: 800,
  },

  cycleChangeNegative: {
    color: "#DC2626",
    background: "#FEF2F2",
  },

  cycleStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 15,
    padding: "11px 0",
    borderTop: "1px solid #F1F5F9",
    borderBottom: "1px solid #F1F5F9",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 13,
    marginBottom: 6,
    color: "#64748B",
    fontSize: 9.5,
    fontWeight: 700,
  },

  cycleProgressTrack: {
    height: 7,
    borderRadius: 10,
    background: "#EDE9FE",
    overflow: "hidden",
  },

  cycleProgressFill: {
    height: "100%",
    borderRadius: 10,
    background:
      "linear-gradient(90deg, #A78BFA, #7C3AED, #6366F1)",
    transition: "width 0.5s ease",
  },

  cycleChartContainer: {
    position: "relative",
    zIndex: 2,
    marginTop: 16,
    padding: "18px 18px 8px",
    borderRadius: 14,
    background:
      "linear-gradient(135deg, #F8FAFC 0%, #FAF9FF 100%)",
    border: "1px solid #F1F5F9",
  },

  chartHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  chartTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 800,
    color: "#334155",
  },

  chartSubtitle: {
    margin: "3px 0 0",
    fontSize: 9.5,
    color: "#94A3B8",
  },

  chartLegend: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#64748B",
    fontSize: 9.5,
    fontWeight: 600,
  },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #7C3AED, #3B82F6)",
  },

  // =========================================================
  // TWO COLUMN
  // =========================================================

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 17,
    marginBottom: 17,
  },

  card: {
    background: "#FFFFFF",
    border: "1px solid #E7E5EE",
    borderRadius: 19,
    padding: 21,
    boxShadow:
      "0 7px 25px rgba(17,24,39,0.035)",
    minWidth: 0,
  },

  chartBox: {
    width: "100%",
    minHeight: 300,
  },

  bloomList: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
    marginTop: 2,
  },

  bloomItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 9px",
    background:
      "linear-gradient(135deg, #FAFAFC 0%, #F8FAFF 100%)",
    border:
      "1px solid #F1F5F9",
    borderRadius: 9,
    fontSize: 10.5,
    color: "#475569",
  },

  bloomItemLeft: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  },

  bloomLevel: {
    width: 23,
    height: 23,
    borderRadius: 7,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
    color: "#7C3AED",
    fontSize: 8,
    fontWeight: 800,
  },

  areaList: {
    display: "flex",
    flexDirection: "column",
    gap: 17,
  },

  areaItem: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  areaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 9,
  },

  areaNameWrap: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },

  areaNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 8.5,
    fontWeight: 800,
  },

  areaName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  areaValue: {
    fontSize: 11.5,
    color: "#475569",
  },

  areaTrack: {
    height: 7,
    background: "#F1F5F9",
    borderRadius: 10,
    overflow: "hidden",
  },

  areaFill: {
    height: "100%",
    borderRadius: 10,
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    padding: "0 7px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
    color: "#DC2626",
    fontSize: 10,
    fontWeight: 800,
  },

  // =========================================================
  // GAPS
  // =========================================================

  gapList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  gapItem: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 11px",
    border: "1px solid #F1F5F9",
    borderRadius: 11,
    background:
      "linear-gradient(135deg, #FFFFFF 0%, #FAF9FF 100%)",
    color: "#334155",
    fontSize: 10.5,
    fontWeight: 600,
  },

  gapIcon: {
    width: 28,
    height: 28,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background:
      "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
    color: "#DC2626",
  },

  successBox: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: 14,
    borderRadius: 12,
    background:
      "linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%)",
    border: "1px solid #D1FAE5",
  },

  successIcon: {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background:
      "linear-gradient(135deg, #D1FAE5 0%, #DBEAFE 100%)",
    color: "#059669",
  },

  // =========================================================
  // CONCEPTS
  // =========================================================

  conceptList: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
  },

  conceptItem: {
    paddingBottom: 14,
    borderBottom: "1px solid #F1F5F9",
  },

  conceptHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  conceptName: {
    display: "block",
    color: "#334155",
    fontSize: 11.5,
    fontWeight: 700,
  },

  conceptArea: {
    display: "block",
    marginTop: 2,
    color: "#94A3B8",
    fontSize: 9,
  },

  conceptRight: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexShrink: 0,
    fontSize: 10.5,
    color: "#475569",
  },

  severityBadge: {
    padding: "3px 6px",
    border: "1px solid",
    borderRadius: 6,
    fontSize: 7.5,
    fontWeight: 800,
  },

  conceptTrack: {
    height: 6,
    marginTop: 8,
    background: "#F1F5F9",
    borderRadius: 10,
    overflow: "hidden",
  },

  conceptFill: {
    height: "100%",
    borderRadius: 10,
  },

  // =========================================================
  // WEEKLY
  // =========================================================

  activityBadge: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 9px",
    borderRadius: 8,
    background:
      "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
    color: "#6366F1",
    fontSize: 9,
    fontWeight: 700,
  },

  // =========================================================
  // INSIGHT
  // =========================================================

  insightCard: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 21,
    borderRadius: 20,
    background:
      "linear-gradient(135deg, #2E1065 0%, #4C1D95 45%, #6366F1 78%, #2563EB 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 14px 38px rgba(76,29,149,0.18)",
  },

  insightCircleOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: "50%",
    right: -120,
    top: -130,
    background: "rgba(255,255,255,0.08)",
  },

  insightCircleTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    left: -70,
    bottom: -70,
    background: "rgba(255,255,255,0.05)",
  },

  insightIcon: {
    width: 46,
    height: 46,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    background: "rgba(255,255,255,0.12)",
    border:
      "1px solid rgba(255,255,255,0.13)",
    color: "#DDD6FE",
    position: "relative",
    zIndex: 2,
  },

  insightContent: {
    flex: 1,
    minWidth: 0,
    position: "relative",
    zIndex: 2,
  },

  insightLabel: {
    display: "block",
    color: "#C4B5FD",
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: "0.12em",
  },

  insightTitle: {
    margin: "4px 0 4px",
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },

  insightText: {
    margin: 0,
    color: "#DDD6FE",
    fontSize: 10.5,
    lineHeight: 1.55,
  },

  insightStats: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    gap: 25,
    paddingLeft: 22,
    borderLeft:
      "1px solid rgba(255,255,255,0.15)",
  },

  // =========================================================
  // EMPTY
  // =========================================================

  emptySmall: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 170,
    color: "#94A3B8",
    fontSize: 10.5,
  },

  emptyJourney: {
    minHeight: 240,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 7,
    color: "#94A3B8",
    border: "1px dashed #C4B5FD",
    borderRadius: 15,
    background:
      "linear-gradient(135deg, #FAFAFF 0%, #F8FAFF 100%)",
  },

  // =========================================================
  // LOADING
  // =========================================================

  loadingContainer: {
    minHeight: "72vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 30,
  },

  loadingGraphic: {
    position: "relative",
    width: 84,
    height: 84,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingGlowOne: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(124,58,237,0.14), transparent 70%)",
  },

  loadingGlowTwo: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(59,130,246,0.16), transparent 70%)",
  },

  loadingIcon: {
    position: "relative",
    zIndex: 2,
    width: 58,
    height: 58,
    borderRadius: 17,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 12px 28px rgba(99,102,241,0.18)",
  },

  loadingBadge: {
    marginTop: 17,
    padding: "5px 8px",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
    color: "#6D28D9",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "0.7px",
  },

  loadingTitle: {
    margin: "9px 0 4px",
    fontSize: 20,
    fontWeight: 800,
    color: "#1E293B",
  },

  loadingText: {
    margin: 0,
    color: "#64748B",
    fontSize: 12,
  },

  loadingBar: {
    width: 220,
    height: 5,
    overflow: "hidden",
    borderRadius: 999,
    background: "#EDE9FE",
    marginTop: 19,
  },

  loadingBarInner: {
    width: "38%",
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, #7C3AED, #6366F1, #3B82F6)",
    animation: "loadingMove 1.2s infinite",
  },

  // =========================================================
  // ERROR
  // =========================================================

  errorContainer: {
    minHeight: "72vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 30,
    position: "relative",
    overflow: "hidden",
  },

  errorGlow: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(124,58,237,0.07), transparent 70%)",
    top: "10%",
    right: "15%",
  },

  errorIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
    color: "#DC2626",
    marginBottom: 14,
    position: "relative",
    zIndex: 2,
  },

  errorBadge: {
    position: "relative",
    zIndex: 2,
    padding: "5px 8px",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
    color: "#6D28D9",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "0.7px",
  },

  errorTitle: {
    position: "relative",
    zIndex: 2,
    margin: "10px 0 5px",
    fontSize: 20,
    fontWeight: 800,
    color: "#1E293B",
  },

  errorText: {
    position: "relative",
    zIndex: 2,
    margin: 0,
    maxWidth: 500,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.55,
  },
};