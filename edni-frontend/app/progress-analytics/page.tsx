'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8000/api/v1';

const COLORS = {
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  bg: '#ffffff',
  bgCard: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

interface AnalyticsData {
  overall_mastery: number;
  bloom_summary: Record<string, number>;
  concept_progress: Record<string, number>;
  critical_gaps: string[];
  study_time_by_day: Array<{
    date: string;
    hours: number;
  }>;
  mastery_trend: Array<{
    date: string;
    mastery: number;
  }>;
}

export default function ProgressAnalyticsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('month');
  const [analytics, setAnalytics] =
    useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('edni_access');

        if (!token) {
          router.push('/login');
          return;
        }

        /*
         * API_URL = http://localhost:8000/api/v1
         *
         * Request becomes:
         * http://localhost:8000/api/v1/analytics?timeframe=month
         */
        const res = await axios.get<AnalyticsData>(
          `${API_URL}/analytics`,
          {
            params: {
              timeframe,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            localStorage.removeItem('edni_access');
            router.push('/login');
            return;
          }

          if (err.response?.status === 404) {
            setError(
              'Analytics endpoint was not found. Please check the API URL.'
            );
          } else if (err.response?.data?.detail) {
            setError(err.response.data.detail);
          } else {
            setError(
              `Failed to load analytics (${err.response?.status ?? 'network error'}).`
            );
          }
        } else {
          setError('Failed to load analytics.');
        }

        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeframe, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${COLORS.border}`,
              borderTop: `3px solid ${COLORS.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />

          <p style={{ color: COLORS.textMuted }}>
            Loading your analytics...
          </p>
        </div>

        <style>{`
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

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.bg,
        }}
      >
        <Sidebar />

        <div
          style={{
            marginLeft: 240,
            minHeight: '100vh',
          }}
        >
          <TopBar title="Progress Analytics" />

          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '2rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: `1px solid ${COLORS.error}`,
                borderRadius: 12,
                padding: '1.5rem',
              }}
            >
              <h2
                style={{
                  color: '#991b1b',
                  marginTop: 0,
                }}
              >
                Unable to load analytics
              </h2>

              <p
                style={{
                  color: '#991b1b',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </p>

              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: COLORS.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const bloomData = Object.entries(
    analytics.bloom_summary
  ).map(([level, score]) => ({
    name: level,
    value: score,
  }));

  const conceptData = Object.entries(
    analytics.concept_progress
  )
    .sort((a, b) => b[1] - a[1])
    .map(([concept, progress]) => ({
      name: concept,
      progress,
    }));

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
      }}
    >
      <Sidebar />

      <div
        style={{
          marginLeft: 240,
          minHeight: '100vh',
        }}
      >
        <TopBar title="Progress Analytics" />

        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '2rem',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  margin: 0,
                  color: COLORS.textPrimary,
                }}
              >
                📈 Progress Analytics
              </h1>

              <p
                style={{
                  color: COLORS.textMuted,
                  margin: '0.5rem 0 0',
                  fontSize: '0.875rem',
                }}
              >
                Deep dive into your learning metrics
              </p>
            </div>

            <select
              value={timeframe}
              onChange={(e) =>
                setTimeframe(e.target.value)
              }
              style={{
                padding: '0.5rem 1rem',
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: 8,
                backgroundColor: '#f9fafb',
                color: COLORS.textPrimary,
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Key Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Overall Mastery */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem',
                  fontWeight: 500,
                }}
              >
                Overall Mastery
              </p>

              <p
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                  color: COLORS.success,
                }}
              >
                {analytics.overall_mastery}%
              </p>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                Current mastery
              </p>
            </div>

            {/* Study Streak */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem',
                  fontWeight: 500,
                }}
              >
                Study Streak
              </p>

              <p
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                  color: COLORS.textPrimary,
                }}
              >
                12 days
              </p>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                Keep it going! 🔥
              </p>
            </div>

            {/* Total Study Time */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem',
                  fontWeight: 500,
                }}
              >
                Total Study Time
              </p>

              <p
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                  color: COLORS.textPrimary,
                }}
              >
                42.8h
              </p>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                This month
              </p>
            </div>

            {/* Concepts Mastered */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  color: COLORS.textMuted,
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem',
                  fontWeight: 500,
                }}
              >
                Concepts Mastered
              </p>

              <p
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                  color: COLORS.textPrimary,
                }}
              >
                4 of 9
              </p>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                44% complete
              </p>
            </div>
          </div>

          {/* Charts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Mastery Trend */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 1.5rem',
                }}
              >
                Mastery Progress Over Time
              </h3>

              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <LineChart
                  data={analytics.mastery_trend}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={COLORS.border}
                  />

                  <XAxis
                    dataKey="date"
                    stroke={COLORS.textMuted}
                    style={{ fontSize: '12px' }}
                  />

                  <YAxis
                    stroke={COLORS.textMuted}
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                    }}
                    labelStyle={{
                      color: COLORS.textPrimary,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="mastery"
                    stroke={COLORS.success}
                    strokeWidth={3}
                    dot={{
                      fill: COLORS.success,
                      r: 4,
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Study Time */}
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow:
                  '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 1.5rem',
                }}
              >
                Study Time by Day
              </h3>

              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <BarChart
                  data={analytics.study_time_by_day}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={COLORS.border}
                  />

                  <XAxis
                    dataKey="date"
                    stroke={COLORS.textMuted}
                    style={{ fontSize: '12px' }}
                  />

                  <YAxis
                    stroke={COLORS.textMuted}
                    style={{ fontSize: '12px' }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                    }}
                    labelStyle={{
                      color: COLORS.textPrimary,
                    }}
                    formatter={(value) => `${value}h`}
                  />

                  <Bar
                    dataKey="hours"
                    fill={COLORS.primary}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bloom's Taxonomy */}
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow:
                '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 1.5rem',
              }}
            >
              Bloom's Taxonomy Levels
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(100px, 1fr))',
                gap: '1rem',
              }}
            >
              {bloomData.map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: COLORS.textMuted,
                      margin: '0 0 0.5rem',
                    }}
                  >
                    {item.name}
                  </p>

                  <p
                    style={{
                      fontSize: '1.875rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      margin: '0 0 0.5rem',
                    }}
                  >
                    {item.value}%
                  </p>

                  <div
                    style={{
                      width: '100%',
                      backgroundColor: COLORS.border,
                      borderRadius: 9999,
                      height: '0.5rem',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: COLORS.primary,
                        borderRadius: 9999,
                        width: `${item.value}%`,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concept Progress */}
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow:
                '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 1.5rem',
              }}
            >
              Concept Mastery Progress
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {conceptData.map((concept) => {
                const colors: Record<string, string> = {
                  'Data Structures': '#10b981',
                  Algorithms: '#6366f1',
                  OOP: '#8b5cf6',
                  Database: '#f59e0b',
                  Networks: '#ef4444',
                  'System Design': '#ec4899',
                };

                return (
                  <div key={concept.name}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: COLORS.textPrimary,
                          margin: 0,
                        }}
                      >
                        {concept.name}
                      </p>

                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                          color:
                            colors[concept.name] ||
                            COLORS.primary,
                        }}
                      >
                        {concept.progress}%
                      </span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        backgroundColor: COLORS.border,
                        borderRadius: 9999,
                        height: '0.75rem',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 9999,
                          backgroundColor:
                            colors[concept.name] ||
                            COLORS.primary,
                          width: `${concept.progress}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Gaps */}
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow:
                '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: COLORS.textPrimary,
                margin: '0 0 1.5rem',
              }}
            >
              Priority Areas for Improvement
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {analytics.critical_gaps.map(
                (gap, idx) => (
                  <div
                    key={idx}
                    onClick={() =>
                      router.push('/learning-resources')
                    }
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fef2f2',
                      border:
                        '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        '#fee2e2';
                      e.currentTarget.style.borderColor =
                        COLORS.error;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        '#fef2f2';
                      e.currentTarget.style.borderColor =
                        'rgba(239, 68, 68, 0.3)';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontWeight: 600,
                            color: COLORS.textPrimary,
                            margin: 0,
                          }}
                        >
                          {gap}
                        </p>

                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: COLORS.textMuted,
                            margin: '0.25rem 0 0',
                          }}
                        >
                          Recommend: Study plan +
                          resources
                        </p>
                      </div>

                      <span
                        style={{
                          fontSize: '1.5rem',
                        }}
                      >
                        →
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() =>
                router.push('/study-planner')
              }
              style={{
                flex: 1,
                minWidth: 200,
                padding: '0.75rem 1.5rem',
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow:
                  '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  'translateY(-2px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(99, 102, 241, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(99, 102, 241, 0.25)';
              }}
            >
              📅 Review Study Plan
            </button>

            <button
              onClick={() =>
                router.push('/learning-resources')
              }
              style={{
                flex: 1,
                minWidth: 200,
                padding: '0.75rem 1.5rem',
                background: '#ffffff',
                color: COLORS.primary,
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  COLORS.primary;
                e.currentTarget.style.backgroundColor =
                  '#eff6ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  COLORS.border;
                e.currentTarget.style.backgroundColor =
                  '#ffffff';
              }}
            >
              📖 Access Resources
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
