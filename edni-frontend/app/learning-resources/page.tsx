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

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'interactive' | 'exercise';
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concepts: string[];
  url: string;
  rating: number;
  views: number;
}

export default function LearningResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('edni_access');

    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const resources: Resource[] = [
    {
      id: '1',
      title: 'Variables & Data Types Explained',
      description:
        'Comprehensive guide to understanding primitive and complex data types in modern programming.',
      type: 'video',
      duration: '24 min',
      difficulty: 'beginner',
      concepts: ['Variables', 'Data Types', 'Type Conversion'],
      url: '#',
      rating: 4.8,
      views: 12500,
    },
    {
      id: '2',
      title: 'JavaScript Array Methods',
      description:
        'Master all array methods: map, filter, reduce, and more with practical examples.',
      type: 'interactive',
      duration: '45 min',
      difficulty: 'intermediate',
      concepts: ['Arrays', 'Higher-Order Functions', 'Functional Programming'],
      url: '#',
      rating: 4.9,
      views: 8900,
    },
    {
      id: '3',
      title: 'Binary Search Algorithm',
      description:
        'Learn one of the most important algorithms with step-by-step visualization and code.',
      type: 'article',
      duration: '15 min read',
      difficulty: 'intermediate',
      concepts: ['Algorithms', 'Search', 'Big O Notation'],
      url: '#',
      rating: 4.7,
      views: 5600,
    },
    {
      id: '4',
      title: 'Recursion Deep Dive',
      description:
        'Understanding recursion, base cases, and how the call stack works with visual demonstrations.',
      type: 'video',
      duration: '38 min',
      difficulty: 'intermediate',
      concepts: ['Recursion', 'Call Stack', 'Backtracking'],
      url: '#',
      rating: 4.6,
      views: 9200,
    },
    {
      id: '5',
      title: 'Dynamic Programming Patterns',
      description:
        'Identify and solve DP problems using proven patterns and memoization techniques.',
      type: 'article',
      duration: '20 min read',
      difficulty: 'advanced',
      concepts: ['Dynamic Programming', 'Optimization', 'Memoization'],
      url: '#',
      rating: 4.5,
      views: 4100,
    },
    {
      id: '6',
      title: 'Graph Algorithms Playground',
      description:
        'Interactive environment to visualize and understand DFS, BFS, and shortest path algorithms.',
      type: 'interactive',
      duration: '60 min',
      difficulty: 'advanced',
      concepts: ['Graphs', 'Traversal', 'Shortest Path'],
      url: '#',
      rating: 4.8,
      views: 7300,
    },
    {
      id: '7',
      title: 'Sorting Algorithms Comparison',
      description:
        'Compare time complexity, space complexity, and stability of major sorting algorithms.',
      type: 'interactive',
      duration: '40 min',
      difficulty: 'beginner',
      concepts: ['Sorting', 'Algorithms', 'Complexity Analysis'],
      url: '#',
      rating: 4.7,
      views: 11200,
    },
    {
      id: '8',
      title: 'OOP Principles Explained',
      description:
        'Master inheritance, polymorphism, encapsulation, and abstraction with real-world examples.',
      type: 'video',
      duration: '52 min',
      difficulty: 'intermediate',
      concepts: ['OOP', 'Classes', 'Design Patterns'],
      url: '#',
      rating: 4.9,
      views: 6800,
    },
    {
      id: '9',
      title: 'Tree Data Structures',
      description:
        'Complete guide to binary trees, BSTs, AVL trees, and tree traversal algorithms.',
      type: 'article',
      duration: '25 min read',
      difficulty: 'intermediate',
      concepts: ['Trees', 'Data Structures', 'Traversal'],
      url: '#',
      rating: 4.6,
      views: 5400,
    },
    {
      id: '10',
      title: 'Practice Problems: Strings',
      description:
        'Solve 50+ string manipulation problems with solutions and explanations.',
      type: 'exercise',
      duration: 'Self-paced',
      difficulty: 'beginner',
      concepts: ['Strings', 'Practice', 'Problem Solving'],
      url: '#',
      rating: 4.8,
      views: 3200,
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return {
          bg: '#dbeafe',
          border: '#93c5fd',
          icon: '🎥',
          label: 'Video',
        };
      case 'article':
        return {
          bg: '#e0e7ff',
          border: '#a5b4fc',
          icon: '📄',
          label: 'Article',
        };
      case 'interactive':
        return {
          bg: '#dcfce7',
          border: '#86efac',
          icon: '⚡',
          label: 'Interactive',
        };
      case 'exercise':
        return {
          bg: '#fef3c7',
          border: '#fde047',
          icon: '✏️',
          label: 'Exercise',
        };
      default:
        return {
          bg: COLORS.bg,
          border: COLORS.border,
          icon: '?',
          label: type,
        };
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return {
          color: COLORS.success,
          bg: '#ecfdf5',
        };
      case 'intermediate':
        return {
          color: '#f59e0b',
          bg: '#fffbeb',
        };
      case 'advanced':
        return {
          color: COLORS.error,
          bg: '#fef2f2',
        };
      default:
        return {
          color: COLORS.textMuted,
          bg: '#f9fafb',
        };
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      searchTerm === '' ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.concepts.some((c) =>
        c.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesType =
      selectedType === null || resource.type === selectedType;

    const matchesDifficulty =
      selectedDifficulty === null ||
      resource.difficulty === selectedDifficulty;

    return matchesSearch && matchesType && matchesDifficulty;
  });

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
            Loading resources...
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

      {/* Main Area */}
      <div
        style={{
          marginLeft: 240,
          minHeight: '100vh',
        }}
      >
        {/* Top Bar */}
        <TopBar title="Learning Resources" />

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
              📚 Learning Resources
            </h1>

            <p
              style={{
                color: COLORS.textMuted,
                margin: 0,
                fontSize: '0.875rem',
              }}
            >
              Curated materials to help you master concepts from beginner to advanced
            </p>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '2rem',
          }}
        >
          {/* Filters and Search */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {/* Search */}
            <div
              style={{
                gridColumn: 'span 2',
              }}
            >
              <input
                type="text"
                placeholder="Search resources, concepts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `1.5px solid ${COLORS.border}`,
                  borderRadius: 8,
                  backgroundColor: '#f9fafb',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = COLORS.primary;
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = COLORS.border;
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
              />
            </div>

            {/* Type Filter */}
            <div>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                Type
              </label>

              <select
                value={selectedType || ''}
                onChange={(e) =>
                  setSelectedType(e.target.value || null)
                }
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1.5px solid ${COLORS.border}`,
                  borderRadius: 8,
                  backgroundColor: '#f9fafb',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Types</option>
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="interactive">Interactive</option>
                <option value="exercise">Exercise</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                Difficulty
              </label>

              <select
                value={selectedDifficulty || ''}
                onChange={(e) =>
                  setSelectedDifficulty(e.target.value || null)
                }
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1.5px solid ${COLORS.border}`,
                  borderRadius: 8,
                  backgroundColor: '#f9fafb',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <p
            style={{
              fontSize: '0.875rem',
              color: COLORS.textMuted,
              margin: '0 0 1.5rem 0',
            }}
          >
            Showing {filteredResources.length} of {resources.length} resources
          </p>

          {/* Resources Grid */}
          {filteredResources.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {filteredResources.map((resource) => {
                const typeColor = getTypeColor(resource.type);
                const diffColor = getDifficultyColor(
                  resource.difficulty
                );

                return (
                  <div
                    key={resource.id}
                    onClick={() =>
                      window.open(resource.url, '_blank')
                    }
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow:
                        '0 1px 3px rgba(0, 0, 0, 0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform =
                        'translateY(-4px)';
                      e.currentTarget.style.boxShadow =
                        '0 8px 24px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor =
                        COLORS.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform =
                        'translateY(0)';
                      e.currentTarget.style.boxShadow =
                        '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.borderColor =
                        COLORS.border;
                    }}
                  >
                    {/* Card Header */}
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: typeColor.bg,
                        borderBottom: `1px solid ${typeColor.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>
                          {typeColor.icon}
                        </span>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#666',
                          }}
                        >
                          {typeColor.label}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.5rem',
                          backgroundColor: diffColor.bg,
                          color: diffColor.color,
                          borderRadius: 4,
                        }}
                      >
                        {resource.difficulty === 'beginner'
                          ? '🟢 Beginner'
                          : resource.difficulty === 'intermediate'
                            ? '🟡 Intermediate'
                            : '🔴 Advanced'}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '1.5rem' }}>
                      <h3
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          margin: '0 0 0.5rem 0',
                          color: COLORS.textPrimary,
                          lineHeight: 1.4,
                        }}
                      >
                        {resource.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: COLORS.textSecondary,
                          margin: '0 0 1rem 0',
                          lineHeight: 1.5,
                        }}
                      >
                        {resource.description}
                      </p>

                      {/* Concepts */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          {resource.concepts
                            .slice(0, 3)
                            .map((concept, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.75rem',
                                  backgroundColor: '#f3f4f6',
                                  color: COLORS.textMuted,
                                  borderRadius: 20,
                                  fontWeight: 500,
                                }}
                              >
                                {concept}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.875rem',
                          color: COLORS.textMuted,
                          paddingTop: '1rem',
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '1rem',
                          }}
                        >
                          <span>
                            ⏱️ {resource.duration}
                          </span>

                          <span>
                            👁️ {(resource.views / 1000).toFixed(1)}k views
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <span>⭐</span>

                          <span
                            style={{
                              fontWeight: 600,
                              color: COLORS.textPrimary,
                            }}
                          >
                            {resource.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                backgroundColor: '#f9fafb',
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
              }}
            >

              <p
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: 0,
                }}
              >
                No resources found
              </p>

              <p
                style={{
                  fontSize: '0.875rem',
                  color: COLORS.textMuted,
                  margin: '0.5rem 0 0 0',
                }}
              >
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}