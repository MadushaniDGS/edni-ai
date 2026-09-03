'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

const COLORS = {
  primary: '#6366f1',
  bg: '#ffffff',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

interface WeekPlan {
  week: number;
  title: string;
  topics: string[];
  status: 'completed' | 'in-progress' | 'upcoming';
  progress: number;
  estimatedHours: number;
}

export default function StudyPlannerPage() {
  const router = useRouter();

  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('edni_access');

    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const weeks: WeekPlan[] = [
    {
      week: 1,
      title: 'Foundations: Variables & Data Types',
      topics: ['Primitive Types', 'Variable Scope', 'Type Conversion', 'Constants'],
      status: 'completed',
      progress: 100,
      estimatedHours: 6,
    },
    {
      week: 2,
      title: 'Control Flow: Loops & Conditionals',
      topics: ['If/Else Statements', 'Switch Cases', 'For Loops', 'While Loops'],
      status: 'completed',
      progress: 100,
      estimatedHours: 8,
    },
    {
      week: 3,
      title: 'Functions & Scope',
      topics: [
        'Function Definition',
        'Parameters & Returns',
        'Scope & Closure',
        'Higher-Order Functions',
      ],
      status: 'in-progress',
      progress: 60,
      estimatedHours: 7,
    },
    {
      week: 4,
      title: 'Arrays & Collections',
      topics: [
        'Array Operations',
        'Iteration Methods',
        'Slicing & Splicing',
        'Searching & Sorting',
      ],
      status: 'in-progress',
      progress: 35,
      estimatedHours: 9,
    },
    {
      week: 5,
      title: 'String Manipulation',
      topics: ['String Methods', 'Regular Expressions', 'Text Processing', 'Encoding'],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 6,
    },
    {
      week: 6,
      title: 'Objects & Dictionaries',
      topics: [
        'Object Creation',
        'Property Access',
        'Nested Objects',
        'Serialization',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 8,
    },
    {
      week: 7,
      title: 'Basic Algorithms: Searching & Sorting',
      topics: ['Linear Search', 'Binary Search', 'Bubble Sort', 'Quick Sort'],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 10,
    },
    {
      week: 8,
      title: 'Algorithm Complexity Analysis',
      topics: [
        'Big O Notation',
        'Time Complexity',
        'Space Complexity',
        'Trade-offs',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 7,
    },
    {
      week: 9,
      title: 'Recursion & Backtracking',
      topics: [
        'Recursive Functions',
        'Base Cases',
        'Call Stack',
        'Backtracking Patterns',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 9,
    },
    {
      week: 10,
      title: 'Data Structures: Lists & Stacks',
      topics: [
        'Linked Lists',
        'Stack Implementation',
        'Queue Implementation',
        'Deque',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 10,
    },
    {
      week: 11,
      title: 'Trees & Graph Fundamentals',
      topics: [
        'Binary Trees',
        'Tree Traversal',
        'Graph Representation',
        'DFS & BFS',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 11,
    },
    {
      week: 12,
      title: 'Advanced Algorithms: Graphs',
      topics: [
        'Shortest Path',
        'Minimum Spanning Tree',
        'Topological Sort',
        'Cycle Detection',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 10,
    },
    {
      week: 13,
      title: 'Dynamic Programming Basics',
      topics: [
        'Memoization',
        'Overlapping Subproblems',
        'Optimal Substructure',
        'Classic Problems',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 12,
    },
    {
      week: 14,
      title: 'Object-Oriented Programming',
      topics: [
        'Classes & Objects',
        'Inheritance',
        'Polymorphism',
        'Design Patterns',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 10,
    },
    {
      week: 15,
      title: 'Integration & Design Patterns',
      topics: [
        'Refactoring',
        'Design Patterns',
        'Testing Strategies',
        'Documentation',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 8,
    },
    {
      week: 16,
      title: 'Capstone Review & Assessment',
      topics: [
        'Comprehensive Review',
        'Problem Solving',
        'Final Assessment',
        'Next Steps',
      ],
      status: 'upcoming',
      progress: 0,
      estimatedHours: 6,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: '#ecfdf5',
          border: '#d1fae5',
          text: '#065f46',
        };

      case 'in-progress':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1e40af',
        };

      case 'upcoming':
        return {
          bg: '#fafafa',
          border: '#e5e7eb',
          text: '#6b7280',
        };

      default:
        return {
          bg: '#ffffff',
          border: COLORS.border,
          text: COLORS.textPrimary,
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';

      case 'in-progress':
        return '↗';

      case 'upcoming':
        return '○';

      default:
        return '?';
    }
  };

  const totalHours = weeks.reduce(
    (sum, week) => sum + week.estimatedHours,
    0
  );

  const completedWeeks = weeks.filter(
    (week) => week.status === 'completed'
  ).length;

  const inProgressWeeks = weeks.filter(
    (week) => week.status === 'in-progress'
  ).length;

  const overallProgress =
    ((completedWeeks + inProgressWeeks * 0.5) / weeks.length) * 100;

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
            Loading study plan...
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

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        style={{
          marginLeft: 240,
          minHeight: '100vh',
        }}
      >
        {/* Top Bar */}
        <TopBar title="Study Planner" />

        {/* Page Header */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '1.5rem 2rem',
            }}
          >
            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 700,
                margin: 0,
                marginBottom: '0.5rem',
                color: COLORS.textPrimary,
              }}
            >
              📅 16-Week Study Plan
            </h1>

            <p
              style={{
                color: COLORS.textMuted,
                margin: 0,
                fontSize: '0.875rem',
              }}
            >
              Personalized learning path from fundamentals to mastery
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '2rem',
          }}
        >
          {/* Progress Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem',
            }}
          >
            {/* Overall Progress */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Overall Progress
              </p>

              <p
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  margin: '0.5rem 0',
                  color: COLORS.primary,
                }}
              >
                {Math.round(overallProgress)}%
              </p>

              <div
                style={{
                  height: 6,
                  backgroundColor: COLORS.border,
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginTop: '0.75rem',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${overallProgress}%`,
                    backgroundColor: COLORS.primary,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Weeks Completed */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Weeks Completed
              </p>

              <p
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  margin: '0.5rem 0',
                  color: COLORS.success,
                }}
              >
                {completedWeeks}/{weeks.length}
              </p>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                On track
              </p>
            </div>

            {/* Total Hours */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Total Hours
              </p>

              <p
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  margin: '0.5rem 0',
                  color: COLORS.textPrimary,
                }}
              >
                {totalHours}h
              </p>

              <p
                style={{
                  fontSize: '0.75rem',
                  color: COLORS.textMuted,
                  margin: 0,
                }}
              >
                Recommended commitment
              </p>
            </div>
          </div>

          {/* Week Timeline */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {weeks.map((week) => {
              const statusColor = getStatusColor(week.status);
              const isExpanded = expandedWeek === week.week;

              return (
                <div
                  key={week.week}
                  style={{
                    backgroundColor: '#ffffff',
                    border: `1.5px solid ${statusColor.border}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Week Header */}
                  <button
                    onClick={() =>
                      setExpandedWeek(
                        isExpanded ? null : week.week
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '1.5rem',
                      backgroundColor: statusColor.bg,
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        statusColor.border;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        statusColor.bg;
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          flex: 1,
                        }}
                      >
                        {/* Status Icon */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: statusColor.border,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: statusColor.text,
                            fontSize: '1.25rem',
                          }}
                        >
                          {getStatusIcon(week.status)}
                        </div>

                        {/* Week Info */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <h3
                              style={{
                                fontWeight: 700,
                                margin: 0,
                                color: COLORS.textPrimary,
                                fontSize: '1rem',
                              }}
                            >
                              Week {week.week}: {week.title}
                            </h3>

                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '0.25rem 0.5rem',
                                backgroundColor: statusColor.border,
                                color: statusColor.text,
                                borderRadius: 4,
                              }}
                            >
                              {week.status === 'completed'
                                ? 'Completed'
                                : week.status === 'in-progress'
                                  ? 'In Progress'
                                  : 'Upcoming'}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: '0.875rem',
                              color: COLORS.textMuted,
                              margin: 0,
                            }}
                          >
                            {week.estimatedHours}h estimated
                          </p>
                        </div>
                      </div>

                      {/* Progress */}
                      {week.status !== 'upcoming' && (
                        <div
                          style={{
                            marginRight: '1rem',
                          }}
                        >
                          <div
                            style={{
                              width: 60,
                              height: 6,
                              backgroundColor: COLORS.border,
                              borderRadius: 3,
                              overflow: 'hidden',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${week.progress}%`,
                                backgroundColor: COLORS.success,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>

                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: COLORS.textMuted,
                              margin: 0,
                              textAlign: 'center',
                            }}
                          >
                            {week.progress}%
                          </p>
                        </div>
                      )}

                      {/* Expand Icon */}
                      <div
                        style={{
                          fontSize: '1.5rem',
                          transition: 'transform 0.2s',
                          transform: isExpanded
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '1.5rem',
                        borderTop: `1px solid ${COLORS.border}`,
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: COLORS.textMuted,
                            margin: '0 0 0.75rem 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Topics to Cover
                        </h4>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '0.75rem',
                          }}
                        >
                          {week.topics.map((topic, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '0.75rem',
                                backgroundColor: '#ffffff',
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: 8,
                                fontSize: '0.875rem',
                                color: COLORS.textPrimary,
                                fontWeight: 500,
                              }}
                            >
                              • {topic}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Learning Resources Button */}
                      {week.status !== 'completed' && (
                        <button
                          onClick={() =>
                            router.push('/learning-resources')
                          }
                          style={{
                            width: '100%',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: COLORS.primary,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              '#4f46e5';
                            e.currentTarget.style.transform =
                              'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              COLORS.primary;
                            e.currentTarget.style.transform =
                              'translateY(0)';
                          }}
                        >
                          📚 Access Learning Resources
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '2rem',
              padding: '2rem',
              backgroundColor: '#f9fafb',
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: COLORS.textMuted,
                margin: 0,
                fontSize: '0.875rem',
              }}
            >
              💡 Tip: Stay consistent with your study schedule to
              maintain your learning momentum and achieve mastery.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

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