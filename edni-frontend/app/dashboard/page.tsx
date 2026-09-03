'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import axios from 'axios';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface DashboardData {
  overall_mastery: number;
  bloom_summary: Record<string, number>;
  concept_progress: Array<{
    concept: string;
    mastery: number;
    severity: number;
    area: string;
  }>;
  critical_gaps: string[];
  total_study_time: number;
  tasks_today: number;
  tasks_completed: number;
  feedback_cycle?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  due_date: string;
  status: string;
}

interface Notification {
  id: string;
  icon: string;
  title: string;
  desc: string;
  time: string;
}

// 5 Learning Areas - Your Actual Areas
const LEARNING_AREAS = [
  {
    id: 'data-structures-algorithms',
    label: 'Data Structures and Algorithms',
    icon: '📊',
    description: 'Arrays, linked lists, sorting, searching, complexity analysis',
    color: '#4F46E5',
  },
  {
    id: 'software-quality-assurance',
    label: 'Software Quality Assurance',
    icon: '✅',
    description: 'Testing, debugging, QA processes, quality metrics',
    color: '#10B981',
  },
  {
    id: 'software-engineering',
    label: 'Software Engineering',
    icon: '🏗️',
    description: 'Design patterns, architecture, development methodologies',
    color: '#F59E0B',
  },
  {
    id: 'database-systems',
    label: 'Database Systems',
    icon: '🗄️',
    description: 'SQL, database design, normalization, queries',
    color: '#8B5CF6',
  },
  {
    id: 'programming-languages',
    label: 'Programming Languages',
    icon: '💻',
    description: 'Syntax, semantics, paradigms, language features',
    color: '#EC4899',
  },
];

interface LearningAreaModalProps {
  isOpen: boolean;
  onSelect: (areaId: string) => void;
}

