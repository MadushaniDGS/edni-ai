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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const COLORS = {
  primary: "#6C63FF",
  primaryHover: "#4F46E5",
  secondary: "#A855F7",
  accent: "#EC4899",
  bgDark: "#0F172A",
  bgCard: "#1E293B",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  borderDark: "#334155",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

interface AnalyticsData {
  overall_mastery: number;
  bloom_summary: Record<string, number>;
  concept_progress: Record<string, number>;
  critical_gaps: string[];
  study_time_by_day: Array<{ date: string; hours: number }>;
  mastery_trend: Array<{ date: string; mastery: number }>;
  bloom_heatmap: Array<{
    concept: string;
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  }>;
}

export default function ProgressAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('edni_access');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await axios.get(`${API_URL}/analytics?timeframe=${timeframe}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAnalytics(res.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        // Mock data for demo
        setAnalytics({
          overall_mastery: 72,
          bloom_summary: {
            Remember: 85,
            Understand: 72,
            Apply: 65,
            Analyze: 48,
            Evaluate: 35,
            Create: 28,
          },
          concept_progress: {
            'Data Structures': 88,
            'Algorithms': 65,
            'OOP': 72,
            'Database': 45,
            'Networks': 52,
            'System Design': 38,
          },
          critical_gaps: ['System Design', 'Database Design', 'Advanced Algorithms'],
          study_time_by_day: [
            { date: 'Mon', hours: 2.5 },
            { date: 'Tue', hours: 3.8 },
            { date: 'Wed', hours: 5.2 },
            { date: 'Thu', hours: 2.0 },
            { date: 'Fri', hours: 4.0 },
            { date: 'Sat', hours: 1.5 },
            { date: 'Sun', hours: 2.8 },
          ],
          mastery_trend: [
            { date: 'Week 1', mastery: 45 },
            { date: 'Week 2', mastery: 52 },
            { date: 'Week 3', mastery: 58 },
            { date: 'Week 4', mastery: 65 },
            { date: 'Week 5', mastery: 68 },
            { date: 'Week 6', mastery: 72 },
          ],
          bloom_heatmap: [
            {
              concept: 'Data Structures',
              remember: 95,
              understand: 88,
              apply: 78,
              analyze: 65,
              evaluate: 52,
              create: 35,
            },
            {
              concept: 'Algorithms',
              remember: 80,
              understand: 72,
              apply: 65,
              analyze: 48,
              evaluate: 35,
              create: 22,
            },
            {
              concept: 'System Design',
              remember: 75,
              understand: 52,
              apply: 35,
              analyze: 28,
              evaluate: 18,
              create: 12,
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeframe, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bgDark,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${COLORS.borderDark}`,
            borderTop: `3px solid ${COLORS.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: COLORS.textMuted }}>Loading your analytics...</p>
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

  if (!analytics) return null;

  const bloomData = Object.entries(analytics.bloom_summary).map(([level, score]) => ({
    name: level,
    value: score,
  }));

  const conceptData = Object.entries(analytics.concept_progress)
    .sort((a, b) => b[1] - a[1])
    .map(([concept, progress]) => ({
      name: concept,
      progress: progress,
    }));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bgDark }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${COLORS.borderDark}`,
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1.5rem 2rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              margin: 0,
              color: COLORS.textPrimary,
            }}>📈 Progress Analytics</h1>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: `1.5px solid ${COLORS.borderDark}`,
                borderRadius: 8,
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
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
          <p style={{ color: COLORS.textMuted, margin: 0 }}>Deep dive into your learning metrics</p>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        {error && (
          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.error}`,
            borderRadius: 12,
            padding: '1rem',
            marginBottom: '1.5rem',
          }}>
            <p style={{
              fontSize: '0.875rem',
              color: COLORS.error,
              margin: 0,
            }}>{error}</p>
          </div>
        )}

        {/* Key metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            <p style={{
              color: COLORS.textMuted,
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              margin: '0 0 0.5rem 0',
            }}>Overall Mastery</p>
            <p style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: COLORS.success,
              margin: '0 0 0.5rem 0',
            }}>
              {analytics.overall_mastery}%
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: COLORS.textMuted,
              margin: 0,
            }}>+5% since last month</p>
          </div>

          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            <p style={{
              color: COLORS.textMuted,
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              margin: '0 0 0.5rem 0',
            }}>Study Streak</p>
            <p style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: COLORS.textPrimary,
              margin: '0 0 0.5rem 0',
            }}>12 days</p>
            <p style={{
              fontSize: '0.75rem',
              color: COLORS.textMuted,
              margin: 0,
            }}>Keep it going! 🔥</p>
          </div>

          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            <p style={{
              color: COLORS.textMuted,
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              margin: '0 0 0.5rem 0',
            }}>Total Study Time</p>
            <p style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: COLORS.textPrimary,
              margin: '0 0 0.5rem 0',
            }}>42.8h</p>
            <p style={{
              fontSize: '0.75rem',
              color: COLORS.textMuted,
              margin: 0,
            }}>This month</p>
          </div>

          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            <p style={{
              color: COLORS.textMuted,
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              margin: '0 0 0.5rem 0',
            }}>Concepts Mastered</p>
            <p style={{
              fontSize: '2.25rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: COLORS.textPrimary,
              margin: '0 0 0.5rem 0',
            }}>4 of 9</p>
            <p style={{
              fontSize: '0.75rem',
              color: COLORS.textMuted,
              margin: 0,
            }}>44% complete</p>
          </div>
        </div>

        {/* Charts section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {/* Mastery Trend */}
          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: COLORS.textPrimary,
              margin: 0,
            }}>Mastery Progress Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.mastery_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #2d3250' }}
                  labelStyle={{ color: '#e8eaed' }}
                />
                <Line
                  type="monotone"
                  dataKey="mastery"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  dot={{ fill: COLORS.success }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Study Time by Day */}
          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '1.5rem',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              color: COLORS.textPrimary,
              margin: 0,
            }}>Study Time by Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.study_time_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #2d3250' }}
                  labelStyle={{ color: '#e8eaed' }}
                  formatter={(value) => `${value}h`}
                />
                <Bar dataKey="hours" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bloom's Taxonomy breakdown */}
        <div style={{
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDark}`,
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: COLORS.textPrimary,
            margin: 0,
          }}>Bloom's Taxonomy Levels</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '1rem',
          }}>
            {bloomData.map((item) => (
              <div key={item.name} style={{
                padding: '1rem',
                backgroundColor: 'rgba(30, 41, 59, 0.3)',
                borderRadius: 8,
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  marginBottom: '0.5rem',
                  margin: '0 0 0.5rem 0',
                }}>{item.name}</p>
                <p style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  color: COLORS.textPrimary,
                  margin: '0 0 0.5rem 0',
                }}>{item.value}%</p>
                <div style={{
                  width: '100%',
                  backgroundColor: COLORS.borderDark,
                  borderRadius: 9999,
                  height: '0.5rem',
                  overflow: 'hidden',
                }}>
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: COLORS.primary,
                      borderRadius: 9999,
                      width: `${item.value}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Concept Progress */}
        <div style={{
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDark}`,
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: COLORS.textPrimary,
            margin: 0,
          }}>Concept Mastery Progress</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            {conceptData.map((concept) => {
              const colors: Record<string, string> = {
                'Data Structures': '#10b981',
                'Algorithms': '#4f46e5',
                'OOP': '#7c3aed',
                'Database': '#f59e0b',
                'Networks': '#ef4444',
                'System Design': '#ec4899',
              };
              return (
                <div key={concept.name}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}>
                    <p style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: COLORS.textPrimary,
                      margin: 0,
                    }}>{concept.name}</p>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      color: colors[concept.name] || COLORS.primary,
                    }}>
                      {concept.progress}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: 9999,
                    height: '0.75rem',
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 9999,
                        backgroundColor: colors[concept.name] || COLORS.primary,
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

        {/* Bloom Heatmap */}
        <div style={{
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDark}`,
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: COLORS.textPrimary,
            margin: 0,
          }}>Bloom's Taxonomy Heatmap by Concept</h3>
          <table style={{
            width: '100%',
            fontSize: '0.875rem',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr style={{
                borderBottom: `1px solid ${COLORS.borderDark}`,
              }}>
                <th style={{
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}>Concept</th>
                <th style={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: COLORS.textPrimary,
                }}>Remember</th>
                <th style={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: COLORS.textPrimary,
                }}>Understand</th>
                <th style={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: COLORS.textPrimary,
                }}>Apply</th>
                <th style={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: COLORS.textPrimary,
                }}>Analyze</th>
                <th style={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: COLORS.textPrimary,
                }}>Evaluate</th>
                <th style={{
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: COLORS.textPrimary,
                }}>Create</th>
              </tr>
            </thead>
            <tbody>
              {analytics.bloom_heatmap.map((row, idx) => (
                <tr key={idx} style={{
                  borderBottom: `1px solid rgba(51, 65, 85, 0.5)`,
                }}>
                  <td style={{
                    padding: '1rem',
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}>{row.concept}</td>
                  {[
                    row.remember,
                    row.understand,
                    row.apply,
                    row.analyze,
                    row.evaluate,
                    row.create,
                  ].map((value, i) => {
                    const hueColorMap = [
                      '#4f46e5', // blue
                      '#7c3aed', // purple
                      '#ec4899', // pink
                      '#f59e0b', // orange
                      '#ef4444', // red
                      '#10b981', // green
                    ];
                    const opacity = value / 100;
                    return (
                      <td
                        key={i}
                        style={{
                          textAlign: 'center',
                          padding: '1rem',
                          backgroundColor: `${hueColorMap[i]}${Math.round(opacity * 40).toString(16).padStart(2, '0')}`,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: value > 50 ? '#1a1f3a' : '#9ca3af',
                          }}
                        >
                          {value}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Critical Gaps */}
        <div style={{
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDark}`,
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: COLORS.textPrimary,
            margin: 0,
          }}>Priority Areas for Improvement</h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {analytics.critical_gaps.map((gap, idx) => (
              <div
                key={idx}
                onClick={() => router.push('/learning-resources')}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid rgba(239, 68, 68, 0.2)`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      margin: 0,
                    }}>{gap}</p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: COLORS.textMuted,
                      marginTop: '0.25rem',
                      margin: '0.25rem 0 0 0',
                    }}>Recommend: Study plan + resources</p>
                  </div>
                  <span style={{ fontSize: '1.5rem' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => router.push('/study-planner')}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.75rem 1.5rem',
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: `0 4px 15px rgba(108, 99, 255, 0.3)`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            📅 Review Study Plan
          </button>
          <button
            onClick={() => router.push('/learning-resources')}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: COLORS.textPrimary,
              border: `1.5px solid ${COLORS.borderDark}`,
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.primary;
              e.currentTarget.style.color = COLORS.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = COLORS.borderDark;
              e.currentTarget.style.color = COLORS.textPrimary;
            }}
          >
            📖 Access Resources
          </button>
        </div>
      </div>
    </div>
  );
}