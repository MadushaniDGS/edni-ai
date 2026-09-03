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
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  borderLight: "#E5E7EB",
  borderDark: "#334155",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

interface Settings {
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_sms: boolean;
  weekly_report: boolean;
  daily_goal_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  learning_pace: 'slow' | 'balanced' | 'fast';
  theme: 'light' | 'dark';
  language: 'en' | 'es' | 'fr';
  font_size: 'small' | 'normal' | 'large';
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'notifications' | 'learning' | 'display' | 'data'>('notifications');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [settings, setSettings] = useState<Settings>({
    notifications_email: true,
    notifications_push: true,
    notifications_sms: false,
    weekly_report: true,
    daily_goal_hours: 2,
    difficulty_level: 'intermediate',
    learning_pace: 'balanced',
    theme: 'light',
    language: 'en',
    font_size: 'normal',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('edni_access');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await axios.get(`${API_URL}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSettings(res.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // Use default settings for demo
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('edni_access');
      await axios.put(`${API_URL}/user/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSetting = (key: keyof Settings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('edni_access');
      await axios.post(
        `${API_URL}/user/change-password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPasswordChange(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to change password:', err);
      setError('Failed to change password. Please check your current password.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('edni_access');
      await axios.delete(`${API_URL}/user/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem('edni_access');
      localStorage.removeItem('edni-storage');
      router.push('/login');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError('Failed to delete account. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bgLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `3px solid ${COLORS.borderLight}`,
            borderTop: `3px solid ${COLORS.primary}`,
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: COLORS.textMuted }}>Loading settings...</p>
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORS.bgLight,
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
        color: 'white',
        padding: '3rem 2rem',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(108,99,255,0.2)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            margin: 0,
            marginBottom: '0.5rem',
          }}>⚙️ Settings</h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.9,
            margin: 0,
          }}>Customize your learning experience</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        {/* Alerts */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: `1.5px solid ${COLORS.error}`,
            borderRadius: 12,
            padding: '1rem',
            marginBottom: '1.5rem',
            color: COLORS.error,
            fontWeight: 500,
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: `1.5px solid ${COLORS.success}`,
            borderRadius: 12,
            padding: '1rem',
            marginBottom: '1.5rem',
            color: COLORS.success,
            fontWeight: 500,
          }}>
            ✓ {success}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          gap: '2rem',
        }}>
          {/* Sidebar Navigation */}
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '1.5rem',
            height: 'fit-content',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <nav style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}>
              {[
                { id: 'notifications', icon: '🔔', label: 'Notifications' },
                { id: 'learning', icon: '📚', label: 'Learning' },
                { id: 'display', icon: '🎨', label: 'Display' },
                { id: 'data', icon: '📁', label: 'Data & Privacy' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '1rem',
                    textAlign: 'left',
                    background: activeTab === tab.id ? `linear-gradient(135deg, rgba(108,99,255,0.1), rgba(168,85,247,0.1))` : 'transparent',
                    border: 'none',
                    borderLeft: activeTab === tab.id ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                    borderRadius: 0,
                    color: activeTab === tab.id ? COLORS.primary : COLORS.textSecondary,
                    fontWeight: activeTab === tab.id ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 2rem 0',
                }}>Notification Preferences</h2>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                }}>
                  {/* Email Notifications */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.borderLight}`,
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: '0 0 0.25rem 0',
                      }}>Email Notifications</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: COLORS.textMuted,
                        margin: 0,
                      }}>Receive updates about your learning progress</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      width: 50,
                      height: 26,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.notifications_email}
                        onChange={() => handleToggleSetting('notifications_email')}
                        style={{
                          display: 'none',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 50,
                          height: 26,
                          background: settings.notifications_email ? COLORS.primary : COLORS.borderLight,
                          borderRadius: 13,
                          transition: 'background 0.3s',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: settings.notifications_email ? 26 : 2,
                          width: 22,
                          height: 22,
                          background: 'white',
                          borderRadius: '50%',
                          transition: 'left 0.3s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    </label>
                  </div>

                  {/* Push Notifications */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.borderLight}`,
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: '0 0 0.25rem 0',
                      }}>Push Notifications</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: COLORS.textMuted,
                        margin: 0,
                      }}>Get instant alerts on your device</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      width: 50,
                      height: 26,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.notifications_push}
                        onChange={() => handleToggleSetting('notifications_push')}
                        style={{
                          display: 'none',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 50,
                          height: 26,
                          background: settings.notifications_push ? COLORS.primary : COLORS.borderLight,
                          borderRadius: 13,
                          transition: 'background 0.3s',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: settings.notifications_push ? 26 : 2,
                          width: 22,
                          height: 22,
                          background: 'white',
                          borderRadius: '50%',
                          transition: 'left 0.3s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    </label>
                  </div>

                  {/* SMS Notifications */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.borderLight}`,
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: '0 0 0.25rem 0',
                      }}>SMS Alerts</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: COLORS.textMuted,
                        margin: 0,
                      }}>Receive important updates via SMS</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      width: 50,
                      height: 26,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.notifications_sms}
                        onChange={() => handleToggleSetting('notifications_sms')}
                        style={{
                          display: 'none',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 50,
                          height: 26,
                          background: settings.notifications_sms ? COLORS.primary : COLORS.borderLight,
                          borderRadius: 13,
                          transition: 'background 0.3s',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: settings.notifications_sms ? 26 : 2,
                          width: 22,
                          height: 22,
                          background: 'white',
                          borderRadius: '50%',
                          transition: 'left 0.3s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    </label>
                  </div>

                  {/* Weekly Report */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.5rem',
                    backgroundColor: COLORS.bgLight,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.borderLight}`,
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: '0 0 0.25rem 0',
                      }}>Weekly Progress Report</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: COLORS.textMuted,
                        margin: 0,
                      }}>Receive weekly summary of your learning progress</p>
                    </div>
                    <label style={{
                      position: 'relative',
                      width: 50,
                      height: 26,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={settings.weekly_report}
                        onChange={() => handleToggleSetting('weekly_report')}
                        style={{
                          display: 'none',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 50,
                          height: 26,
                          background: settings.weekly_report ? COLORS.primary : COLORS.borderLight,
                          borderRadius: 13,
                          transition: 'background 0.3s',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: settings.weekly_report ? 26 : 2,
                          width: 22,
                          height: 22,
                          background: 'white',
                          borderRadius: '50%',
                          transition: 'left 0.3s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Learning Tab */}
            {activeTab === 'learning' && (
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 2rem 0',
                }}>Learning Preferences</h2>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem',
                }}>
                  {/* Daily Goal */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '0.75rem',
                    }}>Daily Learning Goal (hours)</label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                    }}>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="0.5"
                        value={settings.daily_goal_hours}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            daily_goal_hours: parseFloat(e.target.value),
                          }))
                        }
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: COLORS.borderLight,
                          outline: 'none',
                          WebkitAppearance: 'none',
                        }}
                      />
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: COLORS.primary,
                        minWidth: '60px',
                        textAlign: 'right',
                      }}>
                        {settings.daily_goal_hours}h
                      </div>
                    </div>
                    <p style={{
                      fontSize: '0.875rem',
                      color: COLORS.textMuted,
                      marginTop: '0.5rem',
                      margin: '0.5rem 0 0 0',
                    }}>Set your target daily study time</p>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '0.75rem',
                    }}>Difficulty Level</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                    }}>
                      {['beginner', 'intermediate', 'advanced'].map((level) => (
                        <button
                          key={level}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              difficulty_level: level as any,
                            }))
                          }
                          style={{
                            padding: '1rem',
                            background:
                              settings.difficulty_level === level
                                ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`
                                : 'white',
                            color: settings.difficulty_level === level ? 'white' : COLORS.textPrimary,
                            border: `1.5px solid ${settings.difficulty_level === level ? COLORS.primary : COLORS.borderLight}`,
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                          }}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Learning Pace */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '0.75rem',
                    }}>Learning Pace</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                    }}>
                      {['slow', 'balanced', 'fast'].map((pace) => (
                        <button
                          key={pace}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              learning_pace: pace as any,
                            }))
                          }
                          style={{
                            padding: '1rem',
                            background:
                              settings.learning_pace === pace
                                ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`
                                : 'white',
                            color: settings.learning_pace === pace ? 'white' : COLORS.textPrimary,
                            border: `1.5px solid ${settings.learning_pace === pace ? COLORS.primary : COLORS.borderLight}`,
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                          }}
                        >
                          {pace}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Display Tab */}
            {activeTab === 'display' && (
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 2rem 0',
                }}>Display Settings</h2>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem',
                }}>
                  {/* Theme */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '0.75rem',
                    }}>Theme</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '1rem',
                    }}>
                      {['light', 'dark'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              theme: theme as any,
                            }))
                          }
                          style={{
                            padding: '1rem',
                            background:
                              settings.theme === theme
                                ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`
                                : 'white',
                            color: settings.theme === theme ? 'white' : COLORS.textPrimary,
                            border: `1.5px solid ${settings.theme === theme ? COLORS.primary : COLORS.borderLight}`,
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                          }}
                        >
                          {theme === 'light' ? '☀️' : '🌙'} {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '0.75rem',
                    }}>Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          language: e.target.value as any,
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: `1.5px solid ${COLORS.borderLight}`,
                        borderRadius: 10,
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      marginBottom: '0.75rem',
                    }}>Font Size</label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                    }}>
                      {['small', 'normal', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              font_size: size as any,
                            }))
                          }
                          style={{
                            padding: '1rem',
                            background:
                              settings.font_size === size
                                ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`
                                : 'white',
                            color: settings.font_size === size ? 'white' : COLORS.textPrimary,
                            border: `1.5px solid ${settings.font_size === size ? COLORS.primary : COLORS.borderLight}`,
                            borderRadius: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: size === 'small' ? '0.875rem' : size === 'normal' ? '1rem' : '1.125rem',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s',
                          }}
                        >
                          A
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data' && (
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 2rem 0',
                }}>Data & Privacy</h2>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                }}>
                  {/* Change Password */}
                  <div style={{
                    padding: '1.5rem',
                    background: COLORS.bgLight,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.borderLight}`,
                  }}>
                    {!showPasswordChange ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div>
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: COLORS.textPrimary,
                            margin: '0 0 0.25rem 0',
                          }}>Change Password</h3>
                          <p style={{
                            fontSize: '0.875rem',
                            color: COLORS.textMuted,
                            margin: 0,
                          }}>Update your account password</p>
                        </div>
                        <button
                          onClick={() => setShowPasswordChange(true)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: COLORS.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleChangePassword} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}>
                        <input
                          type="password"
                          placeholder="Current Password"
                          value={passwordForm.current_password}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              current_password: e.target.value,
                            }))
                          }
                          style={{
                            padding: '0.75rem 1rem',
                            border: `1.5px solid ${COLORS.borderLight}`,
                            borderRadius: 8,
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                          }}
                        />
                        <input
                          type="password"
                          placeholder="New Password"
                          value={passwordForm.new_password}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              new_password: e.target.value,
                            }))
                          }
                          style={{
                            padding: '0.75rem 1rem',
                            border: `1.5px solid ${COLORS.borderLight}`,
                            borderRadius: 8,
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                          }}
                        />
                        <input
                          type="password"
                          placeholder="Confirm Password"
                          value={passwordForm.confirm_password}
                          onChange={(e) =>
                            setPasswordForm((prev) => ({
                              ...prev,
                              confirm_password: e.target.value,
                            }))
                          }
                          style={{
                            padding: '0.75rem 1rem',
                            border: `1.5px solid ${COLORS.borderLight}`,
                            borderRadius: 8,
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                          }}
                        />
                        <div style={{
                          display: 'flex',
                          gap: '1rem',
                        }}>
                          <button
                            type="submit"
                            disabled={saving}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: COLORS.primary,
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 600,
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.7 : 1,
                            }}
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPasswordChange(false)}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: 'transparent',
                              color: COLORS.textSecondary,
                              border: `1.5px solid ${COLORS.borderLight}`,
                              borderRadius: 8,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Export Data */}
                  <div style={{
                    padding: '1.5rem',
                    background: COLORS.bgLight,
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.borderLight}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        margin: '0 0 0.25rem 0',
                      }}>Export Learning Data</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: COLORS.textMuted,
                        margin: 0,
                      }}>Download your profile and learning data as JSON</p>
                    </div>
                    <button
                      onClick={() => alert('Exporting your data...')}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'transparent',
                        color: COLORS.primary,
                        border: `1.5px solid ${COLORS.primary}`,
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.primary;
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = COLORS.primary;
                      }}
                    >
                      📥 Export
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div style={{
                    padding: '1.5rem',
                    background: '#FEF2F2',
                    borderRadius: 10,
                    border: `1.5px solid ${COLORS.error}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.error,
                        margin: '0 0 0.25rem 0',
                      }}>Delete Account</h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: COLORS.error,
                        margin: 0,
                        opacity: 0.7,
                      }}>Permanently delete your account and all data</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: COLORS.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  {/* Delete Confirmation Modal */}
                  {showDeleteConfirm && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                    }}>
                      <div style={{
                        background: 'white',
                        borderRadius: 12,
                        padding: '2rem',
                        maxWidth: '400px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                      }}>
                        <h2 style={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: COLORS.error,
                          margin: '0 0 1rem 0',
                        }}>Delete Account?</h2>
                        <p style={{
                          color: COLORS.textPrimary,
                          marginBottom: '2rem',
                        }}>
                          This action cannot be undone. All your data will be permanently deleted.
                        </p>
                        <div style={{
                          display: 'flex',
                          gap: '1rem',
                        }}>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: 'transparent',
                              color: COLORS.textPrimary,
                              border: `1.5px solid ${COLORS.borderLight}`,
                              borderRadius: 8,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={saving}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: COLORS.error,
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              fontWeight: 600,
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.7 : 1,
                            }}
                          >
                            {saving ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            {activeTab !== 'data' && (
              <div style={{
                marginTop: '2rem',
                paddingTop: '2rem',
                borderTop: `1px solid ${COLORS.borderLight}`,
                display: 'flex',
                gap: '1rem',
              }}>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: `0 4px 15px rgba(108,99,255,0.3)`,
                  }}
                  onMouseEnter={(e) => !saving && (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => !saving && (e.currentTarget.style.opacity = '1')}
                >
                  {saving ? '💾 Saving...' : '💾 Save Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}