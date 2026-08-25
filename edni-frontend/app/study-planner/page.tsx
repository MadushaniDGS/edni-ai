'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface Task {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_hours: number;
  order: number;
}

interface StudyWeek {
  week_number: number;
  phase: string;
  theme: string;
  tasks: Task[];
}

interface StudyPlan {
  id: string;
  student_id: string;
  weeks: StudyWeek[];
  created_at: string;
  total_weeks: number;
}

// Color palette
const COLORS = {
  primary: "#6C63FF",
  primaryHover: "#4F46E5",
  secondary: "#A855F7",
  accent: "#EC4899",
  bgDark: "#0F172A",
  bgCard: "#1E293B",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  borderDark: "#334155",
  success: "#22C55E",
};

// Spinner component
function Spinner() {
  return (
    <div style={{
      width: 40,
      height: 40,
      border: `3px solid ${COLORS.borderDark}`,
      borderTop: `3px solid ${COLORS.primary}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
  );
}

// Badge component
function Badge({ difficulty }: { difficulty: string }) {
  const badgeStyles: Record<string, React.CSSProperties> = {
    hard: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#FCA5A5',
      borderLeft: `3px solid #EF4444`,
    },
    medium: {
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#FBBF24',
      borderLeft: `3px solid #F59E0B`,
    },
    easy: {
      background: 'rgba(34, 197, 94, 0.15)',
      color: '#86EFAC',
      borderLeft: `3px solid #22C55E`,
    },
  };

  return (
    <span style={{
      fontSize: '0.75rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      ...badgeStyles[difficulty],
    }}>
      {difficulty.toUpperCase()}
    </span>
  );
}

export default function StudyPlannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('edni_access');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await axios.get(`${API_URL}/planner`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPlan(res.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch study plan:', err);
        setError('Failed to load study plan');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [router]);

  const toggleTaskComplete = (taskId: string) => {
    const updated = new Set(completedTasks);
    if (updated.has(taskId)) {
      updated.delete(taskId);
    } else {
      updated.add(taskId);
    }
    setCompletedTasks(updated);
  };

  const currentWeek = plan?.weeks[selectedWeek];
  const progressPercent = currentWeek
    ? Math.round(
      (currentWeek.tasks.filter((t) => completedTasks.has(t.id)).length /
        currentWeek.tasks.length) *
      100
    )
    : 0;

  const phaseColors: Record<string, string> = {
    Foundation: COLORS.primaryHover,
    Intermediate: COLORS.secondary,
    Advanced: COLORS.accent,
  };

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
          <Spinner />
          <p style={{ color: COLORS.textSecondary }}>Loading your study plan...</p>
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

  if (error || !plan) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bgDark,
        padding: '1.5rem',
      }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          <div style={{
            background: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '2rem',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#EF4444',
              marginBottom: '1rem',
            }}>Unable to Load Study Plan</h2>
            <p style={{
              color: COLORS.textSecondary,
              marginBottom: '1.5rem',
            }}>
              {error || 'No study plan found. Complete the diagnostic assessment first.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => router.push('/diagnostic')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: `0 4px 15px rgba(108, 99, 255, 0.3)`,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                📊 Take Diagnostic
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  color: COLORS.textSecondary,
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
                  e.currentTarget.style.color = COLORS.textSecondary;
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          padding: '1.5rem',
          paddingLeft: '2rem',
          paddingRight: '2rem',
        }}>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: COLORS.textPrimary,
            marginBottom: '0.5rem',
          }}>16-Week Study Plan</h1>
          <p style={{ color: COLORS.textSecondary }}>Personalized roadmap to mastery</p>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem',
        paddingLeft: '2rem',
        paddingRight: '2rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '1.5rem',
        }}>
          {/* Week timeline sidebar */}
          <div>
            <div style={{
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.borderDark}`,
              borderRadius: 12,
              padding: '1.5rem',
              position: 'sticky',
              top: '6rem',
              maxHeight: 'calc(100vh - 8rem)',
              overflowY: 'auto',
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: COLORS.textPrimary,
                marginBottom: '1rem',
              }}>Weeks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {plan.weeks.map((week) => (
                  <button
                    key={week.week_number}
                    onClick={() => setSelectedWeek(week.week_number - 1)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: selectedWeek === week.week_number - 1
                        ? `1px solid ${COLORS.primary}`
                        : `1px solid transparent`,
                      backgroundColor: selectedWeek === week.week_number - 1
                        ? 'rgba(108, 99, 255, 0.1)'
                        : 'transparent',
                      color: selectedWeek === week.week_number - 1
                        ? COLORS.primary
                        : COLORS.textSecondary,
                      fontWeight: selectedWeek === week.week_number - 1 ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedWeek !== week.week_number - 1) {
                        e.currentTarget.style.backgroundColor = 'rgba(108, 99, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedWeek !== week.week_number - 1) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <p style={{ fontWeight: 600, margin: 0 }}>Week {week.week_number}</p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: COLORS.textSecondary,
                      margin: '0.25rem 0 0 0',
                    }}>{week.phase}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div>
            {currentWeek ? (
              <>
                {/* Week overview */}
                <div style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.borderDark}`,
                  borderRadius: 12,
                  padding: '2rem',
                  marginBottom: '1.5rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                  }}>
                    <div>
                      <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: 0,
                      }}>
                        Week {currentWeek.week_number}
                      </h2>
                      <p style={{
                        color: phaseColors[currentWeek.phase],
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        margin: '0.5rem 0 0 0',
                      }}>
                        {currentWeek.phase} Phase
                      </p>
                    </div>
                    <div style={{
                      padding: '0.75rem 1.5rem',
                      background: phaseColors[currentWeek.phase],
                      color: 'white',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                    }}>
                      {progressPercent}% Complete
                    </div>
                  </div>

                  <p style={{
                    color: COLORS.textSecondary,
                    margin: '0 0 1.5rem 0',
                  }}>
                    Focus on mastering key concepts this week
                  </p>

                  {/* Progress bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                    }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        margin: 0,
                      }}>Weekly Progress</p>
                      <span style={{
                        fontSize: '0.875rem',
                        color: COLORS.primary,
                        fontWeight: 700,
                      }}>{progressPercent}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      borderRadius: '9999px',
                      height: '0.75rem',
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: '9999px',
                          background: phaseColors[currentWeek.phase],
                          width: `${progressPercent}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Task stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    paddingTop: '1rem',
                    borderTop: `1px solid ${COLORS.borderDark}`,
                  }}>
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: COLORS.textSecondary,
                        margin: '0 0 0.25rem 0',
                      }}>Total Tasks</p>
                      <p style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: 0,
                      }}>{currentWeek.tasks.length}</p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: COLORS.textSecondary,
                        margin: '0 0 0.25rem 0',
                      }}>Completed</p>
                      <p style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: COLORS.success,
                        margin: 0,
                      }}>{completedTasks.size}</p>
                    </div>
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: COLORS.textSecondary,
                        margin: '0 0 0.25rem 0',
                      }}>Est. Hours</p>
                      <p style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: 0,
                      }}>
                        {currentWeek.tasks.reduce((sum, t) => sum + t.estimated_hours, 0)}h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tasks list */}
                <div style={{
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.borderDark}`,
                  borderRadius: 12,
                  padding: '2rem',
                  marginBottom: '1.5rem',
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    marginBottom: '1.5rem',
                    margin: 0,
                  }}>Tasks</h3>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginTop: '1.5rem',
                  }}>
                    {currentWeek.tasks.map((task, idx) => (
                      <div
                        key={task.id}
                        style={{
                          padding: '1rem',
                          border: `2px solid ${completedTasks.has(task.id)
                            ? 'rgba(34, 197, 94, 0.3)'
                            : COLORS.borderDark
                            }`,
                          backgroundColor: completedTasks.has(task.id)
                            ? 'rgba(34, 197, 94, 0.05)'
                            : 'rgba(30, 41, 59, 0.3)',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = COLORS.primary;
                          e.currentTarget.style.backgroundColor = 'rgba(108, 99, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = completedTasks.has(task.id)
                            ? 'rgba(34, 197, 94, 0.3)'
                            : COLORS.borderDark;
                          e.currentTarget.style.backgroundColor = completedTasks.has(task.id)
                            ? 'rgba(34, 197, 94, 0.05)'
                            : 'rgba(30, 41, 59, 0.3)';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                        }}>
                          <input
                            type="checkbox"
                            checked={completedTasks.has(task.id)}
                            onChange={() => toggleTaskComplete(task.id)}
                            style={{
                              marginTop: '0.25rem',
                              accentColor: COLORS.primary,
                              width: 18,
                              height: 18,
                              cursor: 'pointer',
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                fontWeight: 600,
                                color: completedTasks.has(task.id)
                                  ? COLORS.textSecondary
                                  : COLORS.textPrimary,
                                textDecoration: completedTasks.has(task.id)
                                  ? 'line-through'
                                  : 'none',
                                margin: 0,
                              }}
                            >
                              {idx + 1}. {task.title}
                            </p>
                            <p style={{
                              fontSize: '0.875rem',
                              color: COLORS.textSecondary,
                              marginTop: '0.25rem',
                              margin: '0.25rem 0 0 0',
                            }}>{task.description}</p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginTop: '0.75rem',
                            }}>
                              <Badge difficulty={task.difficulty} />
                              <span style={{
                                fontSize: '0.75rem',
                                color: COLORS.textSecondary,
                              }}>⏱️ {task.estimated_hours}h</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation buttons */}
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginTop: '1.5rem',
                }}>
                  <button
                    onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                    disabled={selectedWeek === 0}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'transparent',
                      color: selectedWeek === 0 ? COLORS.textSecondary : COLORS.textPrimary,
                      border: `1.5px solid ${COLORS.borderDark}`,
                      borderRadius: 10,
                      fontWeight: 600,
                      cursor: selectedWeek === 0 ? 'not-allowed' : 'pointer',
                      opacity: selectedWeek === 0 ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedWeek > 0) {
                        e.currentTarget.style.borderColor = COLORS.primary;
                        e.currentTarget.style.color = COLORS.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedWeek > 0) {
                        e.currentTarget.style.borderColor = COLORS.borderDark;
                        e.currentTarget.style.color = COLORS.textPrimary;
                      }
                    }}
                  >
                    ← Previous Week
                  </button>
                  <button
                    onClick={() => setSelectedWeek(Math.min(plan.weeks.length - 1, selectedWeek + 1))}
                    disabled={selectedWeek === plan.weeks.length - 1}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'transparent',
                      color: selectedWeek === plan.weeks.length - 1 ? COLORS.textSecondary : COLORS.textPrimary,
                      border: `1.5px solid ${COLORS.borderDark}`,
                      borderRadius: 10,
                      fontWeight: 600,
                      cursor: selectedWeek === plan.weeks.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: selectedWeek === plan.weeks.length - 1 ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedWeek < plan.weeks.length - 1) {
                        e.currentTarget.style.borderColor = COLORS.primary;
                        e.currentTarget.style.color = COLORS.primary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedWeek < plan.weeks.length - 1) {
                        e.currentTarget.style.borderColor = COLORS.borderDark;
                        e.currentTarget.style.color = COLORS.textPrimary;
                      }
                    }}
                  >
                    Next Week →
                  </button>
                </div>

                {/* Quick actions */}
                <div style={{
                  marginTop: '3rem',
                  padding: '1.5rem',
                  background: `linear-gradient(to right, rgba(108, 99, 255, 0.1), rgba(168, 85, 247, 0.1))`,
                  border: `1px solid rgba(108, 99, 255, 0.2)`,
                  borderRadius: 12,
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    marginBottom: '1rem',
                    margin: 0,
                  }}>Need help?</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(1, 1fr)',
                    gap: '1rem',
                    marginTop: '1rem',
                  }}>
                    {[
                      {
                        icon: '📖',
                        title: 'Access Resources',
                        desc: 'Learning materials for this week',
                        route: '/learning-resources',
                      },
                      {
                        icon: '🤖',
                        title: 'Chat with Mentor',
                        desc: 'Get personalized guidance',
                        route: '/mentor',
                      },
                      {
                        icon: '📊',
                        title: 'View Analytics',
                        desc: 'Track your progress',
                        route: '/dashboard',
                      },
                    ].map((action) => (
                      <button
                        key={action.route}
                        onClick={() => router.push(action.route)}
                        style={{
                          padding: '1rem',
                          backgroundColor: 'rgba(30, 41, 59, 0.5)',
                          border: `1px solid ${COLORS.borderDark}`,
                          borderRadius: 10,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = COLORS.primary;
                          e.currentTarget.style.backgroundColor = 'rgba(108, 99, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = COLORS.borderDark;
                          e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                        }}
                      >
                        <p style={{
                          fontSize: '1.5rem',
                          margin: '0 0 0.5rem 0',
                        }}>{action.icon}</p>
                        <p style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: COLORS.textPrimary,
                          margin: 0,
                        }}>{action.title}</p>
                        <p style={{
                          fontSize: '0.75rem',
                          color: COLORS.textSecondary,
                          margin: '0.25rem 0 0 0',
                        }}>{action.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}