'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface DashboardData {
  overall_mastery: number;
  bloom_summary: Record<string, number>;
  concept_progress: Record<string, number>;
  critical_gaps: string[];
  total_study_time: number;
  tasks_today: number;
  tasks_completed: number;
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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Re-render guard to stop infinite call loops
  const fetchedRef = useRef(false);

  // Data states
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // 1. Prevent double runs & infinite loops
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

        // Parallel fetch dashboard, tasks, and notifications
        const [dashboardRes, tasksRes, notifRes] = await Promise.allSettled([
          axios.get(`${API_URL}/analytics`, { headers }),
          axios.get(`${API_URL}/tasks?filter=TODAY`, { headers }),
          axios.get(`${API_URL}/notifications`, { headers }),
        ]);

        // Check if any API failed due to 401 Unauthorized (Expired/Invalid Token)
        const has401 = [dashboardRes, tasksRes, notifRes].some(
          (res) => res.status === 'rejected' && res.reason?.response?.status === 401
        );

        if (has401) {
          localStorage.removeItem('edni_access');
          localStorage.removeItem('edni_refresh');
          router.replace('/login');
          return;
        }

        // Handle dashboard data
        if (dashboardRes.status === 'fulfilled') {
          setDashboard(dashboardRes.value.data);
        } else {
          console.warn('Dashboard fetch failed:', dashboardRes.reason);
          // Set mock data for demo
          setDashboard({
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
              Algorithms: 65,
              OOP: 72,
              Database: 45,
              Networks: 52,
            },
            critical_gaps: ['Database Design', 'System Design', 'Advanced Algorithms'],
            total_study_time: 24.5,
            tasks_today: 5,
            tasks_completed: 3,
          });
        }

        // Handle tasks data
        if (tasksRes.status === 'fulfilled') {
          setTasks(tasksRes.value.data.tasks || []);
        }

        // Handle notifications
        if (notifRes.status === 'fulfilled') {
          setNotifications(notifRes.value.data.notifications || []);
        }

        setError('');
      } catch (err: any) {
        console.error('Failed to fetch dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array to mount once only

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e2e8f0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#94a3b8' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#e2e8f0',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid #334155',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '16px' }}>Error</h2>
          <p style={{ marginBottom: '16px', color: '#cbd5e1' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              padding: '10px',
              borderRadius: '8px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  // Prepare chart data
  const bloomData = Object.entries(dashboard.bloom_summary || {}).map(([level, score]) => ({
    name: level,
    value: score,
  }));

  const conceptData = Object.entries(dashboard.concept_progress || {}).map(([concept, progress]) => ({
    name: concept,
    progress: progress,
  }));

  const masteryColor = dashboard.overall_mastery >= 70 ? '#10b981' : dashboard.overall_mastery >= 50 ? '#f59e0b' : '#ef4444';

  const getDifficultyBadgeStyle = (difficulty: string) => {
    const baseStyle = { fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' as const };
    switch (difficulty) {
      case 'hard':
        return { ...baseStyle, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'medium':
        return { ...baseStyle, backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' };
      default:
        return { ...baseStyle, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' };
    }
  };

  const cardStyle = {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #334155',
    color: '#e2e8f0',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* Top Bar */}
      <div
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #334155',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              style={{
                position: 'relative',
                padding: '8px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
              }}
              title="Notifications"
            >
              🔔
              {notifications.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                  }}
                ></span>
              )}
            </button>
            <button
              onClick={() => router.push('/profile')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
              }}
            >
              👤
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '8px', marginTop: 0 }}>Welcome back! 👋</h2>
          <p style={{ color: '#94a3b8', margin: 0 }}>Here's your academic progress at a glance.</p>
        </div>

        {/* Stat Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          {/* Mastery Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Overall Mastery</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 'bold', color: masteryColor }}>
                    {dashboard.overall_mastery}%
                  </span>
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>+2% this week</span>
                </div>
              </div>
              <div style={{ fontSize: '1.875rem' }}>🎯</div>
            </div>
            <div style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
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

          {/* Study Time Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Study Time</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', margin: 0 }}>
                  {(dashboard.total_study_time ?? 0).toFixed(1)}h
                </p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>This week</p>
              </div>
              <div style={{ fontSize: '1.875rem' }}>⏱️</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>+3.5h from last week</div>
          </div>

          {/* Tasks Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Tasks Today</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', margin: 0 }}>
                  {dashboard.tasks_completed}/{dashboard.tasks_today}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>Completed</p>
              </div>
              <div style={{ fontSize: '1.875rem' }}>✅</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Keep it up!</div>
          </div>

          {/* Critical Gaps Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px', margin: 0 }}>Knowledge Gaps</p>
                <p style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>
                  {dashboard.critical_gaps?.length ?? 0}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>Needs review</p>
              </div>
              <div style={{ fontSize: '1.875rem' }}>🔍</div>
            </div>
            <button
              onClick={() => router.push('/diagnostic')}
              style={{
                fontSize: '0.875rem',
                color: '#6366f1',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                marginTop: '8px',
                textDecoration: 'underline',
              }}
            >
              Review gaps →
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
          {/* Bloom's Taxonomy Chart */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '24px', marginTop: 0 }}>Bloom's Taxonomy Levels</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bloomData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Concept Progress Chart */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '24px', marginTop: 0 }}>Concept Mastery Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conceptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" style={{ fontSize: '11px' }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="progress" fill="#7c3aed" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks and Critical Gaps */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Today's Tasks */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Today's Tasks</h3>
              <button
                onClick={() => router.push('/study-planner')}
                style={{
                  fontSize: '0.875rem',
                  color: '#6366f1',
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
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '8px',
                  }}
                >
                  <input type="checkbox" style={{ marginTop: '4px', accentColor: '#6366f1' }} defaultChecked={task.status === 'completed'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: '500', color: '#e2e8f0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </p>
                  </div>
                  <span style={getDifficultyBadgeStyle(task.difficulty)}>{task.difficulty}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Knowledge Gaps */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Critical Knowledge Gaps</h3>
              <button
                onClick={() => router.push('/learning-resources')}
                style={{
                  fontSize: '0.875rem',
                  color: '#6366f1',
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
              {(dashboard.critical_gaps || []).map((gap, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <p style={{ fontWeight: '500', color: '#e2e8f0', margin: 0 }}>{gap}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Priority: High</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                      Needs Review
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            marginTop: '32px',
            padding: '24px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #10b981 100%)',
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
              onClick={() => router.push('/diagnostic')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#10b981',
                fontWeight: '600',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              📊 Take Assessment
            </button>
            <button
              onClick={() => router.push('/study-planner')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#10b981',
                fontWeight: '600',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              📅 View Study Plan
            </button>
            <button
              onClick={() => router.push('/mentor')}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                color: '#10b981',
                fontWeight: '600',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              🤖 Chat with Mentor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}