function LearningAreaSelector({ isOpen, onSelect }: LearningAreaModalProps) {
  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '32px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto' as const,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    },
    header: {
      marginBottom: '24px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '1.875rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '8px',
      marginTop: 0,
    },
    subtitle: {
      color: '#6B7280',
      marginBottom: 0,
      marginTop: 0,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
    },
    card: (color: string) => ({
      padding: '20px',
      borderRadius: '12px',
      border: `2px solid ${color}`,
      backgroundColor: `${color}15`,
      cursor: 'pointer',
      transition: 'all 0.2s',
      ':hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 10px 20px ${color}30`,
      },
    }),
    icon: {
      fontSize: '2.5rem',
      marginBottom: '12px',
      marginTop: 0,
    },
    cardTitle: {
      fontWeight: '600',
      color: '#111827',
      marginBottom: '8px',
      marginTop: 0,
    },
    cardDesc: {
      fontSize: '0.875rem',
      color: '#6B7280',
      marginBottom: 0,
      marginTop: 0,
    },
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <p style={styles.title}>📚 Choose Your Learning Area</p>
          <p style={styles.subtitle}>
            Select an area to focus your personalized study plan on
          </p>
        </div>

        <div style={styles.grid}>
          {LEARNING_AREAS.map((area) => (
            <div
              key={area.id}
              style={styles.card(area.color)}
              onClick={() => onSelect(area.id)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              <div style={styles.icon}>{area.icon}</div>
              <p style={styles.cardTitle}>{area.label}</p>
              <p style={styles.cardDesc}>{area.description}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.875rem', color: '#9CA3AF', textAlign: 'center', marginTop: '24px' }}>
          💡 Tip: You can change this later or take diagnostic without selecting an area
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const fetchedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(
    () => localStorage.getItem('selected_learning_area')
  );

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [backgroundStatus, setBackgroundStatus] = useState<'waiting' | 'complete'>('waiting');

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('edni_access');

        if (!token) {
          router.replace('/login');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [dashboardRes, tasksRes, notifRes] = await Promise.allSettled([
          axios.get(`${API_URL}/analytics`, { headers }),
          axios.get(`${API_URL}/tasks/?column=TODAY`, { headers }),
          axios.get(`${API_URL}/notifications`, { headers }),
        ]);

        if (dashboardRes.status === 'fulfilled') {
          setDashboard(dashboardRes.value.data);
        } else {
          setDashboard({
            overall_mastery: 72,
            bloom_summary: {
              '1': 85,
              '2': 72,
              '3': 65,
              '4': 48,
              '5': 35,
              '6': 28,
            },
            concept_progress: [
              { concept: 'Data Structures', mastery: 88, severity: 0, area: 'DS' },
              { concept: 'Algorithms', mastery: 65, severity: 1, area: 'Algorithms' },
              { concept: 'OOP', mastery: 72, severity: 0, area: 'OOP' },
              { concept: 'Database', mastery: 45, severity: 2, area: 'Database' },
              { concept: 'Networks', mastery: 52, severity: 1, area: 'Networks' },
            ],
            critical_gaps: ['Database Design', 'System Design', 'Advanced Algorithms'],
            total_study_time: 24.5,
            tasks_today: 5,
            tasks_completed: 3,
            feedback_cycle: 0,
          });
        }

        if (tasksRes.status === 'fulfilled') {
          const taskData = tasksRes.value.data;
          setTasks(taskData.today || taskData.tasks || []);
        }

        if (notifRes.status === 'fulfilled') {
          setNotifications(notifRes.value.data || []);
        }

        setError('');
      } catch (err: any) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const diagnosticResults = localStorage.getItem('diagnostic_results');
    if (diagnosticResults) {
      try {
        const results = JSON.parse(diagnosticResults);
        if (results.study_plan_id) {
          setBackgroundStatus('complete');
        } else {
          setBackgroundStatus('waiting');
        }
      } catch (err) {
        console.log('Failed to parse diagnostic results');
      }
    }
  }, []);

  const handleSelectArea = (areaId: string) => {
    setSelectedArea(areaId);
    localStorage.setItem('selected_learning_area', areaId);
    setShowAreaSelector(false);

    // Navigate to diagnostic with selected area
    router.push(`/diagnostic?area=${areaId}`);
  };

  const handleTakeDiagnostic = () => {
    setShowAreaSelector(true);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#374151',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(0,0,0,0.1)',
              borderTopColor: '#4F46E5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ color: '#6B7280' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const bloomData = Object.entries(dashboard.bloom_summary || {})
    .map(([level, score]) => {
      const bloomLabels: Record<string, string> = {
        '1': 'Remember',
        '2': 'Understand',
        '3': 'Apply',
        '4': 'Analyze',
        '5': 'Evaluate',
        '6': 'Create',
      };
      return {
        name: bloomLabels[level] || level,
        value: score,
      };
    })
    .slice(0, 6);

  const conceptData = (dashboard.concept_progress || []).map((item) => ({
    name: item.concept,
    progress: item.mastery,
  }));

  const masteryColor =
    dashboard.overall_mastery >= 70 ? '#10b981' : dashboard.overall_mastery >= 50 ? '#f59e0b' : '#ef4444';

  const getDifficultyBadgeStyle = (difficulty: string) => {
    const baseStyle = { fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' as const };
    switch (difficulty?.toLowerCase()) {
      case 'hard':
        return { ...baseStyle, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'medium':
        return { ...baseStyle, backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' };
      default:
        return { ...baseStyle, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' };
    }
  };

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E5E7EB',
    color: '#374151',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
      <Sidebar />
      <TopBar />

      <div style={{ marginLeft: '240px', paddingTop: '64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
          {/* Welcome Section */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '8px', marginTop: 0, color: '#111827' }}>
              Welcome back! 👋
            </h2>
            <p style={{ color: '#6B7280', margin: 0 }}>Here's your academic progress at a glance.</p>
          </div>

          {/* Background Status Banner */}
          {backgroundStatus === 'waiting' && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid #6366f1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '1.25rem', animation: 'spin 2s linear infinite' }}>⏳</div>
              <div>
                <p style={{ margin: 0, fontWeight: '600', color: '#4F46E5' }}>Study Plan Generating</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
                  Your personalized study plan is being prepared in the background.
                </p>
              </div>
            </div>
          )}

          {backgroundStatus === 'complete' && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '1.25rem' }}>✅</div>
              <div>
                <p style={{ margin: 0, fontWeight: '600', color: '#10b981' }}>Study Plan Ready!</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
                  Your 16-week personalized study plan is now available.{' '}
                  <button
                    onClick={() => router.push('/study-planner')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10b981',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    View it now →
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Stat Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Overall Mastery</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 'bold', color: masteryColor }}>
                      {dashboard.overall_mastery.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#10b981' }}>Cycle {dashboard.feedback_cycle || 0}</span>
                  </div>
                </div>
                <div style={{ fontSize: '1.875rem' }}>🎯</div>
              </div>
              <div style={{ width: '100%', backgroundColor: '#F3F4F6', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '9999px',
                    transition: 'all 0.5s',
                    width: `${dashboard.overall_mastery}%`,
                    backgroundColor: masteryColor,
                  }}
                ></div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Study Time</p>
                  <p style={{ fontSize: '2.25rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                    {(dashboard.total_study_time ?? 0).toFixed(1)}h
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px', marginBottom: 0 }}>This week</p>
                </div>
                <div style={{ fontSize: '1.875rem' }}>⏱️</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981' }}>+3.5h from last week</div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Tasks Today</p>
                  <p style={{ fontSize: '2.25rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                    {dashboard.tasks_completed}/{dashboard.tasks_today}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px', marginBottom: 0 }}>Completed</p>
                </div>
                <div style={{ fontSize: '1.875rem' }}>✅</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Keep it up!</div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Knowledge Gaps</p>
                  <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>
                    {dashboard.critical_gaps?.length ?? 0}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px', marginBottom: 0 }}>Needs review</p>
                </div>
                <div style={{ fontSize: '1.875rem' }}>🔍</div>
              </div>
              <button
                onClick={handleTakeDiagnostic}
                style={{
                  fontSize: '0.875rem',
                  color: '#4F46E5',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  marginTop: '8px',
                  textDecoration: 'underline',
                }}
              >
                Take new assessment →
              </button>
            </div>
          </div>

          {/* Charts Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            <div style={cardStyle}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '24px', marginTop: 0, color: '#111827' }}>
                Bloom's Taxonomy Levels
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bloomData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={cardStyle}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '24px', marginTop: 0, color: '#111827' }}>
                Concept Mastery Progress
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conceptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: '11px' }} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Bar dataKey="progress" fill="#7c3aed" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks and Gaps */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
            }}
          >
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>Today's Tasks</h3>
                <button
                  onClick={() => router.push('/study-planner')}
                  style={{
                    fontSize: '0.875rem',
                    color: '#4F46E5',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  View all →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.length > 0 ? (
                  tasks.slice(0, 5).map((task, idx) => (
                    <div
                      key={task.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '12px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <input
                        type="checkbox"
                        style={{ marginTop: '4px', accentColor: '#4F46E5' }}
                        defaultChecked={task.status === 'completed'}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: '500',
                            color: '#374151',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.title}
                        </p>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: '#6B7280',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.description}
                        </p>
                      </div>
                      <span style={getDifficultyBadgeStyle(task.difficulty)}>{task.difficulty}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6B7280', textAlign: 'center', padding: '20px 0' }}>No tasks today</p>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>Critical Knowledge Gaps</h3>
                <button
                  onClick={() => router.push('/learning-resources')}
                  style={{
                    fontSize: '0.875rem',
                    color: '#4F46E5',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  View resources →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(dashboard.critical_gaps || []).length > 0 ? (
                  (dashboard.critical_gaps || []).map((gap, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ fontWeight: '500', color: '#374151', margin: 0 }}>{gap}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Priority: High</span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                          }}
                        >
                          Needs Review
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#6B7280', textAlign: 'center', padding: '20px 0' }}>No critical gaps identified</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #10b981 100%)',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px', color: '#ffffff', marginTop: 0 }}>
              Ready to improve?
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
              }}
            >
              <button
                onClick={handleTakeDiagnostic}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontWeight: '600',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                📊 Take Assessment
              </button>
              <button
                onClick={() => router.push('/study-planner')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontWeight: '600',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                📅 View Study Plan
              </button>
              <button
                onClick={() => router.push('/mentor')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontWeight: '600',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                🤖 Chat with Mentor
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Area Selector Modal */}
      <LearningAreaSelector isOpen={showAreaSelector} onSelect={handleSelectArea} />

      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}