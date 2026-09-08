'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const COLORS = {
  primary: '#7C6FF6',
  primaryDark: '#6558E8',
  lavender: '#A78BFA',
  pink: '#F9A8D4',
  peach: '#FDBA8C',
  yellow: '#FDE68A',
  mint: '#A7F3D0',
  blue: '#BAE6FD',
  bg: '#FAF9FF',
  card: '#FFFFFF',
  textPrimary: '#29243A',
  textSecondary: '#77718A',
  textMuted: '#A6A1B2',
  border: '#EEEAF7',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
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
  // FETCH PROFILE + STATISTICS
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

      if (response.data) {
        setProfile(response.data);

        setFormData({
          first_name:
            response.data.first_name ??
            formData.first_name,

          last_name:
            response.data.last_name ??
            formData.last_name,

          institution:
            response.data.institution ??
            formData.institution,

          degree:
            response.data.degree ??
            formData.degree,

          year_of_study:
            response.data.year_of_study ??
            formData.year_of_study,

          gpa: Number(
            response.data.gpa ?? formData.gpa
          ),

          semester:
            response.data.semester ??
            formData.semester,
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
  // RESET
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
      <div className="loading-page">
        <div className="loading-sticker">🌸</div>

        <div className="loading-spinner" />

        <h3>Preparing your little space...</h3>

        <p>Loading your profile ✨</p>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 20% 20%,
                #ede9fe 0,
                transparent 30%
              ),
              radial-gradient(
                circle at 80% 80%,
                #fce7f3 0,
                transparent 30%
              ),
              ${COLORS.bg};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family:
              Inter,
              -apple-system,
              BlinkMacSystemFont,
              'Segoe UI',
              sans-serif;
          }

          .loading-sticker {
            font-size: 48px;
            margin-bottom: 18px;
            animation: float 2s ease-in-out infinite;
          }

          .loading-spinner {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            border: 4px solid #ebe7fb;
            border-top-color: ${COLORS.primary};
            animation: spin 0.9s linear infinite;
          }

          h3 {
            margin: 18px 0 4px;
            color: ${COLORS.textPrimary};
          }

          p {
            margin: 0;
            color: ${COLORS.textSecondary};
            font-size: 14px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-8px);
            }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  const fullName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''
      }`.trim() || 'Student';

  const initials =
    `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''
      }`.toUpperCase() || 'S';

  const joinedDate = profile?.created_at
    ? new Date(
      profile.created_at
    ).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '—';

  const mastery = Math.min(
    100,
    Math.max(
      0,
      Number(stats?.overall_mastery ?? 0)
    )
  );

  return (
    <div className="page">

      <Sidebar />

      <div className="main">

        <TopBar title="Profile" />

        {/* FLOATING DECORATIONS */}

        <div className="floating-decoration flower">
          🌸
        </div>

        <div className="floating-decoration star">
          ✨
        </div>

        <div className="floating-decoration heart">
          💗
        </div>

        {/* HERO */}

        <section className="hero">

          <div className="hero-cloud cloud-one" />
          <div className="hero-cloud cloud-two" />

          <div className="hero-inner">

            <div className="profile-left">

              <div className="avatar-wrapper">

                <div className="avatar-ring">

                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={fullName}
                      className="avatar-image"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}

                </div>

                <div className="avatar-sticker">
                  ✨
                </div>

              </div>

              <div className="hero-info">

                <div className="cute-label">
                  🌷 EDNI AI STUDENT
                </div>

                <h1>{fullName}</h1>

                <p>{profile?.email}</p>

                <div className="student-pill">
                  🎓 Learning with EDNI
                </div>

              </div>

            </div>

            {/* MASTERY */}

            <div className="mastery-box">

              <div className="mastery-emoji">
                🐰
              </div>

              <div>

                <span className="mastery-label">
                  Overall Mastery
                </span>

                <strong>
                  {mastery.toFixed(1)}%
                </strong>

              </div>

              <div className="mastery-progress">
                <div
                  style={{
                    width: `${mastery}%`,
                  }}
                />
              </div>

              <small>
                Keep learning! 🌟
              </small>

            </div>

          </div>
        </section>

        <main className="content">

          {/* ALERTS */}

          {error && (
            <div className="alert error-alert">
              <span>😿</span>
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="alert success-alert">
              <span>🎉</span>
              <div>{success}</div>
            </div>
          )}

          {/* TABS */}

          <div className="tabs">

            <button
              className={
                activeTab === 'profile'
                  ? 'tab active'
                  : 'tab'
              }
              onClick={() =>
                setActiveTab('profile')
              }
            >
              <span>👤</span>
              Personal Space
            </button>

            <button
              className={
                activeTab === 'stats'
                  ? 'tab active'
                  : 'tab'
              }
              onClick={() =>
                setActiveTab('stats')
              }
            >
              <span>🌟</span>
              Learning Journey
            </button>

          </div>

          {/* PROFILE */}

          {activeTab === 'profile' && (
            <div className="profile-grid">

              {/* FORM */}

              <div className="cute-card">

                <div className="card-heading">

                  <div className="heading-icon">
                    🌷
                  </div>

                  <div>
                    <h2>
                      Personal Information
                    </h2>

                    <p>
                      Tell EDNI a little more about
                      your academic journey 💕
                    </p>
                  </div>

                </div>

                <form
                  onSubmit={
                    handleUpdateProfile
                  }
                >

                  <div className="form-grid">

                    <FormField label="First Name">
                      <input
                        type="text"
                        name="first_name"
                        value={
                          formData.first_name
                        }
                        onChange={
                          handleInputChange
                        }
                        style={inputStyle}
                        required
                      />
                    </FormField>

                    <FormField label="Last Name">
                      <input
                        type="text"
                        name="last_name"
                        value={
                          formData.last_name
                        }
                        onChange={
                          handleInputChange
                        }
                        style={inputStyle}
                        required
                      />
                    </FormField>

                    <FormField label="Email Address">
                      <div className="locked-input">
                        <input
                          type="email"
                          value={
                            profile?.email || ''
                          }
                          readOnly
                          style={{
                            ...inputStyle,
                            background:
                              '#F8F7FC',
                            color:
                              COLORS.textMuted,
                            cursor:
                              'not-allowed',
                          }}
                        />

                        <span>🔒</span>
                      </div>
                    </FormField>

                    <FormField label="Institution">
                      <input
                        type="text"
                        name="institution"
                        value={
                          formData.institution
                        }
                        onChange={
                          handleInputChange
                        }
                        style={inputStyle}
                      />
                    </FormField>

                    <FormField label="Degree">
                      <input
                        type="text"
                        name="degree"
                        value={
                          formData.degree
                        }
                        onChange={
                          handleInputChange
                        }
                        style={inputStyle}
                      />
                    </FormField>

                    <FormField label="Year of Study">
                      <select
                        name="year_of_study"
                        value={
                          formData.year_of_study
                        }
                        onChange={
                          handleInputChange
                        }
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

                    <FormField label="GPA">
                      <input
                        type="number"
                        name="gpa"
                        value={
                          formData.gpa
                        }
                        onChange={
                          handleInputChange
                        }
                        min="0"
                        max="4"
                        step="0.1"
                        style={inputStyle}
                      />
                    </FormField>

                    <FormField label="Current Semester">
                      <input
                        type="text"
                        name="semester"
                        value={
                          formData.semester
                        }
                        onChange={
                          handleInputChange
                        }
                        style={inputStyle}
                        placeholder="e.g. Semester 1"
                      />
                    </FormField>

                  </div>

                  <div className="form-actions">

                    <button
                      type="button"
                      onClick={
                        handleReset
                      }
                      className="reset-button"
                    >
                      ↩ Reset
                    </button>

                    <button
                      type="submit"
                      disabled={updating}
                      className="save-button"
                    >
                      {updating
                        ? '💫 Saving...'
                        : '✨ Save Changes'}
                    </button>

                  </div>

                </form>
              </div>

              {/* RIGHT SIDE */}

              <div className="side-column">

                <InfoCard
                  title="Academic Summary"
                  icon="🎓"
                >

                  <InfoRow
                    label="Institution"
                    value={
                      profile?.institution ||
                      'Not provided'
                    }
                  />

                  <InfoRow
                    label="Degree"
                    value={
                      profile?.degree ||
                      'Not provided'
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
                      profile?.semester ||
                      'Not provided'
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
                    valueColor={
                      COLORS.success
                    }
                  />

                  <div className="happy-note">
                    <span>🐻</span>

                    <div>
                      <strong>
                        You're doing great!
                      </strong>

                      <small>
                        Keep growing one concept
                        at a time 🌱
                      </small>
                    </div>
                  </div>

                </InfoCard>

              </div>

            </div>
          )}

          {/* STATS */}

          {activeTab === 'stats' && (
            <div>

              <div className="stats-grid">

                <StatCard
                  icon="⏰"
                  label="Study Hours"
                  value={`${stats?.total_study_hours ?? 0}h`}
                  description="Total learning time"
                  color={COLORS.primary}
                  sticker="🌸"
                />

                <StatCard
                  icon="🎯"
                  label="Concepts Mastered"
                  value={`${stats?.concepts_mastered ?? 0}`}
                  description="Successfully mastered"
                  color={COLORS.primary}
                  sticker="⭐"
                />

                <StatCard
                  icon="🔥"
                  label="Current Streak"
                  value={`${stats?.current_streak ?? 0}d`}
                  description="Keep your momentum"
                  color={COLORS.success}
                  sticker="🐰"
                />

                <StatCard
                  icon="📈"
                  label="Overall Mastery"
                  value={`${mastery.toFixed(1)}%`}
                  description="Average mastery score"
                  color={COLORS.primary}
                  sticker="💜"
                />

              </div>

              {/* PROGRESS */}

              <div className="progress-card">

                <div className="progress-top">

                  <div>

                    <div className="little-badge">
                      🌱 YOUR JOURNEY
                    </div>

                    <h2>
                      Learning Progress
                    </h2>

                    <p>
                      Every small step counts.
                      Keep going! ✨
                    </p>

                  </div>

                  <div className="big-mastery">
                    {mastery.toFixed(1)}%
                  </div>

                </div>

                <div className="large-progress">

                  <div
                    style={{
                      width: `${mastery}%`,
                    }}
                  />

                </div>

                <div className="progress-labels">
                  <span>🌱 Starting</span>
                  <span>🌸 Growing</span>
                  <span>🌟 Mastered</span>
                </div>

                <div className="motivation-box">
                  <div className="motivation-character">
                    🐻
                  </div>

                  <div>
                    <strong>
                      You're on your way! 💕
                    </strong>

                    <p>
                      Keep studying consistently
                      and your mastery will grow.
                    </p>
                  </div>

                  <div className="mini-stars">
                    ✨ ⭐ ✨
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* STYLES */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 5% 10%,
              #f3efff 0,
              transparent 25%
            ),
            radial-gradient(
              circle at 90% 90%,
              #fdf0f7 0,
              transparent 25%
            ),
            ${COLORS.bg};

          color: ${COLORS.textPrimary};

          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        }

        .main {
          margin-left: 240px;
          min-height: 100vh;
          position: relative;
        }

        /* FLOATING STICKERS */

        .floating-decoration {
          position: fixed;
          z-index: 20;
          pointer-events: none;
          font-size: 27px;
          animation: floatSticker 4s ease-in-out infinite;
        }

        .flower {
          right: 26px;
          top: 115px;
        }

        .star {
          right: 70px;
          bottom: 90px;
          animation-delay: 1s;
        }

        .heart {
          left: 255px;
          bottom: 45px;
          animation-delay: 1.8s;
        }

        @keyframes floatSticker {
          0%,
          100% {
            transform: translateY(0) rotate(-5deg);
          }

          50% {
            transform: translateY(-9px) rotate(5deg);
          }
        }

        /* HERO */

        .hero {
          position: relative;
          overflow: hidden;
          padding: 40px 40px;
          background:
            linear-gradient(
              135deg,
              #8176f7 0%,
              #7669ef 45%,
              #9b75e9 100%
            );

          color: white;
        }

        .hero::before {
          content: '';
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          top: -130px;
          right: 15%;
        }

        .hero::after {
          content: '';
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          bottom: -100px;
          left: 10%;
        }

        .hero-inner {
          max-width: 1180px;
          margin: auto;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 30px;

          position: relative;
          z-index: 2;
        }

        .profile-left {
          display: flex;
          align-items: center;
          gap: 22px;
        }

        .avatar-wrapper {
          position: relative;
        }

        .avatar-ring {
          width: 100px;
          height: 100px;

          border-radius: 32px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.4),
              rgba(255,255,255,0.12)
            );

          border: 3px solid
            rgba(255,255,255,0.75);

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 32px;
          font-weight: 800;

          box-shadow:
            0 12px 30px
            rgba(47,35,100,0.2);

          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-sticker {
          position: absolute;
          right: -10px;
          bottom: -9px;

          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: white;

          box-shadow:
            0 5px 15px
            rgba(0,0,0,0.12);
        }

        .cute-label {
          display: inline-flex;
          padding: 6px 10px;

          border-radius: 20px;

          background:
            rgba(255,255,255,0.15);

          border:
            1px solid
            rgba(255,255,255,0.22);

          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;

          margin-bottom: 8px;
        }

        .hero-info h1 {
          margin: 0;
          font-size: 31px;
          font-weight: 850;
          letter-spacing: -0.7px;
        }

        .hero-info p {
          margin: 6px 0 10px;
          font-size: 14px;
          opacity: 0.88;
        }

        .student-pill {
          display: inline-flex;

          padding: 6px 11px;

          border-radius: 20px;

          background: rgba(255,255,255,0.16);

          font-size: 12px;
          font-weight: 700;
        }

        /* MASTERY */

        .mastery-box {
          width: 230px;
          padding: 17px 18px;

          border-radius: 22px;

          background:
            rgba(255,255,255,0.14);

          border:
            1px solid
            rgba(255,255,255,0.2);

          backdrop-filter: blur(15px);

          box-shadow:
            0 10px 25px
            rgba(55,40,120,0.12);

          position: relative;
        }

        .mastery-emoji {
          position: absolute;
          right: 13px;
          top: 11px;
          font-size: 29px;
        }

        .mastery-label {
          display: block;

          font-size: 10px;
          font-weight: 800;

          opacity: 0.72;

          text-transform: uppercase;
          letter-spacing: 0.6px;

          margin-bottom: 4px;
        }

        .mastery-box strong {
          font-size: 29px;
          font-weight: 850;
        }

        .mastery-progress {
          height: 7px;

          margin-top: 11px;

          background:
            rgba(255,255,255,0.2);

          border-radius: 20px;
          overflow: hidden;
        }

        .mastery-progress div {
          height: 100%;

          border-radius: 20px;

          background:
            linear-gradient(
              90deg,
              white,
              #fce7f3
            );

          transition: width 0.5s ease;
        }

        .mastery-box small {
          display: block;
          margin-top: 7px;

          font-size: 11px;
          opacity: 0.75;
        }

        /* CONTENT */

        .content {
          max-width: 1180px;
          margin: auto;

          padding:
            30px 40px 60px;
        }

        /* ALERT */

        .alert {
          display: flex;
          align-items: center;
          gap: 10px;

          padding: 13px 16px;
          margin-bottom: 20px;

          border-radius: 15px;

          font-size: 14px;
          font-weight: 600;
        }

        .error-alert {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }

        .success-alert {
          background: #ecfdf5;
          border: 1px solid #bbf7d0;
          color: #047857;
        }

        /* TABS */

        .tabs {
          display: flex;
          gap: 8px;

          padding: 6px;

          background: #f0edf9;

          border-radius: 16px;

          width: fit-content;

          margin-bottom: 25px;
        }

        .tab {
          border: none;

          background: transparent;

          padding: 11px 18px;

          border-radius: 12px;

          color: ${COLORS.textSecondary};

          font-size: 13px;
          font-weight: 700;

          cursor: pointer;

          transition:
            all 0.2s ease;
        }

        .tab:hover {
          color: ${COLORS.primary};
        }

        .tab.active {
          background: white;

          color: ${COLORS.primary};

          box-shadow:
            0 3px 12px
            rgba(92,77,150,0.1);
        }

        .tab span {
          margin-right: 7px;
        }

        /* PROFILE GRID */

        .profile-grid {
          display: grid;

          grid-template-columns:
            minmax(0, 1fr) 300px;

          gap: 22px;

          align-items: start;
        }

        /* CARD */

        .cute-card {
          background: white;

          border:
            1px solid
            ${COLORS.border};

          border-radius: 24px;

          padding: 28px;

          box-shadow:
            0 8px 30px
            rgba(66,48,130,0.055);
        }

        .card-heading {
          display: flex;
          align-items: center;
          gap: 13px;

          margin-bottom: 25px;
        }

        .heading-icon {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 15px;

          background: #f3efff;

          font-size: 23px;
        }

        .card-heading h2 {
          margin: 0;

          font-size: 20px;
          font-weight: 850;

          color: ${COLORS.textPrimary};
        }

        .card-heading p {
          margin: 5px 0 0;

          color: ${COLORS.textSecondary};

          font-size: 12px;
        }

        .form-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 18px;
        }

        .locked-input {
          position: relative;
        }

        .locked-input > span {
          position: absolute;

          right: 12px;
          top: 50%;

          transform:
            translateY(-50%);

          font-size: 13px;
        }

        .form-actions {
          display: flex;

          justify-content: flex-end;

          gap: 10px;

          margin-top: 27px;

          padding-top: 22px;

          border-top:
            1px dashed
            ${COLORS.border};
        }

        .reset-button,
        .save-button {
          border-radius: 13px;

          padding: 11px 19px;

          font-size: 13px;

          font-weight: 750;

          cursor: pointer;

          transition:
            all 0.2s ease;
        }

        .reset-button {
          border:
            1px solid
            ${COLORS.border};

          background: #faf9fd;

          color:
            ${COLORS.textSecondary};
        }

        .reset-button:hover {
          background: #f4f1fa;
        }

        .save-button {
          border: none;

          color: white;

          background:
            linear-gradient(
              135deg,
              #8175f6,
              #6d5ce7
            );

          box-shadow:
            0 7px 17px
            rgba(124,111,246,0.25);
        }

        .save-button:hover {
          transform: translateY(-1px);

          box-shadow:
            0 10px 22px
            rgba(124,111,246,0.3);
        }

        .save-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        /* SIDE */

        .side-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* INFO CARD */

        .info-card {
          background: white;

          border:
            1px solid
            ${COLORS.border};

          border-radius: 22px;

          padding: 20px;

          box-shadow:
            0 7px 25px
            rgba(66,48,130,0.045);
        }

        .info-card-title {
          display: flex;
          align-items: center;
          gap: 8px;

          margin-bottom: 18px;

          font-size: 15px;
          font-weight: 850;
        }

        .info-row {
          padding-bottom: 12px;
          margin-bottom: 12px;

          border-bottom:
            1px dashed
            ${COLORS.border};
        }

        .info-row:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }

        .info-label {
          display: block;

          margin-bottom: 4px;

          font-size: 10px;

          color:
            ${COLORS.textMuted};

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 13px;

          font-weight: 700;

          color:
            ${COLORS.textPrimary};
        }

        .happy-note {
          display: flex;
          align-items: center;
          gap: 10px;

          padding: 12px;

          margin-top: 4px;

          border-radius: 15px;

          background:
            linear-gradient(
              135deg,
              #fff7ed,
              #fff1f7
            );
        }

        .happy-note > span {
          font-size: 25px;
        }

        .happy-note strong {
          display: block;

          font-size: 12px;
        }

        .happy-note small {
          display: block;

          margin-top: 2px;

          color:
            ${COLORS.textSecondary};

          font-size: 10px;
        }

        /* STATS */

        .stats-grid {
          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 16px;

          margin-bottom: 22px;
        }

        .stat-card {
          position: relative;

          overflow: hidden;

          background: white;

          border:
            1px solid
            ${COLORS.border};

          border-radius: 22px;

          padding: 20px;

          box-shadow:
            0 7px 25px
            rgba(66,48,130,0.045);
        }

        .stat-card::after {
          content: '';

          position: absolute;

          width: 75px;
          height: 75px;

          border-radius: 50%;

          background: #faf8ff;

          right: -25px;
          bottom: -25px;
        }

        .stat-sticker {
          position: absolute;

          top: 13px;
          right: 14px;

          font-size: 18px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;

          border-radius: 14px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 20px;

          margin-bottom: 14px;
        }

        .stat-label {
          font-size: 10px;

          color:
            ${COLORS.textMuted};

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 0.5px;
        }

        .stat-value {
          margin-top: 5px;

          font-size: 27px;

          font-weight: 850;
        }

        .stat-description {
          margin-top: 4px;

          color:
            ${COLORS.textSecondary};

          font-size: 11px;
        }

        /* PROGRESS */

        .progress-card {
          background: white;

          border:
            1px solid
            ${COLORS.border};

          border-radius: 25px;

          padding: 28px;

          box-shadow:
            0 8px 30px
            rgba(66,48,130,0.05);
        }

        .progress-top {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          margin-bottom: 20px;
        }

        .little-badge {
          display: inline-flex;

          padding: 5px 9px;

          border-radius: 20px;

          background: #f4f0ff;

          color:
            ${COLORS.primary};

          font-size: 9px;

          font-weight: 850;

          letter-spacing: 0.6px;
        }

        .progress-top h2 {
          margin: 8px 0 3px;

          font-size: 20px;

          font-weight: 850;
        }

        .progress-top p {
          margin: 0;

          color:
            ${COLORS.textSecondary};

          font-size: 12px;
        }

        .big-mastery {
          font-size: 35px;

          font-weight: 900;

          color:
            ${COLORS.primary};
        }

        .large-progress {
          height: 15px;

          background: #f0edf8;

          border-radius: 20px;

          overflow: hidden;
        }

        .large-progress > div {
          height: 100%;

          border-radius: 20px;

          background:
            linear-gradient(
              90deg,
              #8b7cf7,
              #c084fc,
              #f0a5cf
            );

          transition:
            width 0.6s ease;
        }

        .progress-labels {
          display: flex;

          justify-content: space-between;

          margin-top: 8px;

          font-size: 11px;

          color:
            ${COLORS.textMuted};
        }

        .motivation-box {
          display: flex;

          align-items: center;

          gap: 13px;

          margin-top: 25px;

          padding: 16px;

          border-radius: 19px;

          background:
            linear-gradient(
              135deg,
              #f8f5ff,
              #fff6fa
            );

          border:
            1px solid
            #eee8fa;
        }

        .motivation-character {
          width: 47px;
          height: 47px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 15px;

          background: white;

          font-size: 27px;

          box-shadow:
            0 4px 12px
            rgba(0,0,0,0.05);
        }

        .motivation-box strong {
          font-size: 13px;
        }

        .motivation-box p {
          margin: 3px 0 0;

          color:
            ${COLORS.textSecondary};

          font-size: 11px;
        }

        .mini-stars {
          margin-left: auto;

          font-size: 17px;

          white-space: nowrap;
        }

        /* RESPONSIVE */

        @media (max-width: 1100px) {

          .stats-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .profile-grid {
            grid-template-columns: 1fr;
          }

          .side-column {
            display: grid;

            grid-template-columns:
              1fr 1fr;
          }

        }

        @media (max-width: 800px) {

          .main {
            margin-left: 0;
          }

          .hero {
            padding: 30px 20px;
          }

          .hero-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .mastery-box {
            width: 100%;
          }

          .content {
            padding:
              22px 16px 40px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .side-column {
            grid-template-columns: 1fr;
          }

          .tabs {
            width: 100%;
          }

          .tab {
            flex: 1;
            padding:
              10px 8px;
          }

          .floating-decoration {
            display: none;
          }

        }

        @media (max-width: 560px) {

          .profile-left {
            align-items: flex-start;
          }

          .avatar-ring {
            width: 78px;
            height: 78px;

            border-radius: 25px;

            font-size: 25px;
          }

          .hero-info h1 {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .cute-card,
          .progress-card {
            padding: 20px;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .reset-button,
          .save-button {
            width: 100%;
          }

          .progress-top {
            align-items: flex-start;
          }

          .big-mastery {
            font-size: 27px;
          }

          .motivation-box {
            align-items: flex-start;
          }

          .mini-stars {
            display: none;
          }

        }

        input:focus,
        select:focus {
          outline: none !important;

          border-color:
            ${COLORS.primary} !important;

          box-shadow:
            0 0 0 4px
            rgba(124,111,246,0.1) !important;
        }

        button {
          font-family: inherit;
        }

      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* FORM FIELD */
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
          fontSize: 12,
          fontWeight: 800,
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
/* INPUT STYLE */
/* ───────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 13px',

  border:
    `1px solid ${COLORS.border}`,

  borderRadius: 12,

  background: '#FFFFFF',

  color: COLORS.textPrimary,

  fontSize: 13,

  fontFamily: 'inherit',

  transition: 'all 0.2s',

  boxShadow:
    '0 2px 6px rgba(50,40,100,0.02)',
};

/* ───────────────────────────────────────────── */
/* INFO CARD */
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
    <div className="info-card">

      <h3 className="info-card-title">
        <span>{icon}</span>
        {title}
      </h3>

      <div>
        {children}
      </div>

      <style jsx>{`
        .info-card {
          background: white;
          border:
            1px solid
            ${COLORS.border};
          border-radius: 22px;
          padding: 20px;
          box-shadow:
            0 7px 25px
            rgba(66,48,130,0.045);
        }

        .info-card-title {
          display: flex;
          align-items: center;
          gap: 8px;

          margin: 0 0 18px;

          font-size: 15px;
          font-weight: 850;
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* INFO ROW */
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
    <div className="info-row">

      <span className="info-label">
        {label}
      </span>

      <span
        className="info-value"
        style={{
          color:
            valueColor ||
            COLORS.textPrimary,
        }}
      >
        {value}
      </span>

      <style jsx>{`
        .info-row {
          padding-bottom: 12px;
          margin-bottom: 12px;

          border-bottom:
            1px dashed
            ${COLORS.border};
        }

        .info-row:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .info-label {
          display: block;
          margin-bottom: 4px;

          font-size: 10px;

          color:
            ${COLORS.textMuted};

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 13px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* STAT CARD */
/* ───────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  description,
  color,
  sticker,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
  color: string;
  sticker: string;
}) {
  return (
    <div className="stat-card">

      <div className="stat-sticker">
        {sticker}
      </div>

      <div
        className="stat-icon"
        style={{
          background: `${color}14`,
        }}
      >
        {icon}
      </div>

      <div className="stat-label">
        {label}
      </div>

      <div
        className="stat-value"
        style={{
          color,
        }}
      >
        {value}
      </div>

      <div className="stat-description">
        {description}
      </div>

      <style jsx>{`
        .stat-card {
          position: relative;
          overflow: hidden;

          background: white;

          border:
            1px solid
            ${COLORS.border};

          border-radius: 22px;

          padding: 20px;

          box-shadow:
            0 7px 25px
            rgba(66,48,130,0.045);
        }

        .stat-sticker {
          position: absolute;
          top: 13px;
          right: 14px;
          font-size: 18px;
        }

        .stat-icon {
          width: 43px;
          height: 43px;

          border-radius: 14px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 20px;

          margin-bottom: 14px;
        }

        .stat-label {
          font-size: 10px;

          color:
            ${COLORS.textMuted};

          font-weight: 800;

          text-transform: uppercase;

          letter-spacing: 0.5px;
        }

        .stat-value {
          margin-top: 5px;

          font-size: 27px;

          font-weight: 850;
        }

        .stat-description {
          margin-top: 4px;

          color:
            ${COLORS.textSecondary};

          font-size: 11px;
        }
      `}</style>
    </div>
  );
}