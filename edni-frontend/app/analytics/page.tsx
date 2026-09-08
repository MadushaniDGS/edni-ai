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
   *
   * IMPORTANT:
   * No gap?.name here.
   * Backend objects contain concept/mastery/severity/area.
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
          <Topbar />

          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>
              <Brain size={30} />
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
          <Topbar />

          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>
              <TriangleAlert size={30} />
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
        <Topbar />

        <div style={styles.content}>

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div style={styles.pageHeader}>
            <div>
              <div style={styles.eyebrow}>
                <Activity size={15} />
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
                <Sparkles size={17} />
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

            <div style={styles.masteryCard}>
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
                  <Brain size={21} />
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
                      background
                      dataKey="value"
                      cornerRadius={20}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>

                <div style={styles.masteryCenter}>
                  <Award size={20} />

                  <strong>
                    {overallMastery.toFixed(0)}%
                  </strong>

                  <span>Mastery</span>
                </div>
              </div>
            </div>

            {/* THETA */}

            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <div style={styles.iconBoxBlue}>
                  <Target size={21} />
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
                  <TrendingUp size={14} />
                  Active
                </div>
              </div>
            </div>

            {/* CYCLE */}

            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <div style={styles.iconBoxGreen}>
                  <Activity size={21} />
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
                  <CalendarDays size={14} />
                  Ongoing
                </div>
              </div>
            </div>

            {/* GROWTH */}

            <div style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <div style={styles.iconBoxOrange}>
                  {totalCycleChange >= 0 ? (
                    <TrendingUp size={21} />
                  ) : (
                    <TrendingDown size={21} />
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
            <div style={styles.journeyHeader}>
              <div>
                <div style={styles.sectionKicker}>
                  <Activity size={15} />
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
                  <TrendingUp size={17} />
                ) : (
                  <TrendingDown size={17} />
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
                <Activity size={30} />

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
                                <Sparkles size={13} />
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
                                    size={13}
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
                                        size={14}
                                      />
                                    ) : (
                                      <TrendingDown
                                        size={14}
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
                            fontSize: 12,
                          }}
                        />

                        <YAxis
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#94A3B8",
                            fontSize: 11,
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border:
                              "1px solid #E2E8F0",
                            boxShadow:
                              "0 10px 30px rgba(15,23,42,0.08)",
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
                    <Brain size={15} />
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
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94A3B8",
                        fontSize: 11,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border:
                          "1px solid #E2E8F0",
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
                      radius={[7, 7, 0, 0]}
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

                    <strong>
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
                    <BookOpen size={15} />
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
                                style={
                                  styles.areaNumber
                                }
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
                    <TriangleAlert size={15} />
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
                    <Award size={20} />
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
                            size={16}
                          />
                        </div>

                        <span>
                          {gap}
                        </span>

                        <ChevronRight
                          size={16}
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
                    <Target size={15} />
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

                              <strong>
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
                  <Clock3 size={15} />
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
                <Clock3 size={14} />
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
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#94A3B8",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border:
                        "1px solid #E2E8F0",
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
                    radius={[7, 7, 0, 0]}
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
            <div style={styles.insightIcon}>
              <Sparkles size={24} />
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
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }

          100% {
            transform: translateX(250%);
          }
        }

        @media (max-width: 1250px) {
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
    background: "#F8FAFC",
    color: "#0F172A",
  },

  main: {
    marginLeft: 260,
    minHeight: "100vh",
  },

  content: {
    padding: "32px 36px 60px",
    maxWidth: 1600,
    margin: "0 auto",
  },

  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 28,
  },

  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.12em",
    marginBottom: 8,
  },

  pageTitle: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.15,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#0F172A",
  },

  pageSubtitle: {
    margin: "9px 0 0",
    color: "#64748B",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 700,
  },

  currentCycleBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 16,
    padding: "12px 16px",
    boxShadow:
      "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  currentCycleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F3E8FF",
    color: "#7C3AED",
  },

  badgeLabel: {
    display: "block",
    fontSize: 9,
    fontWeight: 800,
    color: "#94A3B8",
    letterSpacing: "0.08em",
  },

  badgeValue: {
    display: "block",
    marginTop: 2,
    fontSize: 14,
    color: "#334155",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(270px, 1.35fr) repeat(3, minmax(190px, 1fr))",
    gap: 16,
    marginBottom: 20,
  },

  masteryCard: {
    position: "relative",
    minHeight: 250,
    padding: 22,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 20,
    boxShadow:
      "0 8px 30px rgba(15, 23, 42, 0.045)",
    overflow: "hidden",
  },

  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  cardEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    color: "#94A3B8",
    letterSpacing: "0.1em",
  },

  bigNumber: {
    margin: "7px 0 0",
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#111827",
  },

  cardDescription: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#64748B",
  },

  iconBoxPurple: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F3E8FF",
    color: "#7C3AED",
  },

  iconBoxBlue: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#EFF6FF",
    color: "#2563EB",
  },

  iconBoxGreen: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ECFDF5",
    color: "#059669",
  },

  iconBoxOrange: {
    width: 42,
    height: 42,
    borderRadius: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FFF7ED",
    color: "#EA580C",
  },

  masteryChart: {
    position: "absolute",
    right: 20,
    bottom: 12,
    width: 125,
    height: 125,
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

  metricCard: {
    minHeight: 250,
    padding: 22,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 20,
    boxShadow:
      "0 8px 30px rgba(15, 23, 42, 0.045)",
  },

  metricHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  metricValue: {
    marginTop: 27,
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    color: "#111827",
  },

  metricDescription: {
    margin: "9px 0 0",
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.6,
  },

  metricFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 25,
    paddingTop: 15,
    borderTop: "1px solid #F1F5F9",
    color: "#64748B",
    fontSize: 11,
  },

  thetaPill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 8px",
    borderRadius: 8,
    background: "#ECFDF5",
    color: "#059669",
    fontWeight: 700,
  },

  cyclePill: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 8px",
    borderRadius: 8,
    background: "#EFF6FF",
    color: "#2563EB",
    fontWeight: 700,
  },

  journeyCard: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 22,
    padding: 26,
    marginBottom: 20,
    boxShadow:
      "0 10px 35px rgba(15, 23, 42, 0.045)",
  },

  journeyHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 28,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 24,
  },

  sectionKicker: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#7C3AED",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.1em",
    marginBottom: 7,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.025em",
    color: "#111827",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.5,
  },

  growthBadge: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 13px",
    borderRadius: 12,
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

  cycleTimeline: {
    display: "flex",
    flexDirection: "column",
  },

  timelineItem: {
    display: "grid",
    gridTemplateColumns: "42px 1fr",
    gap: 14,
  },

  timelineRail: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F1F5F9",
    color: "#64748B",
    border: "4px solid #FFFFFF",
    boxShadow:
      "0 0 0 1px #E2E8F0",
    zIndex: 2,
    fontSize: 11,
    fontWeight: 800,
  },

  timelineDotActive: {
    background: "#7C3AED",
    color: "#FFFFFF",
    boxShadow:
      "0 0 0 4px #EDE9FE",
  },

  timelineLine: {
    position: "absolute",
    top: 32,
    bottom: 0,
    width: 2,
    background: "#E2E8F0",
  },

  cycleProgressCard: {
    padding: "17px 18px 19px",
    marginBottom: 13,
    border: "1px solid #E2E8F0",
    borderRadius: 16,
    background: "#FFFFFF",
  },

  currentCycleCard: {
    border: "1px solid #DDD6FE",
    background:
      "linear-gradient(135deg, #FFFFFF 0%, #FAF5FF 100%)",
    boxShadow:
      "0 8px 25px rgba(124, 58, 237, 0.08)",
  },

  cycleCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },

  cycleTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  cycleTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: "#1E293B",
  },

  currentLabel: {
    padding: "3px 7px",
    borderRadius: 6,
    background: "#EDE9FE",
    color: "#7C3AED",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: "0.08em",
  },

  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
    color: "#94A3B8",
    fontSize: 11,
  },

  cycleChange: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "#059669",
    background: "#ECFDF5",
    borderRadius: 8,
    padding: "5px 8px",
    fontSize: 11,
    fontWeight: 800,
  },

  cycleChangeNegative: {
    color: "#DC2626",
    background: "#FEF2F2",
  },

  cycleStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginTop: 18,
    padding: "12px 0",
    borderTop: "1px solid #F1F5F9",
    borderBottom: "1px solid #F1F5F9",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 15,
    marginBottom: 7,
    color: "#64748B",
    fontSize: 10,
    fontWeight: 700,
  },

  cycleProgressTrack: {
    height: 8,
    borderRadius: 10,
    background: "#EDE9FE",
    overflow: "hidden",
  },

  cycleProgressFill: {
    height: "100%",
    borderRadius: 10,
    background:
      "linear-gradient(90deg, #8B5CF6, #7C3AED)",
    transition: "width 0.5s ease",
  },

  cycleChartContainer: {
    marginTop: 20,
    padding: "20px 20px 10px",
    borderRadius: 16,
    background: "#F8FAFC",
    border: "1px solid #F1F5F9",
  },

  chartHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  chartTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 800,
    color: "#334155",
  },

  chartSubtitle: {
    margin: "4px 0 0",
    fontSize: 11,
    color: "#94A3B8",
  },

  chartLegend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#64748B",
    fontSize: 11,
    fontWeight: 600,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#7C3AED",
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 20,
  },

  card: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 20,
    padding: 24,
    boxShadow:
      "0 8px 30px rgba(15, 23, 42, 0.04)",
    minWidth: 0,
  },

  chartBox: {
    width: "100%",
    minHeight: 300,
  },

  bloomList: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: 5,
  },

  bloomItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 10px",
    background: "#F8FAFC",
    borderRadius: 10,
    fontSize: 11,
    color: "#475569",
  },

  bloomItemLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  bloomLevel: {
    width: 25,
    height: 25,
    borderRadius: 7,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#EDE9FE",
    color: "#7C3AED",
    fontSize: 9,
    fontWeight: 800,
  },

  areaList: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  areaItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  areaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  areaNameWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  areaNumber: {
    width: 29,
    height: 29,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F1F5F9",
    color: "#64748B",
    fontSize: 9,
    fontWeight: 800,
  },

  areaName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  areaValue: {
    fontSize: 12,
    color: "#475569",
  },

  areaTrack: {
    height: 8,
    background: "#F1F5F9",
    borderRadius: 10,
    overflow: "hidden",
  },

  areaFill: {
    height: "100%",
    borderRadius: 10,
    background:
      "linear-gradient(90deg, #A78BFA, #7C3AED)",
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    padding: "0 8px",
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FEF2F2",
    color: "#DC2626",
    fontSize: 12,
    fontWeight: 800,
  },

  gapList: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
  },

  gapItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 13px",
    border: "1px solid #F1F5F9",
    borderRadius: 12,
    background: "#FAFAFA",
    color: "#334155",
    fontSize: 12,
    fontWeight: 600,
  },

  gapIcon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background: "#FEF2F2",
    color: "#DC2626",
  },

  conceptList: {
    display: "flex",
    flexDirection: "column",
    gap: 17,
  },

  conceptItem: {
    paddingBottom: 16,
    borderBottom: "1px solid #F1F5F9",
  },

  conceptHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },

  conceptName: {
    display: "block",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
  },

  conceptArea: {
    display: "block",
    marginTop: 3,
    color: "#94A3B8",
    fontSize: 10,
  },

  conceptRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    fontSize: 11,
    color: "#475569",
  },

  severityBadge: {
    padding: "4px 7px",
    border: "1px solid",
    borderRadius: 6,
    fontSize: 8,
    fontWeight: 800,
  },

  conceptTrack: {
    height: 6,
    marginTop: 9,
    background: "#F1F5F9",
    borderRadius: 10,
    overflow: "hidden",
  },

  conceptFill: {
    height: "100%",
    borderRadius: 10,
    background: "#8B5CF6",
  },

  activityBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    borderRadius: 9,
    background: "#F1F5F9",
    color: "#64748B",
    fontSize: 10,
    fontWeight: 700,
  },

  insightCard: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: 24,
    borderRadius: 20,
    background:
      "linear-gradient(135deg, #2E1065 0%, #4C1D95 50%, #6D28D9 100%)",
    color: "#FFFFFF",
    boxShadow:
      "0 15px 40px rgba(76, 29, 149, 0.2)",
  },

  insightIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    background: "rgba(255,255,255,0.13)",
    color: "#DDD6FE",
  },

  insightContent: {
    flex: 1,
    minWidth: 0,
  },

  insightLabel: {
    display: "block",
    color: "#C4B5FD",
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.12em",
  },

  insightTitle: {
    margin: "5px 0 5px",
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },

  insightText: {
    margin: 0,
    color: "#DDD6FE",
    fontSize: 12,
    lineHeight: 1.6,
  },

  insightStats: {
    display: "flex",
    gap: 28,
    paddingLeft: 25,
    borderLeft:
      "1px solid rgba(255,255,255,0.15)",
  },

  successBox: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: 16,
    borderRadius: 13,
    background: "#ECFDF5",
    border: "1px solid #D1FAE5",
  },

  successIcon: {
    width: 38,
    height: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "#D1FAE5",
    color: "#059669",
  },

  emptySmall: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    color: "#94A3B8",
    fontSize: 12,
  },

  emptyJourney: {
    minHeight: 260,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 8,
    color: "#94A3B8",
    border: "1px dashed #CBD5E1",
    borderRadius: 16,
    background: "#F8FAFC",
  },

  loadingContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 30,
  },

  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F3E8FF",
    color: "#7C3AED",
    marginBottom: 18,
  },

  loadingTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#1E293B",
  },

  loadingText: {
    margin: "7px 0 20px",
    color: "#64748B",
    fontSize: 13,
  },

  loadingBar: {
    width: 230,
    height: 5,
    overflow: "hidden",
    borderRadius: 10,
    background: "#EDE9FE",
  },

  loadingBarInner: {
    width: "40%",
    height: "100%",
    borderRadius: 10,
    background: "#7C3AED",
    animation: "loading 1.2s infinite",
  },

  errorContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 30,
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FEF2F2",
    color: "#DC2626",
    marginBottom: 18,
  },

  errorTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#1E293B",
  },

  errorText: {
    margin: "8px 0 0",
    maxWidth: 500,
    color: "#64748B",
    fontSize: 13,
  },
};