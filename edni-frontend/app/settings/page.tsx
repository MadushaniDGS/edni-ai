"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const COLORS = {
  primary: "#6C63FF",
  primaryHover: "#554BE8",
  secondary: "#A855F7",
  accent: "#EC4899",

  background: "#F8F7FC",
  card: "#FFFFFF",
  softPurple: "#F1EEFF",
  softPink: "#FFF0F7",
  softBlue: "#EEF5FF",
  softGreen: "#ECFDF5",
  softOrange: "#FFF7ED",

  textPrimary: "#25213A",
  textSecondary: "#6F6A80",
  textMuted: "#9A95A8",

  border: "#E9E5F2",

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
  difficulty_level: "beginner" | "intermediate" | "advanced";
  learning_pace: "slow" | "balanced" | "fast";
  theme: "light" | "dark";
  language: "en" | "es" | "fr";
  font_size: "small" | "normal" | "large";
}

type Tab =
  | "notifications"
  | "learning"
  | "display"
  | "data";

const DEFAULT_SETTINGS: Settings = {
  notifications_email: true,
  notifications_push: true,
  notifications_sms: false,
  weekly_report: true,
  daily_goal_hours: 2,
  difficulty_level: "intermediate",
  learning_pace: "balanced",
  theme: "light",
  language: "en",
  font_size: "normal",
};

