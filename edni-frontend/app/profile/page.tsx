'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const COLORS = {
  primary: '#6C63FF',
  primaryHover: '#4F46E5',
  secondary: '#A855F7',
  bg: '#F7F8FC',
  card: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  institution: string;
  degree: string;
  year_of_study: string;
  gpa: number;
  semester: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

interface Stats {
  total_study_hours: number;
  concepts_mastered: number;
  current_streak: number;
  overall_mastery: number;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activeTab, setActiveTab] = useState<'profile' | 'stats'>(
    'profile'
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    institution: '',
    degree: '',
    year_of_study: '',
    gpa: 0,
    semester: '',
  });

  // ─────────────────────────────────────────────
  // Fetch profile + statistics
  // ─────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem('edni_access');

    if (!token) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      await Promise.all([
        fetchProfile(token),
        fetchStats(token),
      ]);

      setLoading(false);
    };

    loadData();
  }, [router]);

  // ─────────────────────────────────────────────
  // GET PROFILE
  // ─────────────────────────────────────────────

  const fetchProfile = async (token?: string) => {
    try {
      const accessToken =
        token || localStorage.getItem('edni_access');

      if (!accessToken) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${API_URL}/user/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const user = response.data;

      setProfile(user);

      setFormData({
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        institution: user.institution ?? '',
        degree: user.degree ?? '',
        year_of_study: user.year_of_study ?? '',
        gpa: Number(user.gpa ?? 0),
        semester: user.semester ?? '',
      });

      setError('');
    } catch (err) {
      console.error('Failed to fetch profile:', err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem('edni_access');
          localStorage.removeItem('edni_refresh');
          localStorage.removeItem('edni_user');

          router.push('/login');
          return;
        }

        setError(
          err.response?.data?.detail ||
          'Failed to load your profile.'
        );
      } else {
        setError('Failed to load your profile.');
      }
    }
  };

  // ─────────────────────────────────────────────
  // GET ANALYTICS
  // ─────────────────────────────────────────────

  const fetchStats = async (token?: string) => {
    try {
      const accessToken =
        token || localStorage.getItem('edni_access');

      if (!accessToken) return;

      const response = await axios.get(
        `${API_URL}/analytics`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = response.data;

      setStats({
        total_study_hours: Number(
          data.total_study_hours ?? 0
        ),
        concepts_mastered: Number(
          data.concepts_mastered ?? 0
        ),
        current_streak: Number(
          data.current_streak ?? 0
        ),
        overall_mastery: Number(
          data.overall_mastery ?? 0
        ),
      });
    } catch (err) {
      console.error('Failed to fetch statistics:', err);

      // No mock data.
      // If the API fails, simply show zero values.
      setStats({
        total_study_hours: 0,
        concepts_mastered: 0,
        current_streak: 0,
        overall_mastery: 0,
      });
    }
  };

  // ─────────────────────────────────────────────
  // INPUT HANDLER
  // ─────────────────────────────────────────────

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'gpa'
          ? value === ''
            ? 0
            : parseFloat(value)
          : value,
    }));
  };

  // ─────────────────────────────────────────────
  // UPDATE PROFILE
  // ─────────────────────────────────────────────

  const handleUpdateProfile = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('edni_access');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.put(
        `${API_URL}/user/auth/me`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Use returned API data if available.
      if (response.data) {
        setProfile(response.data);

        setFormData({
          first_name: response.data.first_name ?? formData.first_name,
          last_name: response.data.last_name ?? formData.last_name,
          institution:
            response.data.institution ?? formData.institution,
          degree:
            response.data.degree ?? formData.degree,
          year_of_study:
            response.data.year_of_study ??
            formData.year_of_study,
          gpa:
            Number(response.data.gpa ?? formData.gpa),
          semester:
            response.data.semester ?? formData.semester,
        });
      } else {
        await fetchProfile(token);
      }

      setSuccess('Profile updated successfully.');

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem('edni_access');
          localStorage.removeItem('edni_refresh');
          localStorage.removeItem('edni_user');

          router.push('/login');
          return;
        }

        setError(
          err.response?.data?.detail ||
          'Failed to update profile. Please try again.'
        );
      } else {
        setError(
          'Failed to update profile. Please try again.'
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  // ─────────────────────────────────────────────
  // RESET FORM
  // ─────────────────────────────────────────────

  const handleReset = () => {
    if (!profile) return;

    setFormData({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      institution: profile.institution ?? '',
      degree: profile.degree ?? '',
      year_of_study: profile.year_of_study ?? '',
      gpa: Number(profile.gpa ?? 0),
      semester: profile.semester ?? '',
    });

    setError('');
    setSuccess('');
  };

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: COLORS.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              border: `3px solid ${COLORS.border}`,
              borderTopColor: COLORS.primary,
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }}
          />

          <p
            style={{
              margin: 0,
              color: COLORS.textSecondary,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Loading your profile...
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

  // ─────────────────────────────────────────────
  // PROFILE HELPERS
  // ─────────────────────────────────────────────

  const fullName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
    'Student';

  const initials =
    `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() ||
    'S';

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    )
    : '—';

  const mastery = Math.min(
    100,
    Math.max(0, stats?.overall_mastery ?? 0)
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ─────────────────────────────────────── */}
      {/* GLOBAL SIDEBAR */}
      {/* ─────────────────────────────────────── */}

      <Sidebar />

      {/* ─────────────────────────────────────── */}
      {/* MAIN AREA */}
      {/* ─────────────────────────────────────── */}

      <div
        style={{
          marginLeft: 240,
          minHeight: '100vh',
        }}
      >
        <TopBar title="Profile" />

        {/* ───────────────────────────────────── */}
        {/* PROFILE HERO */}
        {/* ───────────────────────────────────── */}

        <section
          style={{
            background:
              'linear-gradient(135deg, #6C63FF 0%, #4F46E5 55%, #7C3AED 100%)',
            padding: '38px 40px',
            color: 'white',
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 30,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
              }}
            >
              {/* Avatar */}

              <div
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  border:
                    '3px solid rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                  fontWeight: 800,
                  flexShrink: 0,
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={fullName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.8,
                    marginBottom: 5,
                    fontWeight: 600,
                  }}
                >
                  EDNI AI STUDENT PROFILE
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {fullName}
                </h1>

                <p
                  style={{
                    margin: '7px 0 0',
                    fontSize: 14,
                    opacity: 0.9,
                  }}
                >
                  {profile?.email}
                </p>
              </div>
            </div>

            {/* Mastery */}

            <div
              style={{
                minWidth: 190,
                padding: '18px 22px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.13)',
                border:
                  '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  opacity: 0.8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 7,
                }}
              >
                Overall Mastery
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                }}
              >
                {mastery}%
              </div>

              <div
                style={{
                  height: 5,
                  background:
                    'rgba(255,255,255,0.2)',
                  borderRadius: 5,
                  overflow: 'hidden',
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${mastery}%`,
                    background: 'white',
                    borderRadius: 5,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────── */}
        {/* CONTENT */}
        {/* ───────────────────────────────────── */}

        <main
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '30px 40px 50px',
          }}
        >
          {/* Alerts */}

          {error && (
            <div
              style={{
                padding: '13px 16px',
                marginBottom: 20,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 10,
                color: '#991B1B',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '13px 16px',
                marginBottom: 20,
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 10,
                color: '#047857',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ✓ {success}
            </div>
          )}

          {/* Tabs */}

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <button
              onClick={() => setActiveTab('profile')}
              style={{
                padding: '13px 20px',
                border: 'none',
                borderBottom:
                  activeTab === 'profile'
                    ? `3px solid ${COLORS.primary}`
                    : '3px solid transparent',
                background: 'transparent',
                color:
                  activeTab === 'profile'
                    ? COLORS.primary
                    : COLORS.textSecondary,
                fontSize: 14,
                fontWeight:
                  activeTab === 'profile' ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              👤 Personal Information
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              style={{
                padding: '13px 20px',
                border: 'none',
                borderBottom:
                  activeTab === 'stats'
                    ? `3px solid ${COLORS.primary}`
                    : '3px solid transparent',
                background: 'transparent',
                color:
                  activeTab === 'stats'
                    ? COLORS.primary
                    : COLORS.textSecondary,
                fontSize: 14,
                fontWeight:
                  activeTab === 'stats' ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              📊 Learning Statistics
            </button>
          </div>

          {/* ─────────────────────────────────── */}
          {/* PROFILE TAB */}
          {/* ─────────────────────────────────── */}

          {activeTab === 'profile' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 1fr) 300px',
                gap: 24,
              }}
            >
              {/* Personal Information */}

              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: 28,
                  boxShadow:
                    '0 2px 8px rgba(15,23,42,0.04)',
                }}
              >
                <div style={{ marginBottom: 25 }}>
                  <h2
                    style={{
                      margin: 0,
                      color: COLORS.textPrimary,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    Personal Information
                  </h2>

                  <p
                    style={{
                      margin: '6px 0 0',
                      color: COLORS.textSecondary,
                      fontSize: 13,
                    }}
                  >
                    Keep your academic information up to
                    date for a better personalized learning
                    experience.
                  </p>
                </div>

                <form onSubmit={handleUpdateProfile}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: 18,
                    }}
                  >
                    {/* First Name */}

                    <FormField label="First Name">
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        style={inputStyle}
                        required
                      />
                    </FormField>

                    {/* Last Name */}

                    <FormField label="Last Name">
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        style={inputStyle}
                        required
                      />
                    </FormField>

                    {/* Email */}

                    <FormField label="Email Address">
                      <input
                        type="email"
                        value={profile?.email || ''}
                        readOnly
                        style={{
                          ...inputStyle,
                          background: '#F8FAFC',
                          color: COLORS.textMuted,
                          cursor: 'not-allowed',
                        }}
                      />
                    </FormField>

                    {/* Institution */}

                    <FormField label="Institution">
                      <input
                        type="text"
                        name="institution"
                        value={formData.institution}
                        onChange={handleInputChange}
                        style={inputStyle}
                      />
                    </FormField>

                    {/* Degree */}

                    <FormField label="Degree">
                      <input
                        type="text"
                        name="degree"
                        value={formData.degree}
                        onChange={handleInputChange}
                        style={inputStyle}
                      />
                    </FormField>

                    {/* Year */}

                    <FormField label="Year of Study">
                      <select
                        name="year_of_study"
                        value={formData.year_of_study}
                        onChange={handleInputChange}
                        style={inputStyle}
                      >
                        <option value="">
                          Select year
                        </option>
                        <option value="Year 1">
                          Year 1
                        </option>
                        <option value="Year 2">
                          Year 2
                        </option>
                        <option value="Year 3">
                          Year 3
                        </option>
                        <option value="Final Year">
                          Final Year
                        </option>
                        <option value="Post-Grad">
                          Post-Grad
                        </option>
                      </select>
                    </FormField>

                    {/* GPA */}

                    <FormField label="GPA">
                      <input
                        type="number"
                        name="gpa"
                        value={formData.gpa}
                        onChange={handleInputChange}
                        min="0"
                        max="4"
                        step="0.1"
                        style={inputStyle}
                      />
                    </FormField>

                    {/* Semester */}

                    <FormField label="Current Semester">
                      <input
                        type="text"
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                        style={inputStyle}
                        placeholder="e.g. Semester 1"
                      />
                    </FormField>
                  </div>

                  {/* Buttons */}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 12,
                      marginTop: 28,
                      paddingTop: 22,
                      borderTop: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleReset}
                      style={{
                        padding: '11px 20px',
                        borderRadius: 9,
                        border: `1px solid ${COLORS.border}`,
                        background: 'white',
                        color: COLORS.textSecondary,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      Reset
                    </button>

                    <button
                      type="submit"
                      disabled={updating}
                      style={{
                        padding: '11px 24px',
                        borderRadius: 9,
                        border: 'none',
                        background:
                          'linear-gradient(135deg,#6C63FF,#4F46E5)',
                        color: 'white',
                        fontWeight: 700,
                        cursor: updating
                          ? 'not-allowed'
                          : 'pointer',
                        opacity: updating ? 0.7 : 1,
                        fontSize: 14,
                        boxShadow:
                          '0 4px 12px rgba(108,99,255,0.25)',
                      }}
                    >
                      {updating
                        ? 'Saving...'
                        : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Academic Summary */}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                <InfoCard
                  title="Academic Summary"
                  icon="🎓"
                >
                  <InfoRow
                    label="Institution"
                    value={
                      profile?.institution || 'Not provided'
                    }
                  />

                  <InfoRow
                    label="Degree"
                    value={
                      profile?.degree || 'Not provided'
                    }
                  />

                  <InfoRow
                    label="Year"
                    value={
                      profile?.year_of_study ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    label="Semester"
                    value={
                      profile?.semester || 'Not provided'
                    }
                  />

                  <InfoRow
                    label="GPA"
                    value={
                      profile?.gpa !== undefined
                        ? profile.gpa.toFixed(1)
                        : '—'
                    }
                  />
                </InfoCard>

                <InfoCard
                  title="Account Information"
                  icon="🔐"
                >
                  <InfoRow
                    label="Member Since"
                    value={joinedDate}
                  />

                  <InfoRow
                    label="Account Status"
                    value="Active"
                    valueColor={COLORS.success}
                  />
                </InfoCard>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────── */}
          {/* STATS TAB */}
          {/* ─────────────────────────────────── */}

          {activeTab === 'stats' && (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(4, minmax(0, 1fr))',
                  gap: 18,
                  marginBottom: 24,
                }}
              >
                <StatCard
                  icon="⏱️"
                  label="Study Hours"
                  value={`${stats?.total_study_hours ?? 0}h`}
                  description="Total learning time"
                  color={COLORS.primary}
                />

                <StatCard
                  icon="🎯"
                  label="Concepts Mastered"
                  value={`${stats?.concepts_mastered ?? 0}`}
                  description="Successfully mastered"
                  color={COLORS.secondary}
                />

                <StatCard
                  icon="🔥"
                  label="Current Streak"
                  value={`${stats?.current_streak ?? 0}d`}
                  description="Keep your momentum"
                  color={COLORS.success}
                />

                <StatCard
                  icon="📈"
                  label="Overall Mastery"
                  value={`${mastery}%`}
                  description="Average mastery score"
                  color={COLORS.primary}
                />
              </div>

              {/* Mastery Card */}

              <div
                style={{
                  background: 'white',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: 28,
                  boxShadow:
                    '0 2px 8px rgba(15,23,42,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 800,
                        color: COLORS.textPrimary,
                      }}
                    >
                      Learning Progress
                    </h2>

                    <p
                      style={{
                        margin: '5px 0 0',
                        color: COLORS.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      Your current overall mastery
                    </p>
                  </div>

                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: COLORS.primary,
                    }}
                  >
                    {mastery}%
                  </span>
                </div>

                <div
                  style={{
                    height: 12,
                    background: '#EEF2F7',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${mastery}%`,
                      background:
                        'linear-gradient(90deg,#6C63FF,#A855F7)',
                      borderRadius: 10,
                      transition:
                        'width 0.5s ease',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    marginTop: 9,
                    fontSize: 12,
                    color: COLORS.textMuted,
                  }}
                >
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Responsive styles */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: #6C63FF !important;
          box-shadow: 0 0 0 3px rgba(108,99,255,0.10);
        }

        button {
          font-family: inherit;
        }

        @media (max-width: 1000px) {
          main {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }

        @media (max-width: 800px) {
          main {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          section > div {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          section > div > div:last-child {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Reusable Form Field */
/* ───────────────────────────────────────────── */

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: 7,
          fontSize: 13,
          fontWeight: 700,
          color: COLORS.textPrimary,
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Input Style */
/* ───────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 13px',
  border: `1px solid ${COLORS.border}`,
  borderRadius: 9,
  background: '#FFFFFF',
  color: COLORS.textPrimary,
  fontSize: 14,
  fontFamily: 'inherit',
  transition: 'all 0.2s',
};

/* ───────────────────────────────────────────── */
/* Info Card */
/* ───────────────────────────────────────────── */

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow:
          '0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <h3
        style={{
          margin: '0 0 18px',
          fontSize: 15,
          fontWeight: 800,
          color: COLORS.textPrimary,
        }}
      >
        {icon} {title}
      </h3>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Info Row */
/* ───────────────────────────────────────────── */

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        paddingBottom: 12,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: COLORS.textMuted,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: 13,
          color: valueColor || COLORS.textPrimary,
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Stat Card */
/* ───────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  description,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow:
          '0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          marginBottom: 14,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 27,
          fontWeight: 800,
          color,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: COLORS.textSecondary,
        }}
      >
        {description}
      </div>
    </div>
  );
}