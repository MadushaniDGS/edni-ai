'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
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

const LEARNING_AREAS = [
  {
    id: 'data-structures-algorithms',
    label: 'Data Structures and Algorithms',
    icon: '📊',
    color: '#6366F1',
  },
  {
    id: 'software-quality-assurance',
    label: 'Software Quality Assurance',
    icon: '✅',
    color: '#10B981',
  },
  {
    id: 'software-engineering',
    label: 'Software Engineering',
    icon: '🏗️',
    color: '#F59E0B',
  },
  {
    id: 'database-systems',
    label: 'Database Systems',
    icon: '🗄️',
    color: '#8B5CF6',
  },
  {
    id: 'programming-languages',
    label: 'Programming Languages',
    icon: '💻',
    color: '#EC4899',
  },
];

interface LearningAreaModalProps {
  isOpen: boolean;
  onSelect: (areaId: string) => void;
}

function LearningAreaSelector({ isOpen, onSelect }: LearningAreaModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '700px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
        }}
      >
        <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '12px', marginTop: 0, color: '#1F2937' }}>
          Select Learning Area
        </h2>
        <p style={{ color: '#6B7280', marginBottom: '32px', marginTop: 0, fontSize: '15px' }}>
          Choose an area to focus your personalized study plan
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
          }}
        >
          {LEARNING_AREAS.map((area) => (
            <button
              key={area.id}
              onClick={() => onSelect(area.id)}
              style={{
                padding: '20px 16px',
                borderRadius: '12px',
                border: `2px solid ${area.color}`,
                backgroundColor: `${area.color}08`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.backgroundColor = `${area.color}15`;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = `0 8px 20px ${area.color}20`;
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.backgroundColor = `${area.color}08`;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{area.icon}</div>
              <p style={{ fontWeight: '500', color: area.color, margin: 0, fontSize: '14px' }}>
                {area.label.split(' ').slice(0, 2).join(' ')}
              </p>
            </button>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', marginTop: '28px', marginBottom: 0 }}>
          💡 You can change this later anytime
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

        const [dashboardRes, tasksRes] = await Promise.allSettled([
          axios.get(`${API_URL}/analytics`, { headers }),
          axios.get(`${API_URL}/tasks/?column=TODAY`, { headers }),
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
          backgroundColor: '#FAFBFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #E5E7EB',
              borderTopColor: '#6366F1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <p style={{ color: '#6B7280', fontSize: '15px' }}>Loading your dashboard...</p>
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
    dashboard.overall_mastery >= 70 ? '#10B981' : dashboard.overall_mastery >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFBFC', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Sidebar />
      <TopBar />

      <div style={{ marginLeft: '240px', paddingTop: '64px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 32px' }}>
          {/* Header */}
          <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', marginTop: 0, color: '#111827' }}>
                Learning Dashboard
              </h1>
              <p style={{ color: '#6B7280', margin: 0, fontSize: '15px' }}>
                Track your progress and identify learning opportunities
              </p>
            </div>
            <button
              onClick={handleTakeDiagnostic}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366F1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4F46E5';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6366F1';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              New Assessment
            </button>
          </div>

          {/* Status Banner */}
          {backgroundStatus === 'complete' && (
            <div
              style={{
                marginBottom: '32px',
                padding: '16px 20px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #D1FAE5',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>✓</span>
              <div>
                <p style={{ margin: 0, fontWeight: '600', color: '#047857', fontSize: '14px' }}>Study Plan Ready</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                  Your 16-week personalized plan is available.{' '}
                  <button
                    onClick={() => router.push('/study-planner')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#047857',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '13px',
                    }}
                  >
                    View now →
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            {/* Overall Mastery */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Overall Mastery</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '700', color: masteryColor }}>
                      {dashboard.overall_mastery.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>Cycle {dashboard.feedback_cycle || 0}</span>
                  </div>
                </div>
                <div style={{ fontSize: '28px' }}>🎯</div>
              </div>
              <div style={{ width: '100%', backgroundColor: '#F3F4F6', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: masteryColor,
                    transition: 'width 0.5s ease',
                    width: `${dashboard.overall_mastery}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Study Time */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Study Time</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#111827' }}>
                    {(dashboard.total_study_time ?? 0).toFixed(1)}h
                  </p>
                  <p style={{ fontSize: '12px', color: '#10B981', marginTop: '8px', marginBottom: 0 }}>This week</p>
                </div>
                <div style={{ fontSize: '28px' }}>⏱️</div>
              </div>
            </div>

            {/* Tasks Progress */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Tasks Completed</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#111827' }}>
                    {dashboard.tasks_completed}/{dashboard.tasks_today}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', marginBottom: 0 }}>Today</p>
                </div>
                <div style={{ fontSize: '28px' }}>✓</div>
              </div>
            </div>

            {/* Knowledge Gaps */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Knowledge Gaps</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: '#EF4444', margin: 0 }}>
                    {dashboard.critical_gaps?.length ?? 0}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', marginBottom: 0 }}>Areas to review</p>
                </div>
                <div style={{ fontSize: '28px' }}>!</div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '24px',
              marginBottom: '40px',
            }}
          >
            {/* Bloom's Taxonomy */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', marginTop: 0, color: '#111827' }}>
                Learning Levels
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bloomData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ color: '#374151', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Concept Progress */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '24px', marginTop: 0, color: '#111827' }}>
                Concept Mastery
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={conceptData} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={true} />
                  <XAxis type="number" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ color: '#374151', fontSize: '12px' }}
                  />
                  <Bar dataKey="progress" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks & Gaps Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '24px',
              marginBottom: '40px',
            }}
          >
            {/* Today's Tasks */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#111827' }}>Today's Tasks</h3>
                <button
                  onClick={() => router.push('/study-planner')}
                  style={{
                    fontSize: '13px',
                    color: '#6366F1',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  View all →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.length > 0 ? (
                  tasks.slice(0, 4).map((task, idx) => {
                    const diffColor =
                      task.difficulty?.toLowerCase() === 'hard'
                        ? '#EF4444'
                        : task.difficulty?.toLowerCase() === 'medium'
                          ? '#F59E0B'
                          : '#10B981';
                    return (
                      <div
                        key={task.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '10px',
                          border: '1px solid #E5E7EB',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F3F4F6';
                          (e.currentTarget as HTMLDivElement).style.borderColor = '#D1D5DB';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F9FAFB';
                          (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB';
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            accentColor: '#6366F1',
                            cursor: 'pointer',
                            width: '18px',
                            height: '18px',
                          }}
                          defaultChecked={task.status === 'completed'}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontWeight: '500',
                              color: '#374151',
                              margin: 0,
                              fontSize: '14px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {task.title}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: `${diffColor}15`,
                            color: diffColor,
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.difficulty}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '24px 0', margin: 0, fontSize: '14px' }}>
                    No tasks today
                  </p>
                )}
              </div>
            </div>

            {/* Critical Gaps */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#111827' }}>Knowledge Gaps</h3>
                <button
                  onClick={() => router.push('/learning-resources')}
                  style={{
                    fontSize: '13px',
                    color: '#6366F1',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  View resources →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(dashboard.critical_gaps || []).length > 0 ? (
                  (dashboard.critical_gaps || []).slice(0, 4).map((gap, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FEE2E2',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FDE8E8';
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#FCA5A5';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FEF2F2';
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#FEE2E2';
                      }}
                    >
                      <p style={{ fontWeight: '500', color: '#DC2626', margin: 0, fontSize: '14px' }}>{gap}</p>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#DC2626',
                          marginTop: '6px',
                          display: 'inline-block',
                          opacity: 0.7,
                        }}
                      >
                        Priority: High
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '24px 0', margin: 0, fontSize: '14px' }}>
                    No critical gaps identified
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <LearningAreaSelector isOpen={showAreaSelector} onSelect={handleSelectArea} />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}