const SETTINGS_STORAGE_KEY = "edni_settings";

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] =
    useState<Tab>("notifications");

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false);

  const [showPasswordChange, setShowPasswordChange] =
    useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [settings, setSettings] =
    useState<Settings>(DEFAULT_SETTINGS);

  // ============================================================
  // LOAD SETTINGS FROM LOCAL STORAGE
  // ============================================================

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(
        SETTINGS_STORAGE_KEY
      );

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);

        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
        });
      }
    } catch (err) {
      console.error(
        "Failed to load settings:",
        err
      );

      setError(
        "Unable to load your saved settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // SAVE SETTINGS
  // ============================================================

  const handleSaveSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
      );

      setSuccess(
        "Your settings have been saved successfully."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to save settings:",
        err
      );

      setError(
        "Unable to save your settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // TOGGLE SETTINGS
  // ============================================================

  const handleToggleSetting = (
    key:
      | "notifications_email"
      | "notifications_push"
      | "notifications_sms"
      | "weekly_report"
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ============================================================
  // CHANGE PASSWORD
  // TEMPORARY FRONTEND ONLY
  // ============================================================

  const handleChangePassword = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      passwordForm.new_password !==
      passwordForm.confirm_password
    ) {
      setError("New passwords do not match.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    setSuccess(
      "Password validation completed. Password changes will be available when the backend is connected."
    );

    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });

    setShowPasswordChange(false);

    setTimeout(() => {
      setSuccess("");
    }, 4000);
  };

  // ============================================================
  // CLEAR LOCAL SETTINGS
  // BACKEND ACCOUNT DELETE IS NOT IMPLEMENTED YET
  // ============================================================

  const handleDeleteAccount = () => {
    setSaving(true);
    setError("");

    try {
      localStorage.removeItem(
        SETTINGS_STORAGE_KEY
      );

      setSettings(DEFAULT_SETTINGS);

      setShowDeleteConfirm(false);

      setSuccess(
        "Your local settings have been cleared."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to clear settings:",
        err
      );

      setError(
        "Unable to clear your local settings."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // TABS
  // ============================================================

  const tabs = [
    {
      id: "notifications" as Tab,
      icon: "🔔",
      title: "Notifications",
      description: "Alerts & reports",
    },
    {
      id: "learning" as Tab,
      icon: "📚",
      title: "Learning",
      description: "Study preferences",
    },
    {
      id: "display" as Tab,
      icon: "🎨",
      title: "Appearance",
      description: "Display settings",
    },
    {
      id: "data" as Tab,
      icon: "🔐",
      title: "Privacy",
      description: "Security & data",
    },
  ];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <>
        <TopBar />
        <Sidebar />

        <div className="loadingPage">
          <div className="loadingSticker">⚙️</div>

          <div className="loader" />

          <p>Loading your settings...</p>
        </div>

        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            background: ${COLORS.background};
            color: ${COLORS.textSecondary};

            font-family:
              Inter,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;

            padding-top: 70px;
            margin-left: 250px;
          }

          .loadingSticker {
            font-size: 42px;
            margin-bottom: 18px;
            animation: float 2s ease-in-out infinite;
          }

          .loader {
            width: 38px;
            height: 38px;

            border: 4px solid ${COLORS.border};
            border-top-color: ${COLORS.primary};

            border-radius: 50%;

            animation: spin 0.8s linear infinite;
          }

          .loadingPage p {
            margin-top: 16px;
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
              transform: translateY(-7px);
            }
          }

          @media (max-width: 900px) {
            .loadingPage {
              margin-left: 0;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {/* ======================================================
          GLOBAL APP NAVIGATION
      ====================================================== */}

      <TopBar />
      <Sidebar />

      {/* ======================================================
          SETTINGS PAGE
      ====================================================== */}

      <div className="page">
        {/* Decorative stickers */}

        <div className="sticker stickerOne">
          ✨
        </div>

        <div className="sticker stickerTwo">
          🌸
        </div>

        <div className="sticker stickerThree">
          💜
        </div>

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="header">
          <div className="headerInner">
            <div>
              <div className="eyebrow">
                <span>🌷</span>
                YOUR SPACE
              </div>

              <h1>Settings</h1>

              <p>
                Make Edni feel more comfortable for the
                way you learn.
              </p>
            </div>

            <div className="settingsBubble">
              ⚙️
            </div>
          </div>
        </header>

        {/* ==================================================
            MAIN
        ================================================== */}

        <main className="container">
          {/* Alerts */}

          {error && (
            <div className="alert errorAlert">
              <span>⚠️</span>

              <div>
                <strong>
                  Something went wrong
                </strong>

                <p>{error}</p>
              </div>

              <button
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div className="alert successAlert">
              <span>🌟</span>

              <div>
                <strong>All done!</strong>

                <p>{success}</p>
              </div>
            </div>
          )}

          {/* ==================================================
              LAYOUT
          ================================================== */}

          <div className="layout">
            {/* ==================================================
                NAVIGATION
            ================================================== */}

            <aside className="navigation">
              <div className="navTitle">
                <span>🧸</span>
                Preferences
              </div>

              <div className="navList">
                {tabs.map((tab) => {
                  const active =
                    activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setActiveTab(tab.id)
                      }
                      className={`navItem ${active ? "active" : ""
                        }`}
                    >
                      <span className="navIcon">
                        {tab.icon}
                      </span>

                      <span className="navText">
                        <strong>
                          {tab.title}
                        </strong>

                        <small>
                          {tab.description}
                        </small>
                      </span>

                      {active && (
                        <span className="arrow">
                          ›
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="littleCard">
                <div className="littleCardEmoji">
                  🌱
                </div>

                <strong>
                  Small changes matter
                </strong>

                <p>
                  Personalize Edni so your learning
                  space feels like yours.
                </p>
              </div>
            </aside>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <section className="content">
              {/* ==================================================
                  NOTIFICATIONS
              ================================================== */}

              {activeTab === "notifications" && (
                <div className="tabContent">
                  <SectionHeader
                    emoji="🔔"
                    title="Notifications"
                    description="Choose which updates you would like to receive."
                  />

                  <div className="settingList">
                    <ToggleCard
                      emoji="📧"
                      title="Email notifications"
                      description="Receive updates about your learning progress."
                      value={
                        settings.notifications_email
                      }
                      onChange={() =>
                        handleToggleSetting(
                          "notifications_email"
                        )
                      }
                      color={COLORS.softPurple}
                    />

                    <ToggleCard
                      emoji="📱"
                      title="Push notifications"
                      description="Get instant alerts and learning reminders."
                      value={
                        settings.notifications_push
                      }
                      onChange={() =>
                        handleToggleSetting(
                          "notifications_push"
                        )
                      }
                      color={COLORS.softBlue}
                    />

                    <ToggleCard
                      emoji="💌"
                      title="SMS alerts"
                      description="Receive important updates through SMS."
                      value={
                        settings.notifications_sms
                      }
                      onChange={() =>
                        handleToggleSetting(
                          "notifications_sms"
                        )
                      }
                      color={COLORS.softPink}
                    />

                    <ToggleCard
                      emoji="📊"
                      title="Weekly progress report"
                      description="Receive a weekly summary of your learning."
                      value={
                        settings.weekly_report
                      }
                      onChange={() =>
                        handleToggleSetting(
                          "weekly_report"
                        )
                      }
                      color={COLORS.softGreen}
                    />
                  </div>
                </div>
              )}

              {/* ==================================================
                  LEARNING
              ================================================== */}

              {activeTab === "learning" && (
                <div className="tabContent">
                  <SectionHeader
                    emoji="📚"
                    title="Learning preferences"
                    description="Adjust Edni to match your personal study style."
                  />

                  <div className="learningSection">
                    {/* Daily goal */}

                    <div className="preferenceCard">
                      <div className="preferenceTop">
                        <div>
                          <span className="miniEmoji">
                            ⏰
                          </span>

                          <div>
                            <h3>
                              Daily learning goal
                            </h3>

                            <p>
                              How much time would you
                              like to study each day?
                            </p>
                          </div>
                        </div>

                        <div className="goalValue">
                          {
                            settings.daily_goal_hours
                          }
                          <span>h</span>
                        </div>
                      </div>

                      <input
                        className="range"
                        type="range"
                        min="1"
                        max="8"
                        step="0.5"
                        value={
                          settings.daily_goal_hours
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            daily_goal_hours:
                              parseFloat(
                                e.target.value
                              ),
                          }))
                        }
                      />

                      <div className="rangeLabels">
                        <span>1 hour</span>
                        <span>4 hours</span>
                        <span>8 hours</span>
                      </div>
                    </div>

                    {/* Difficulty */}

                    <ChoiceSection
                      title="Difficulty level"
                      emoji="🎯"
                      description="Choose the level that feels right for you."
                      options={[
                        {
                          value: "beginner",
                          label: "Beginner",
                          emoji: "🌱",
                        },
                        {
                          value: "intermediate",
                          label: "Intermediate",
                          emoji: "🌿",
                        },
                        {
                          value: "advanced",
                          label: "Advanced",
                          emoji: "🌳",
                        },
                      ]}
                      value={
                        settings.difficulty_level
                      }
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          difficulty_level:
                            value as Settings["difficulty_level"],
                        }))
                      }
                    />

                    {/* Learning pace */}

                    <ChoiceSection
                      title="Learning pace"
                      emoji="🚀"
                      description="Select the pace that works best for you."
                      options={[
                        {
                          value: "slow",
                          label: "Slow",
                          emoji: "🐢",
                        },
                        {
                          value: "balanced",
                          label: "Balanced",
                          emoji: "🐰",
                        },
                        {
                          value: "fast",
                          label: "Fast",
                          emoji: "⚡",
                        },
                      ]}
                      value={
                        settings.learning_pace
                      }
                      onChange={(value) =>
                        setSettings((prev) => ({
                          ...prev,
                          learning_pace:
                            value as Settings["learning_pace"],
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* ==================================================
                  DISPLAY
              ================================================== */}

              {activeTab === "display" && (
                <div className="tabContent">
                  <SectionHeader
                    emoji="🎨"
                    title="Appearance"
                    description="Personalize how your learning environment looks."
                  />

                  <div className="displayGrid">
                    {/* Theme */}

                    <div className="displayCard">
                      <div className="displayIcon">
                        {settings.theme === "light"
                          ? "☀️"
                          : "🌙"}
                      </div>

                      <h3>Theme</h3>

                      <p>
                        Choose your preferred
                        appearance.
                      </p>

                      <div className="optionRow">
                        {["light", "dark"].map(
                          (theme) => (
                            <button
                              key={theme}
                              onClick={() =>
                                setSettings(
                                  (prev) => ({
                                    ...prev,
                                    theme:
                                      theme as Settings["theme"],
                                  })
                                )
                              }
                              className={`optionButton ${settings.theme ===
                                  theme
                                  ? "selected"
                                  : ""
                                }`}
                            >
                              {theme === "light"
                                ? "☀️"
                                : "🌙"}

                              <span>
                                {theme
                                  .charAt(0)
                                  .toUpperCase() +
                                  theme.slice(1)}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Language */}

                    <div className="displayCard">
                      <div className="displayIcon">
                        🌎
                      </div>

                      <h3>Language</h3>

                      <p>
                        Select your preferred
                        language.
                      </p>

                      <select
                        value={settings.language}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            language:
                              e.target
                                .value as Settings["language"],
                          }))
                        }
                        className="select"
                      >
                        <option value="en">
                          English
                        </option>

                        <option value="es">
                          Español
                        </option>

                        <option value="fr">
                          Français
                        </option>
                      </select>
                    </div>

                    {/* Font size */}

                    <div className="displayCard fullWidth">
                      <div className="displayIcon">
                        🔤
                      </div>

                      <h3>Font size</h3>

                      <p>
                        Adjust the text size across
                        your experience.
                      </p>

                      <div className="fontOptions">
                        {[
                          {
                            value: "small",
                            label: "Small",
                            letter: "A",
                          },
                          {
                            value: "normal",
                            label: "Normal",
                            letter: "A",
                          },
                          {
                            value: "large",
                            label: "Large",
                            letter: "A",
                          },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() =>
                              setSettings(
                                (prev) => ({
                                  ...prev,
                                  font_size:
                                    item.value as Settings["font_size"],
                                })
                              )
                            }
                            className={`fontButton ${settings.font_size ===
                                item.value
                                ? "selected"
                                : ""
                              }`}
                          >
                            <span
                              className={`letter ${item.value}`}
                            >
                              {item.letter}
                            </span>

                            <span>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  DATA / PRIVACY
              ================================================== */}

              {activeTab === "data" && (
                <div className="tabContent">
                  <SectionHeader
                    emoji="🔐"
                    title="Privacy & security"
                    description="Manage your account security and personal data."
                  />

                  <div className="securityList">
                    {/* Password */}

                    {!showPasswordChange ? (
                      <ActionCard
                        emoji="🔑"
                        title="Change password"
                        description="Update your account password to keep your account secure."
                        button="Change password"
                        onClick={() =>
                          setShowPasswordChange(
                            true
                          )
                        }
                        color={COLORS.softPurple}
                      />
                    ) : (
                      <div className="passwordCard">
                        <div className="passwordHeader">
                          <div className="passwordEmoji">
                            🔑
                          </div>

                          <div>
                            <h3>
                              Change your password
                            </h3>

                            <p>
                              Choose a strong password
                              with at least 8
                              characters.
                            </p>
                          </div>
                        </div>

                        <form
                          onSubmit={
                            handleChangePassword
                          }
                          className="passwordForm"
                        >
                          <input
                            type="password"
                            placeholder="Current password"
                            value={
                              passwordForm.current_password
                            }
                            onChange={(e) =>
                              setPasswordForm(
                                (prev) => ({
                                  ...prev,
                                  current_password:
                                    e.target.value,
                                })
                              )
                            }
                            required
                          />

                          <input
                            type="password"
                            placeholder="New password"
                            value={
                              passwordForm.new_password
                            }
                            onChange={(e) =>
                              setPasswordForm(
                                (prev) => ({
                                  ...prev,
                                  new_password:
                                    e.target.value,
                                })
                              )
                            }
                            required
                          />

                          <input
                            type="password"
                            placeholder="Confirm new password"
                            value={
                              passwordForm.confirm_password
                            }
                            onChange={(e) =>
                              setPasswordForm(
                                (prev) => ({
                                  ...prev,
                                  confirm_password:
                                    e.target.value,
                                })
                              )
                            }
                            required
                          />

                          <div className="formButtons">
                            <button
                              type="submit"
                              className="primaryButton"
                              disabled={saving}
                            >
                              {saving
                                ? "Saving..."
                                : "Save password"}
                            </button>

                            <button
                              type="button"
                              className="secondaryButton"
                              onClick={() => {
                                setShowPasswordChange(
                                  false
                                );

                                setPasswordForm({
                                  current_password:
                                    "",
                                  new_password: "",
                                  confirm_password:
                                    "",
                                });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Export */}

                    <ActionCard
                      emoji="📦"
                      title="Export learning data"
                      description="Download your profile and learning information."
                      button="Export"
                      onClick={() =>
                        setSuccess(
                          "Data export will be available when the backend is connected."
                        )
                      }
                      color={COLORS.softBlue}
                      outline
                    />

                    {/* Delete */}

                    <div className="dangerCard">
                      <div className="dangerInfo">
                        <div className="dangerEmoji">
                          🗑️
                        </div>

                        <div>
                          <h3>
                            Delete account
                          </h3>

                          <p>
                            Permanently delete your
                            account and associated
                            data.
                          </p>
                        </div>
                      </div>

                      <button
                        className="deleteButton"
                        onClick={() =>
                          setShowDeleteConfirm(
                            true
                          )
                        }
                      >
                        Delete account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  SAVE
              ================================================== */}

              {activeTab !== "data" && (
                <div className="saveArea">
                  <div className="saveHint">
                    <span>💜</span>

                    <div>
                      <strong>
                        Keep your preferences updated
                      </strong>

                      <small>
                        Your changes will be saved to
                        this browser.
                      </small>
                    </div>
                  </div>

                  <button
                    className="saveButton"
                    onClick={handleSaveSettings}
                    disabled={saving}
                  >
                    {saving
                      ? "💾 Saving..."
                      : "💾 Save settings"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      {showDeleteConfirm && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalSticker">
              🥺
            </div>

            <h2>Are you sure?</h2>

            <p>
              This will clear your locally saved
              settings from this browser. Your Edni
              account will not be deleted.
            </p>

            <div className="modalButtons">
              <button
                className="cancelModal"
                onClick={() =>
                  setShowDeleteConfirm(false)
                }
              >
                Keep my settings
              </button>

              <button
                className="confirmDelete"
                onClick={handleDeleteAccount}
                disabled={saving}
              >
                {saving
                  ? "Clearing..."
                  : "Yes, clear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          PAGE CSS
      ====================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          margin-left: 250px;
          padding-top: 70px;

          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(236, 72, 153, 0.08),
              transparent 25%
            ),
            radial-gradient(
              circle at 90% 15%,
              rgba(108, 99, 255, 0.1),
              transparent 28%
            ),
            ${COLORS.background};

          color: ${COLORS.textPrimary};

          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          position: relative;
          overflow: hidden;
        }

        /* ======================================================
           HEADER
        ====================================================== */

        .header {
          background: linear-gradient(
            135deg,
            #6c63ff 0%,
            #806cf5 50%,
            #a855f7 100%
          );

          color: white;

          padding: 42px 30px 48px;

          position: relative;
          overflow: hidden;
        }

        .header::after {
          content: "";

          position: absolute;

          width: 280px;
          height: 280px;

          border-radius: 50%;

          background: rgba(
            255,
            255,
            255,
            0.08
          );

          right: -80px;
          top: -150px;
        }

        .header::before {
          content: "";

          position: absolute;

          width: 180px;
          height: 180px;

          border-radius: 50%;

          background: rgba(
            255,
            255,
            255,
            0.06
          );

          left: 42%;
          bottom: -130px;
        }

        .headerInner {
          max-width: 1180px;

          margin: auto;

          display: flex;
          align-items: center;
          justify-content: space-between;

          position: relative;
          z-index: 2;
        }

        .eyebrow {
          display: flex;
          align-items: center;

          gap: 8px;

          font-size: 11px;
          font-weight: 800;

          letter-spacing: 1.6px;

          opacity: 0.8;

          margin-bottom: 10px;
        }

        .header h1 {
          font-size: 38px;
          line-height: 1.1;

          margin: 0;

          font-weight: 800;

          letter-spacing: -1px;
        }

        .header p {
          margin: 10px 0 0;

          font-size: 15px;

          opacity: 0.88;
        }

        .settingsBubble {
          width: 78px;
          height: 78px;

          background: rgba(
            255,
            255,
            255,
            0.17
          );

          border: 1px solid
            rgba(255, 255, 255, 0.3);

          border-radius: 26px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 37px;

          transform: rotate(5deg);

          backdrop-filter: blur(10px);

          box-shadow:
            0 15px 35px
              rgba(39, 31, 105, 0.18);
        }

        /* ======================================================
           CONTAINER
        ====================================================== */

        .container {
          max-width: 1180px;

          margin: -20px auto 0;

          padding: 0 24px 50px;

          position: relative;

          z-index: 5;
        }

        /* ======================================================
           ALERTS
        ====================================================== */

        .alert {
          border-radius: 18px;

          padding: 14px 18px;

          margin-bottom: 18px;

          display: flex;
          align-items: center;

          gap: 12px;

          border: 1px solid;
        }

        .alert > span {
          font-size: 22px;
        }

        .alert div {
          flex: 1;
        }

        .alert strong {
          display: block;
          font-size: 13px;
        }

        .alert p {
          margin: 3px 0 0;
          font-size: 12px;
        }

        .alert button {
          border: 0;

          background: transparent;

          font-size: 22px;

          cursor: pointer;
        }

        .errorAlert {
          background: #fff5f5;

          color: ${COLORS.error};

          border-color: #ffd4d4;
        }

        .successAlert {
          background: #f0fdf8;

          color: ${COLORS.success};

          border-color: #c9f3df;
        }

        /* ======================================================
           LAYOUT
        ====================================================== */

        .layout {
          display: grid;

          grid-template-columns:
            270px minmax(0, 1fr);

          gap: 20px;

          align-items: start;
        }

        .navigation,
        .content {
          background: ${COLORS.card};

          border: 1px solid ${COLORS.border};

          border-radius: 26px;

          box-shadow:
            0 8px 30px
              rgba(45, 33, 66, 0.055);
        }

        /* ======================================================
           NAVIGATION
        ====================================================== */

        .navigation {
          padding: 20px;
        }

        .navTitle {
          display: flex;
          align-items: center;

          gap: 9px;

          font-size: 14px;
          font-weight: 800;

          margin-bottom: 14px;

          padding: 3px 7px;
        }

        .navTitle span {
          font-size: 20px;
        }

        .navList {
          display: flex;

          flex-direction: column;

          gap: 6px;
        }

        .navItem {
          width: 100%;

          display: flex;
          align-items: center;

          gap: 11px;

          padding: 12px 11px;

          border: 0;

          border-radius: 17px;

          background: transparent;

          color: ${COLORS.textSecondary};

          text-align: left;

          cursor: pointer;

          transition: 0.2s ease;
        }

        .navItem:hover {
          background: ${COLORS.softPurple};

          transform: translateX(2px);
        }

        .navItem.active {
          background: linear-gradient(
            135deg,
            #f0edff,
            #faf4ff
          );

          color: ${COLORS.primary};
        }

        .navIcon {
          width: 39px;
          height: 39px;

          border-radius: 13px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: white;

          box-shadow:
            0 3px 10px
              rgba(0, 0, 0, 0.05);

          font-size: 19px;

          flex-shrink: 0;
        }

        .navText {
          display: flex;

          flex-direction: column;

          gap: 2px;

          flex: 1;
        }

        .navText strong {
          font-size: 13px;
        }

        .navText small {
          font-size: 10px;

          color: ${COLORS.textMuted};
        }

        .arrow {
          font-size: 22px;

          font-weight: 400;
        }

        .littleCard {
          margin-top: 20px;

          padding: 16px;

          border-radius: 19px;

          background: linear-gradient(
            135deg,
            #fff3fa,
            #f2efff
          );

          border: 1px solid #f0e7f6;
        }

        .littleCardEmoji {
          font-size: 27px;

          margin-bottom: 8px;
        }

        .littleCard strong {
          font-size: 12px;

          display: block;
        }

        .littleCard p {
          font-size: 10px;

          line-height: 1.5;

          color: ${COLORS.textMuted};

          margin: 5px 0 0;
        }

        /* ======================================================
           CONTENT
        ====================================================== */

        .content {
          padding: 28px;

          min-height: 650px;
        }

        .tabContent {
          animation: appear 0.25s ease;
        }

        @keyframes appear {
          from {
            opacity: 0;
            transform: translateY(5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ======================================================
           SECTION HEADER
        ====================================================== */

        .sectionHeader {
          display: flex;

          align-items: flex-start;

          gap: 14px;

          margin-bottom: 26px;
        }

        .sectionEmoji {
          width: 49px;
          height: 49px;

          border-radius: 16px;

          background: ${COLORS.softPurple};

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 25px;

          flex-shrink: 0;
        }

        .sectionHeader h2 {
          font-size: 21px;

          margin: 2px 0 5px;

          letter-spacing: -0.4px;
        }

        .sectionHeader p {
          margin: 0;

          color: ${COLORS.textMuted};

          font-size: 12px;

          line-height: 1.5;
        }

        /* ======================================================
           NOTIFICATIONS
        ====================================================== */

        .settingList {
          display: flex;

          flex-direction: column;

          gap: 11px;
        }

        /* ======================================================
           LEARNING
        ====================================================== */

        .learningSection {
          display: flex;

          flex-direction: column;

          gap: 16px;
        }

        .preferenceCard,
        .choiceSection {
          padding: 20px;

          border: 1px solid ${COLORS.border};

          border-radius: 21px;

          background: #fff;
        }

        .preferenceTop {
          display: flex;

          justify-content: space-between;

          align-items: center;
        }

        .preferenceTop > div:first-child {
          display: flex;

          align-items: center;

          gap: 12px;
        }

        .miniEmoji {
          width: 43px;
          height: 43px;

          border-radius: 14px;

          background: ${COLORS.softOrange};

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 22px;
        }

        .preferenceCard h3,
        .choiceSection h3 {
          margin: 0 0 4px;

          font-size: 13px;
        }

        .preferenceCard p,
        .choiceSection p {
          margin: 0;

          color: ${COLORS.textMuted};

          font-size: 11px;
        }

        .goalValue {
          color: ${COLORS.primary};

          font-size: 27px;

          font-weight: 800;
        }

        .goalValue span {
          font-size: 14px;

          margin-left: 2px;
        }

        .range {
          width: 100%;

          margin-top: 20px;

          accent-color: ${COLORS.primary};

          cursor: pointer;
        }

        .rangeLabels {
          display: flex;

          justify-content: space-between;

          color: ${COLORS.textMuted};

          font-size: 9px;

          margin-top: 5px;
        }

        .choiceHeader {
          display: flex;

          align-items: center;

          gap: 10px;

          margin-bottom: 14px;
        }

        .choiceEmoji {
          font-size: 23px;
        }

        .choices {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 9px;
        }

        .choiceButton {
          padding: 13px 10px;

          border: 1px solid ${COLORS.border};

          background: white;

          border-radius: 16px;

          cursor: pointer;

          color: ${COLORS.textSecondary};

          font-size: 11px;

          font-weight: 700;

          transition: 0.2s;
        }

        .choiceButton:hover {
          border-color: #c9c2ef;

          background: #faf9ff;
        }

        .choiceButton.selected {
          color: ${COLORS.primary};

          background: ${COLORS.softPurple};

          border-color: #c7c0ff;
        }

        .choiceButton span {
          display: block;

          font-size: 21px;

          margin-bottom: 6px;
        }

        /* ======================================================
           DISPLAY
        ====================================================== */

        .displayGrid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 15px;
        }

        .displayCard {
          padding: 20px;

          border: 1px solid ${COLORS.border};

          border-radius: 21px;
        }

        .displayCard.fullWidth {
          grid-column: 1 / -1;
        }

        .displayIcon {
          width: 43px;
          height: 43px;

          background: ${COLORS.softPink};

          border-radius: 14px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 22px;

          margin-bottom: 12px;
        }

        .displayCard h3 {
          margin: 0 0 4px;

          font-size: 13px;
        }

        .displayCard p {
          color: ${COLORS.textMuted};

          font-size: 11px;

          margin: 0 0 14px;
        }

        .optionRow {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 8px;
        }

        .optionButton,
        .fontButton {
          padding: 11px;

          border: 1px solid ${COLORS.border};

          border-radius: 14px;

          background: white;

          cursor: pointer;

          color: ${COLORS.textSecondary};

          font-weight: 600;

          transition: 0.2s;
        }

        .optionButton.selected,
        .fontButton.selected {
          background: ${COLORS.softPurple};

          color: ${COLORS.primary};

          border-color: #c8c1ff;
        }

        .select {
          width: 100%;

          padding: 12px;

          border: 1px solid ${COLORS.border};

          border-radius: 14px;

          background: white;

          color: ${COLORS.textPrimary};

          outline: none;

          cursor: pointer;
        }

        .fontOptions {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 10px;
        }

        .fontButton {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 9px;
        }

        .letter {
          font-weight: 800;
        }

        .letter.small {
          font-size: 14px;
        }

        .letter.normal {
          font-size: 18px;
        }

        .letter.large {
          font-size: 23px;
        }

        /* ======================================================
           SECURITY
        ====================================================== */

        .securityList {
          display: flex;

          flex-direction: column;

          gap: 13px;
        }

        .actionCard,
        .dangerCard {
          padding: 19px;

          border-radius: 21px;

          border: 1px solid ${COLORS.border};

          display: flex;

          align-items: center;

          gap: 14px;
        }

        .actionIcon,
        .dangerEmoji {
          width: 46px;
          height: 46px;

          border-radius: 15px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 23px;

          flex-shrink: 0;
        }

        .actionInfo,
        .dangerInfo {
          display: flex;

          align-items: center;

          gap: 13px;

          flex: 1;
        }

        .actionInfo h3,
        .dangerInfo h3 {
          margin: 0 0 4px;

          font-size: 13px;
        }

        .actionInfo p,
        .dangerInfo p {
          margin: 0;

          color: ${COLORS.textMuted};

          font-size: 11px;
        }

        .actionButton,
        .deleteButton {
          padding: 10px 15px;

          border-radius: 13px;

          font-size: 11px;

          font-weight: 700;

          cursor: pointer;

          white-space: nowrap;

          transition: 0.2s;
        }

        .actionButton {
          background: ${COLORS.primary};

          color: white;

          border: 0;
        }

        .actionButton.outline {
          background: white;

          color: ${COLORS.primary};

          border: 1px solid ${COLORS.primary};
        }

        .actionButton:hover {
          transform: translateY(-1px);
        }

        .dangerCard {
          background: #fff8f8;

          border-color: #ffdede;
        }

        .dangerEmoji {
          background: #ffeaea;
        }

        .dangerInfo h3 {
          color: ${COLORS.error};
        }

        .deleteButton {
          border: 0;

          background: ${COLORS.error};

          color: white;
        }

        /* ======================================================
           PASSWORD
        ====================================================== */

        .passwordCard {
          padding: 21px;

          border-radius: 21px;

          border: 1px solid ${COLORS.border};

          background: #fcfbff;
        }

        .passwordHeader {
          display: flex;

          align-items: center;

          gap: 13px;

          margin-bottom: 18px;
        }

        .passwordEmoji {
          width: 46px;
          height: 46px;

          border-radius: 15px;

          background: ${COLORS.softPurple};

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 23px;
        }

        .passwordHeader h3 {
          margin: 0 0 4px;

          font-size: 14px;
        }

        .passwordHeader p {
          margin: 0;

          color: ${COLORS.textMuted};

          font-size: 11px;
        }

        .passwordForm {
          display: flex;

          flex-direction: column;

          gap: 10px;
        }

        .passwordForm input {
          padding: 13px 14px;

          border: 1px solid ${COLORS.border};

          border-radius: 14px;

          outline: none;

          font-size: 12px;

          color: ${COLORS.textPrimary};
        }

        .passwordForm input:focus {
          border-color: ${COLORS.primary};

          box-shadow:
            0 0 0 3px
              rgba(108, 99, 255, 0.08);
        }

        .formButtons {
          display: flex;

          gap: 9px;

          margin-top: 5px;
        }

        .primaryButton,
        .secondaryButton {
          flex: 1;

          padding: 12px;

          border-radius: 13px;

          cursor: pointer;

          font-weight: 700;

          font-size: 11px;
        }

        .primaryButton {
          background: ${COLORS.primary};

          color: white;

          border: 0;
        }

        .secondaryButton {
          background: white;

          color: ${COLORS.textSecondary};

          border: 1px solid ${COLORS.border};
        }

        /* ======================================================
           SAVE
        ====================================================== */

        .saveArea {
          margin-top: 26px;

          padding-top: 20px;

          border-top: 1px solid ${COLORS.border};

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;
        }

        .saveHint {
          display: flex;

          align-items: center;

          gap: 10px;
        }

        .saveHint > span {
          font-size: 22px;
        }

        .saveHint div {
          display: flex;

          flex-direction: column;

          gap: 2px;
        }

        .saveHint strong {
          font-size: 11px;
        }

        .saveHint small {
          font-size: 9px;

          color: ${COLORS.textMuted};
        }

        .saveButton {
          padding: 13px 22px;

          border: 0;

          border-radius: 15px;

          background: linear-gradient(
            135deg,
            ${COLORS.primary},
            ${COLORS.secondary}
          );

          color: white;

          font-size: 12px;

          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 8px 18px
              rgba(108, 99, 255, 0.2);

          transition: 0.2s;
        }

        .saveButton:hover {
          transform: translateY(-2px);
        }

        .saveButton:disabled {
          opacity: 0.6;

          cursor: not-allowed;

          transform: none;
        }

        /* ======================================================
           STICKERS
        ====================================================== */

        .sticker {
          position: absolute;

          z-index: 1;

          animation:
            floatSticker 4s ease-in-out infinite;

          pointer-events: none;
        }

        .stickerOne {
          right: 7%;

          top: 155px;

          font-size: 24px;
        }

        .stickerTwo {
          left: 4%;

          top: 330px;

          font-size: 20px;

          animation-delay: 1s;
        }

        .stickerThree {
          right: 3%;

          bottom: 150px;

          font-size: 22px;

          animation-delay: 2s;
        }

        @keyframes floatSticker {
          0%,
          100% {
            transform:
              translateY(0)
              rotate(0deg);
          }

          50% {
            transform:
              translateY(-8px)
              rotate(5deg);
          }
        }

        /* ======================================================
           MODAL
        ====================================================== */

        .modalOverlay {
          position: fixed;

          inset: 0;

          background: rgba(
            34,
            27,
            48,
            0.45
          );

          backdrop-filter: blur(5px);

          z-index: 1000;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 20px;
        }

        .modal {
          width: 100%;

          max-width: 410px;

          background: white;

          border-radius: 28px;

          padding: 30px;

          text-align: center;

          box-shadow:
            0 25px 80px
              rgba(0, 0, 0, 0.2);

          animation: modalIn 0.2s ease;
        }

        @keyframes modalIn {
          from {
            opacity: 0;

            transform: scale(0.96);
          }

          to {
            opacity: 1;

            transform: scale(1);
          }
        }

        .modalSticker {
          width: 70px;
          height: 70px;

          border-radius: 24px;

          background: ${COLORS.softPink};

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 35px;

          margin: 0 auto 17px;

          transform: rotate(-4deg);
        }

        .modal h2 {
          margin: 0;

          font-size: 21px;
        }

        .modal p {
          color: ${COLORS.textMuted};

          font-size: 12px;

          line-height: 1.6;

          margin: 10px 0 23px;
        }

        .modalButtons {
          display: flex;

          gap: 9px;
        }

        .cancelModal,
        .confirmDelete {
          flex: 1;

          padding: 12px;

          border-radius: 14px;

          font-size: 11px;

          font-weight: 700;

          cursor: pointer;
        }

        .cancelModal {
          border: 1px solid ${COLORS.border};

          background: white;

          color: ${COLORS.textSecondary};
        }

        .confirmDelete {
          border: 0;

          background: ${COLORS.error};

          color: white;
        }

        /* ======================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 1100px) {
          .page {
            margin-left: 220px;
          }

          .container {
            padding-left: 18px;
            padding-right: 18px;
          }

          .layout {
            grid-template-columns:
              240px minmax(0, 1fr);
          }
        }

        @media (max-width: 900px) {
          .page {
            margin-left: 0;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .navigation {
            padding: 15px;
          }

          .navList {
            display: grid;

            grid-template-columns:
              repeat(2, 1fr);
          }

          .littleCard {
            display: none;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding-top: 65px;
          }

          .header {
            padding: 32px 20px 42px;
          }

          .headerInner {
            align-items: flex-start;
          }

          .header h1 {
            font-size: 30px;
          }

          .header p {
            max-width: 260px;

            font-size: 12px;
          }

          .settingsBubble {
            width: 58px;
            height: 58px;

            font-size: 28px;

            border-radius: 20px;
          }

          .container {
            padding:
              0 13px 35px;
          }

          .content {
            padding:
              20px 15px;

            border-radius: 21px;
          }

          .navigation {
            border-radius: 21px;
          }

          .navList {
            grid-template-columns:
              1fr 1fr;
          }

          .navItem {
            padding:
              10px 8px;
          }

          .navText small {
            display: none;
          }

          .navIcon {
            width: 34px;
            height: 34px;

            font-size: 16px;
          }

          .arrow {
            display: none;
          }

          .choices {
            grid-template-columns: 1fr;
          }

          .choiceButton {
            display: flex;

            align-items: center;

            gap: 10px;

            text-align: left;
          }

          .choiceButton span {
            margin: 0;
          }

          .displayGrid {
            grid-template-columns: 1fr;
          }

          .displayCard.fullWidth {
            grid-column: auto;
          }

          .actionCard,
          .dangerCard {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .actionButton,
          .deleteButton {
            width: 100%;
          }

          .saveArea {
            align-items: stretch;

            flex-direction: column;
          }

          .saveButton {
            width: 100%;
          }

          .sticker {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .header h1 {
            font-size: 27px;
          }

          .navList {
            grid-template-columns: 1fr;
          }

          .optionRow,
          .fontOptions {
            grid-template-columns: 1fr;
          }

          .preferenceTop {
            align-items: flex-start;
          }

          .goalValue {
            font-size: 23px;
          }

          .sectionHeader {
            gap: 10px;
          }
        }
      `}</style>
    </>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="sectionHeader">
      <div className="sectionEmoji">
        {emoji}
      </div>

      <div>
        <h2>{title}</h2>

        <p>{description}</p>
      </div>

      <style jsx>{`
        .sectionHeader {
          display: flex;

          align-items: flex-start;

          gap: 14px;

          margin-bottom: 26px;
        }

        .sectionEmoji {
          width: 49px;
          height: 49px;

          border-radius: 16px;

          background: #f1eeff;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 25px;

          flex-shrink: 0;
        }

        h2 {
          font-size: 21px;

          margin: 2px 0 5px;

          color: #25213a;
        }

        p {
          margin: 0;

          color: #9a95a8;

          font-size: 12px;

          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   TOGGLE CARD
============================================================ */

function ToggleCard({
  emoji,
  title,
  description,
  value,
  onChange,
  color,
}: {
  emoji: string;
  title: string;
  description: string;
  value: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <div className="toggleCard">
      <div
        className="toggleEmoji"
        style={{
          background: color,
        }}
      >
        {emoji}
      </div>

      <div className="toggleInfo">
        <h3>{title}</h3>

        <p>{description}</p>
      </div>

      <button
        type="button"
        className={`switch ${value ? "on" : ""
          }`}
        onClick={onChange}
        aria-label={`Toggle ${title}`}
      >
        <span className="switchDot" />
      </button>

      <style jsx>{`
        .toggleCard {
          padding: 17px;

          border: 1px solid #e9e5f2;

          border-radius: 20px;

          display: flex;

          align-items: center;

          gap: 14px;

          transition: 0.2s ease;
        }

        .toggleCard:hover {
          transform: translateY(-1px);

          box-shadow:
            0 8px 20px
              rgba(45, 33, 66, 0.05);
        }

        .toggleEmoji {
          width: 45px;
          height: 45px;

          border-radius: 15px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 22px;

          flex-shrink: 0;
        }

        .toggleInfo {
          flex: 1;
        }

        .toggleInfo h3 {
          margin: 0 0 4px;

          font-size: 13px;

          color: #25213a;
        }

        .toggleInfo p {
          margin: 0;

          color: #9a95a8;

          font-size: 11px;
        }

        .switch {
          width: 48px;
          height: 27px;

          border: 0;

          border-radius: 20px;

          background: #dedbe5;

          padding: 3px;

          cursor: pointer;

          transition: 0.25s;

          flex-shrink: 0;
        }

        .switch.on {
          background: #6c63ff;
        }

        .switchDot {
          display: block;

          width: 21px;
          height: 21px;

          border-radius: 50%;

          background: white;

          box-shadow:
            0 2px 5px
              rgba(0, 0, 0, 0.14);

          transition: 0.25s;
        }

        .switch.on .switchDot {
          transform:
            translateX(21px);
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   CHOICE SECTION
============================================================ */

function ChoiceSection({
  title,
  emoji,
  description,
  options,
  value,
  onChange,
}: {
  title: string;
  emoji: string;
  description: string;
  options: {
    value: string;
    label: string;
    emoji: string;
  }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="choiceSection">
      <div className="choiceHeader">
        <span className="choiceEmoji">
          {emoji}
        </span>

        <div>
          <h3>{title}</h3>

          <p>{description}</p>
        </div>
      </div>

      <div className="choices">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`choiceButton ${value === option.value
                ? "selected"
                : ""
              }`}
            onClick={() =>
              onChange(option.value)
            }
          >
            <span>{option.emoji}</span>

            {option.label}
          </button>
        ))}
      </div>

      <style jsx>{`
        .choiceSection {
          padding: 20px;

          border: 1px solid #e9e5f2;

          border-radius: 21px;

          background: #fff;
        }

        .choiceHeader {
          display: flex;

          align-items: center;

          gap: 10px;

          margin-bottom: 14px;
        }

        .choiceEmoji {
          font-size: 23px;
        }

        h3 {
          margin: 0 0 4px;

          font-size: 13px;

          color: #25213a;
        }

        p {
          margin: 0;

          color: #9a95a8;

          font-size: 11px;
        }

        .choices {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 9px;
        }

        .choiceButton {
          padding: 13px 10px;

          border: 1px solid #e9e5f2;

          background: white;

          border-radius: 16px;

          cursor: pointer;

          color: #6f6a80;

          font-size: 11px;

          font-weight: 700;

          transition: 0.2s;
        }

        .choiceButton:hover {
          border-color: #c9c2ef;

          background: #faf9ff;
        }

        .choiceButton.selected {
          color: #6c63ff;

          background: #f1eeff;

          border-color: #c7c0ff;
        }

        .choiceButton span {
          display: block;

          font-size: 21px;

          margin-bottom: 6px;
        }

        @media (max-width: 650px) {
          .choices {
            grid-template-columns: 1fr;
          }

          .choiceButton {
            display: flex;

            align-items: center;

            gap: 10px;

            text-align: left;
          }

          .choiceButton span {
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   ACTION CARD
============================================================ */

function ActionCard({
  emoji,
  title,
  description,
  button,
  onClick,
  color,
  outline = false,
}: {
  emoji: string;
  title: string;
  description: string;
  button: string;
  onClick: () => void;
  color: string;
  outline?: boolean;
}) {
  return (
    <div className="actionCard">
      <div
        className="actionIcon"
        style={{
          background: color,
        }}
      >
        {emoji}
      </div>

      <div className="actionInfo">
        <div>
          <h3>{title}</h3>

          <p>{description}</p>
        </div>
      </div>

      <button
        className={`actionButton ${outline ? "outline" : ""
          }`}
        onClick={onClick}
      >
        {button}
      </button>

      <style jsx>{`
        .actionCard {
          padding: 19px;

          border-radius: 21px;

          border: 1px solid #e9e5f2;

          display: flex;

          align-items: center;

          gap: 14px;
        }

        .actionIcon {
          width: 46px;
          height: 46px;

          border-radius: 15px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 23px;

          flex-shrink: 0;
        }

        .actionInfo {
          flex: 1;
        }

        .actionInfo h3 {
          margin: 0 0 4px;

          font-size: 13px;

          color: #25213a;
        }

        .actionInfo p {
          margin: 0;

          color: #9a95a8;

          font-size: 11px;
        }

        .actionButton {
          padding: 10px 15px;

          border-radius: 13px;

          font-size: 11px;

          font-weight: 700;

          cursor: pointer;

          white-space: nowrap;

          background: #6c63ff;

          color: white;

          border: 0;
        }

        .actionButton.outline {
          background: white;

          color: #6c63ff;

          border: 1px solid #6c63ff;
        }

        @media (max-width: 650px) {
          .actionCard {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .actionButton {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}