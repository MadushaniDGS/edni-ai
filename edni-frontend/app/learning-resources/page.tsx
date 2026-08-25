'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const COLORS = {
  primary: "#6C63FF",
  primaryHover: "#4F46E5",
  secondary: "#A855F7",
  accent: "#EC4899",
  bgDark: "#0F172A",
  bgCard: "#1E293B",
  bgLight: "#F8FAFC",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  borderDark: "#334155",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

interface Resource {
  id: string;
  type: string;
  difficulty: string;
  title: string;
  description: string;
  concept: string;
  learning_area: string;
  bloom_levels: string[];
  external_url: string;
  thumbnail?: string;
  duration_minutes?: number;
  cta_label?: string;
}

interface Module {
  id: string;
  name: string;
  learning_area: string;
}

export default function LearningResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [resources, setResources] = useState<Resource[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Fetch resources and modules on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('edni_access');

        if (!token) {
          router.push('/login');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch resources with filters
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedModule !== 'all') params.append('concept', selectedModule);
        if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
        if (selectedType !== 'all') params.append('type', selectedType);

        const [resourcesRes, modulesRes] = await Promise.allSettled([
          axios.get(`${API_URL}/resources?${params.toString()}`, { headers }),
          axios.get(`${API_URL}/modules`, { headers }),
        ]);

        if (resourcesRes.status === 'fulfilled') {
          setResources(resourcesRes.value.data.resources || []);
        } else {
          console.warn('Resources fetch failed');
          // Mock data for demo
          setResources([
            {
              id: '1',
              type: 'Video',
              difficulty: 'beginner',
              title: 'Introduction to Data Structures',
              description: 'Learn the fundamentals of arrays, linked lists, and stacks.',
              concept: 'Data Structures',
              learning_area: 'CS Fundamentals',
              bloom_levels: ['Remember', 'Understand'],
              external_url: 'https://www.youtube.com/results?search_query=data+structures',
              duration_minutes: 45,
            },
            {
              id: '2',
              type: 'Article',
              difficulty: 'intermediate',
              title: 'Binary Search Trees Deep Dive',
              description: 'Comprehensive guide to BST implementation and traversal.',
              concept: 'Data Structures',
              learning_area: 'CS Fundamentals',
              bloom_levels: ['Understand', 'Apply'],
              external_url: 'https://www.medium.com',
              duration_minutes: 20,
            },
            {
              id: '3',
              type: 'Interactive',
              difficulty: 'advanced',
              title: 'Graph Algorithms Visualizer',
              description: 'Interactive tool to visualize DFS, BFS, Dijkstra, and A*.',
              concept: 'Algorithms',
              learning_area: 'Advanced',
              bloom_levels: ['Apply', 'Analyze'],
              external_url: 'https://visualgo.net',
              duration_minutes: 60,
            },
          ]);
        }

        if (modulesRes.status === 'fulfilled') {
          setModules(modulesRes.value.data.modules || []);
        } else {
          setModules([
            { id: '1', name: 'Data Structures', learning_area: 'CS Fundamentals' },
            { id: '2', name: 'Algorithms', learning_area: 'Advanced' },
            { id: '3', name: 'Database Systems', learning_area: 'Advanced' },
          ]);
        }

        setError('');
      } catch (err) {
        console.error('Failed to fetch resources:', err);
        setError('Failed to load learning resources');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, selectedModule, selectedDifficulty, selectedType, router]);

  const typeIcons: Record<string, string> = {
    Video: '🎥',
    Article: '📄',
    Interactive: '🖱️',
    Tutorial: '🎓',
    Quiz: '📝',
    Podcast: '🎧',
    Course: '📚',
  };

  const difficultyColors: Record<string, { bg: string; color: string; border: string }> = {
    beginner: { bg: 'rgba(34, 197, 94, 0.15)', color: '#86EFAC', border: '#10B981' },
    intermediate: { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '#F59E0B' },
    advanced: { bg: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', border: '#EF4444' },
  };

  const bloomColors: Record<string, string> = {
    Remember: '#4f46e5',
    Understand: '#7c3aed',
    Apply: '#ec4899',
    Analyze: '#f59e0b',
    Evaluate: '#ef4444',
    Create: '#10b981',
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
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${COLORS.borderDark}`,
            borderTop: `3px solid ${COLORS.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: COLORS.textMuted }}>Loading learning resources...</p>
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
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            color: COLORS.textPrimary,
          }}>📖 Learning Resources</h1>
          <p style={{ color: COLORS.textMuted, margin: 0 }}>Personalized materials for your learning gaps</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        {/* Search and Filters */}
        <div style={{
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.borderDark}`,
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: COLORS.textPrimary,
            }}>Search Resources</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, concept, or topic..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                border: `1.5px solid ${COLORS.borderDark}`,
                borderRadius: 10,
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                color: COLORS.textPrimary,
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary}
              onBlur={(e) => e.currentTarget.style.borderColor = COLORS.borderDark}
            />
          </div>

          {/* Filter Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
          }}>
            {/* Module Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: COLORS.textPrimary,
              }}>Learning Area</label>
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `1.5px solid ${COLORS.borderDark}`,
                  borderRadius: 10,
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  color: COLORS.textPrimary,
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Areas</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.name}>
                    {module.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: COLORS.textPrimary,
              }}>Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `1.5px solid ${COLORS.borderDark}`,
                  borderRadius: 10,
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  color: COLORS.textPrimary,
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: COLORS.textPrimary,
              }}>Resource Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: `1.5px solid ${COLORS.borderDark}`,
                  borderRadius: 10,
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  color: COLORS.textPrimary,
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Types</option>
                <option value="Video">Video</option>
                <option value="Article">Article</option>
                <option value="Interactive">Interactive</option>
                <option value="Tutorial">Tutorial</option>
                <option value="Quiz">Quiz</option>
                <option value="Course">Course</option>
              </select>
            </div>
          </div>

          {/* Active filters display */}
          {(searchQuery || selectedModule !== 'all' || selectedDifficulty !== 'all' || selectedType !== 'all') && (
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: `1px solid ${COLORS.borderDark}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              {searchQuery && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(108, 99, 255, 0.15)',
                  color: '#818CF8',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  🔍 {searchQuery}
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedModule !== 'all' && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#93C5FD',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  📚 {selectedModule}
                  <button
                    onClick={() => setSelectedModule('all')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedDifficulty !== 'all' && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#FBBF24',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {selectedDifficulty}
                  <button
                    onClick={() => setSelectedDifficulty('all')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedType !== 'all' && (
                <span style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(236, 72, 153, 0.15)',
                  color: '#F472B6',
                  borderRadius: 6,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  {selectedType}
                  <button
                    onClick={() => setSelectedType('all')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <div style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <p style={{ color: COLORS.textMuted, margin: 0 }}>
            Found <span style={{ fontWeight: 'bold', color: COLORS.textPrimary }}>{resources.length}</span> resources
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedModule('all');
              setSelectedDifficulty('all');
              setSelectedType('all');
            }}
            style={{
              fontSize: '0.875rem',
              color: COLORS.primary,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 600,
            }}
          >
            Clear all filters
          </button>
        </div>

        {/* Resources Grid */}
        {resources.length === 0 ? (
          <div style={{
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.borderDark}`,
            borderRadius: 12,
            padding: '3rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>🔍</p>
            <p style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: COLORS.textPrimary,
            }}>No resources found</p>
            <p style={{
              color: COLORS.textMuted,
              marginBottom: '1.5rem',
            }}>Try adjusting your filters or search query</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedModule('all');
                setSelectedDifficulty('all');
                setSelectedType('all');
              }}
              style={{
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
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}>
            {resources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => window.open(resource.external_url, '_blank')}
                style={{
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.borderDark}`,
                  borderRadius: 12,
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = COLORS.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = COLORS.borderDark;
                }}
              >
                {/* Resource type icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}>
                  <div style={{ fontSize: '1.875rem' }}>
                    {typeIcons[resource.type] || '📄'}
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: difficultyColors[resource.difficulty].bg,
                    color: difficultyColors[resource.difficulty].color,
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>
                    {resource.difficulty}
                  </span>
                </div>

                {/* Title and description */}
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  color: COLORS.textPrimary,
                  transition: 'all 0.2s',
                }}>
                  {resource.title}
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: COLORS.textMuted,
                  marginBottom: '1rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {resource.description}
                </p>

                {/* Metadata */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 4,
                      color: COLORS.textMuted,
                    }}>
                      📚 {resource.learning_area}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 4,
                      color: COLORS.textMuted,
                    }}>
                      🏷️ {resource.concept}
                    </span>
                  </div>

                  {/* Bloom's levels */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.25rem',
                  }}>
                    {resource.bloom_levels?.slice(0, 3).map((level) => (
                      <span
                        key={level}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 4,
                          color: 'white',
                          backgroundColor: bloomColors[level],
                          fontWeight: 600,
                        }}
                      >
                        {level}
                      </span>
                    ))}
                    {resource.bloom_levels?.length > 3 && (
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 4,
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                        color: COLORS.textMuted,
                        fontWeight: 600,
                      }}>
                        +{resource.bloom_levels.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  paddingTop: '1rem',
                  borderTop: `1px solid ${COLORS.borderDark}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: COLORS.textMuted,
                  }}>
                    <span>{resource.type}</span>
                    {resource.duration_minutes && (
                      <>
                        <span>•</span>
                        <span>⏱️ {resource.duration_minutes} min</span>
                      </>
                    )}
                  </div>
                  <span style={{
                    fontSize: '1.125rem',
                    transition: 'all 0.2s',
                  }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommended section */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          backgroundImage: `linear-gradient(to right, rgba(108, 99, 255, 0.1), rgba(168, 85, 247, 0.1))`,
          border: `1px solid rgba(108, 99, 255, 0.2)`,
          borderRadius: 12,
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            marginBottom: '1rem',
            color: COLORS.textPrimary,
            margin: 0,
          }}>💡 Personalized Recommendations</h3>
          <p style={{
            color: COLORS.textPrimary,
            marginBottom: '1rem',
            margin: '0 0 1rem 0',
          }}>
            Based on your diagnostic assessment, we recommend focusing on these critical areas:
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
          }}>
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: 8,
            }}>
              <p style={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: COLORS.textPrimary,
                margin: 0,
              }}>Advanced Algorithms</p>
              <p style={{
                fontSize: '0.75rem',
                color: COLORS.textMuted,
                margin: '0.25rem 0 0 0',
              }}>5 recommended resources</p>
            </div>
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: 8,
            }}>
              <p style={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: COLORS.textPrimary,
                margin: 0,
              }}>System Design</p>
              <p style={{
                fontSize: '0.75rem',
                color: COLORS.textMuted,
                margin: '0.25rem 0 0 0',
              }}>8 recommended resources</p>
            </div>
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              borderRadius: 8,
            }}>
              <p style={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: COLORS.textPrimary,
                margin: 0,
              }}>Database Design</p>
              <p style={{
                fontSize: '0.75rem',
                color: COLORS.textMuted,
                margin: '0.25rem 0 0 0',
              }}>6 recommended resources</p>
            </div>
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
            onClick={() => router.push('/mentor')}
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
            💬 Ask Mentor for Help
          </button>
          <button
            onClick={() => router.push('/study-planner')}
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
            📅 View Study Plan
          </button>
        </div>
      </div>
    </div>
  );
}