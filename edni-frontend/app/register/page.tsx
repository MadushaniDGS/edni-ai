"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonalData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AcademicData {
  institution: string;
  level: string;
  degree: string;
  year_of_study: string;
  gpa: string;
}

interface PreferencesData {
  learningStyle: string[];
  studyHoursPerDay: string;
  goals: string[];
  notifications: boolean;
}

const STEPS = [
  { number: 1, label: "Personal" },
  { number: 2, label: "Academic" },
  { number: 3, label: "Preferences" },
];

const LEARNING_STYLES = [
  { id: "visual", label: "🎨 Visual", desc: "Diagrams & charts" },
  { id: "reading", label: "📖 Reading", desc: "Text & notes" },
  { id: "practice", label: "✏️ Practice", desc: "Problems & quizzes" },
  { id: "audio", label: "🎧 Audio", desc: "Lectures & podcasts" },
];

const GOALS = [
  { id: "grades", label: "📈 Improve Grades" },
  { id: "exam", label: "📝 Exam Preparation" },
  { id: "career", label: "💼 Career Readiness" },
  { id: "research", label: "🔬 Research Skills" },
  { id: "mastery", label: "🧠 Deep Mastery" },
  { id: "speed", label: "⚡ Study Efficiency" },
];

const STUDY_HOURS = ["1–2 hrs", "2–4 hrs", "4–6 hrs", "6+ hrs"];

const LEVELS = ["High School", "Undergraduate", "Postgraduate", "PhD", "Professional"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year+"];

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 0 }}>
      {STEPS.map((step, i) => {
        const done = current > step.number;
        const active = current === step.number;
        return (
          <div key={step.number} style={{ display: "flex", alignItems: "flex-start", flex: 1, position: "relative" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, zIndex: 2 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: done
                    ? "linear-gradient(135deg,#6C63FF,#4F46E5)"
                    : active
                      ? "linear-gradient(135deg,#6C63FF,#4F46E5)"
                      : "#E5E7EB",
                  color: done || active ? "white" : "#9CA3AF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: done ? 16 : 14,
                  fontWeight: 700,
                  boxShadow: active ? "0 4px 16px rgba(108,99,255,0.38)" : "none",
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : step.number}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#4F46E5" : done ? "#4F46E5" : "#9CA3AF",
                  transition: "color 0.3s",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: "calc(50% + 20px)",
                  right: "calc(-50% - 20px)",
                  height: 2,
                  background: done ? "linear-gradient(90deg,#6C63FF,#C7D2FE)" : "#E5E7EB",
                  borderRadius: 1,
                  transition: "background 0.4s ease",
                  zIndex: 1,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared Inputs ─────────────────────────────────────────────────────────────
function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: "11px 14px",
          border: `1.5px solid ${focused ? "#6C63FF" : "#E5E7EB"}`,
          borderRadius: 10,
          fontSize: 14,
          color: "#111827",
          outline: "none",
          background: "white",
          transition: "border-color 0.2s",
          boxShadow: focused ? "0 0 0 3px rgba(108,99,255,0.10)" : "none",
        }}
      />
    </div>
  );
}

function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          padding: "11px 14px",
          border: `1.5px solid ${focused ? "#6C63FF" : "#E5E7EB"}`,
          borderRadius: 10,
          fontSize: 14,
          color: value ? "#111827" : "#9CA3AF",
          outline: "none",
          background: "white",
          transition: "border-color 0.2s",
          boxShadow: focused ? "0 0 0 3px rgba(108,99,255,0.10)" : "none",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Step 1: Personal ────────────────────────────────────────────────────────
function StepPersonal({
  data,
  onChange,
}: {
  data: PersonalData;
  onChange: (d: PersonalData) => void;
}) {
  const set = (k: keyof PersonalData) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px 0", letterSpacing: "-0.4px" }}>
          Personal Information
        </h2>
        <p style={{ fontSize: 13.5, color: "#9CA3AF", margin: 0 }}>
          Tell us a bit about yourself to get started.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label="First Name" placeholder="DGS" value={data.firstName} onChange={set("firstName")} />
        <Input label="Last Name" placeholder="Madushani" value={data.lastName} onChange={set("lastName")} />
      </div>
      <Input label="Email Address" type="email" placeholder="you@example.com" value={data.email} onChange={set("email")} />
      <Input label="Password" type="password" placeholder="Min. 8 characters" value={data.password} onChange={set("password")} />
      <Input label="Confirm Password" type="password" placeholder="Repeat password" value={data.confirmPassword} onChange={set("confirmPassword")} />

      {/* Password strength */}
      {data.password.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[1, 2, 3, 4].map((lvl) => {
              const strength = Math.min(4, Math.floor(data.password.length / 3));
              const colors = ["#EF4444", "#F59E0B", "#10B981", "#4F46E5"];
              return (
                <div
                  key={lvl}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: lvl <= strength ? colors[strength - 1] : "#E5E7EB",
                    transition: "background 0.3s",
                  }}
                />
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
            {data.password.length < 4
              ? "Weak password"
              : data.password.length < 8
                ? "Fair password"
                : data.password.length < 12
                  ? "Strong password"
                  : "Very strong password"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Academic ────────────────────────────────────────────────────────
function StepAcademic({
  data,
  onChange,
}: {
  data: AcademicData;
  onChange: (d: AcademicData) => void;
}) {
  const set = (k: keyof AcademicData) => (v: string) => onChange({ ...data, [k]: v });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px 0", letterSpacing: "-0.4px" }}>
          Academic Background
        </h2>
        <p style={{ fontSize: 13.5, color: "#9CA3AF", margin: 0 }}>
          Help us tailor your learning path.
        </p>
      </div>

      <Input label="Institution Name" placeholder="e.g. NSBM Green University" value={data.institution} onChange={set("institution")} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Select label="Academic Level" options={LEVELS} value={data.level} onChange={set("level")} />
        <Select label="Year of Study" options={YEARS} value={data.year_of_study} onChange={set("year_of_study")} />
      </div>

      <Input label="Degree / Field of Study" placeholder="e.g. Software Engineering" value={data.degree} onChange={set("degree")} />

      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
          Current GPA / Grade
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {["Below 2.0", "2.0 – 2.9", "3.0 – 3.4", "3.5 – 4.0"].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set("gpa")(g)}
              style={{
                flex: 1,
                padding: "9px 4px",
                borderRadius: 8,
                border: `1.5px solid ${data.gpa === g ? "#6C63FF" : "#E5E7EB"}`,
                background: data.gpa === g ? "#EEF2FF" : "white",
                color: data.gpa === g ? "#4F46E5" : "#6B7280",
                fontSize: 12,
                fontWeight: data.gpa === g ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Preferences ─────────────────────────────────────────────────────
function StepPreferences({
  data,
  onChange,
}: {
  data: PreferencesData;
  onChange: (d: PreferencesData) => void;
}) {
  const toggleStyle = (id: string) => {
    const next = data.learningStyle.includes(id)
      ? data.learningStyle.filter((s) => s !== id)
      : [...data.learningStyle, id];
    onChange({ ...data, learningStyle: next });
  };

  const toggleGoal = (id: string) => {
    const next = data.goals.includes(id)
      ? data.goals.filter((g) => g !== id)
      : [...data.goals, id];
    onChange({ ...data, goals: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px 0", letterSpacing: "-0.4px" }}>
          Your Preferences
        </h2>
        <p style={{ fontSize: 13.5, color: "#9CA3AF", margin: 0 }}>
          Personalise your AI learning experience.
        </p>
      </div>

      {/* Learning Style */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>
          Preferred Learning Style <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(select all that apply)</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {LEARNING_STYLES.map((s) => {
            const active = data.learningStyle.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStyle(s.id)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${active ? "#6C63FF" : "#E5E7EB"}`,
                  background: active ? "#EEF2FF" : "white",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: active ? "#4F46E5" : "#111827" }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Study Hours */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>
          Daily Study Hours
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          {STUDY_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onChange({ ...data, studyHoursPerDay: h })}
              style={{
                flex: 1,
                padding: "10px 6px",
                borderRadius: 8,
                border: `1.5px solid ${data.studyHoursPerDay === h ? "#6C63FF" : "#E5E7EB"}`,
                background: data.studyHoursPerDay === h ? "#EEF2FF" : "white",
                color: data.studyHoursPerDay === h ? "#4F46E5" : "#6B7280",
                fontSize: 12,
                fontWeight: data.studyHoursPerDay === h ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>
          Academic Goals <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(pick your top priorities)</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {GOALS.map((g) => {
            const active = data.goals.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGoal(g.id)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1.5px solid ${active ? "#6C63FF" : "#E5E7EB"}`,
                  background: active ? "#EEF2FF" : "white",
                  color: active ? "#4F46E5" : "#374151",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "center",
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          background: "#F9FAFB",
          borderRadius: 10,
          border: "1.5px solid #E5E7EB",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Study Reminders</div>
          <div style={{ fontSize: 12, color: "#9CA3AF" }}>Get daily nudges to stay on track</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...data, notifications: !data.notifications })}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: data.notifications ? "#6C63FF" : "#E5E7EB",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.3s",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "white",
              position: "absolute",
              top: 3,
              left: data.notifications ? 23 : 3,
              transition: "left 0.3s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ name, onGo }: { name: string; onGo: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "40px 0",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          boxShadow: "0 8px 32px rgba(108,99,255,0.35)",
          animation: "pop 0.4s ease",
        }}
      >
        ✓
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>
        Welcome aboard{name ? `, ${name}` : ""}! 🎉
      </h2>
      <p style={{ fontSize: 14, color: "#9CA3AF", maxWidth: 320, margin: 0, lineHeight: 1.6 }}>
        Your intelligent learning environment is ready. Let&apos;s start mapping your path to mastery.
      </p>
      <button
        onClick={onGo}
        style={{
          marginTop: 12,
          padding: "13px 36px",
          background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(108,99,255,0.35)",
        }}
      >
        Go to Dashboard →
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [personal, setPersonal] = useState<PersonalData>({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  });
  const [academic, setAcademic] = useState<AcademicData>({
    institution: "", level: "", degree: "", year_of_study: "", gpa: "",
  });
  const [prefs, setPrefs] = useState<PreferencesData>({
    learningStyle: [], studyHoursPerDay: "", goals: [], notifications: true,
  });

  const canProceed = () => {
    if (step === 1)
      return (
        personal.firstName &&
        personal.lastName &&
        personal.email &&
        personal.password.length >= 8 &&
        personal.password === personal.confirmPassword
      );
    if (step === 2) return academic.institution && academic.degree;
    if (step === 3) return prefs.learningStyle.length > 0 && prefs.goals.length > 0;
    return true;
  };

  const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

  const handleNext = async () => {
    if (step < 3) { setStep((s) => s + 1); return; }

    // Step 3 — Submit payload strictly matching request schema
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: personal.firstName,
          last_name: personal.lastName,
          email: personal.email,
          password: personal.password,
          institution: academic.institution ?? "",
          degree: academic.degree ?? "",
          year_of_study: academic.year_of_study ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Registration failed. Please try again."); return; }

      // Store auth tokens & session details
      if (data.access_token) localStorage.setItem("edni_access", data.access_token);
      if (data.refresh_token) localStorage.setItem("edni_refresh", data.refresh_token);
      if (data.user) localStorage.setItem("edni_user", JSON.stringify(data.user));

      setDone(true);
    } catch {
      setError("Cannot connect to server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 40%, #FDF2F8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          borderRadius: 24,
          boxShadow: "0 24px 80px rgba(108,99,255,0.10), 0 4px 16px rgba(0,0,0,0.06)",
          border: "1px solid rgba(255,255,255,0.8)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "40px 44px 44px" }}>
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  color: "white",
                  fontWeight: 800,
                }}
              >
                E
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.3px" }}>
                Edni AI
              </span>
            </div>
          </div>

          {!done && (
            <>
              <p style={{ textAlign: "center", fontSize: 14, color: "#9CA3AF", margin: "0 0 24px 0" }}>
                Set up your intelligent learning environment.
              </p>
              <StepIndicator current={step} />
            </>
          )}

          {/* Display API Error Messages */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                marginBottom: 20,
                borderRadius: 10,
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Step content */}
          <div
            key={step}
            style={{
              animation: "slideIn 0.3s ease",
            }}
          >
            {done ? (
              <SuccessScreen name={personal.firstName} onGo={() => router.push("/dashboard")} />
            ) : step === 1 ? (
              <StepPersonal data={personal} onChange={setPersonal} />
            ) : step === 2 ? (
              <StepAcademic data={academic} onChange={setAcademic} />
            ) : (
              <StepPreferences data={prefs} onChange={setPrefs} />
            )}
          </div>

          {/* Navigation */}
          {!done && (
            <div
              style={{
                display: "flex",
                justifyContent: step > 1 ? "space-between" : "flex-end",
                alignItems: "center",
                marginTop: 32,
              }}
            >
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  style={{
                    padding: "11px 24px",
                    background: "transparent",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#374151",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                >
                  ← Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || loading}
                style={{
                  padding: "11px 28px",
                  background: canProceed() && !loading
                    ? "linear-gradient(135deg,#6C63FF,#4F46E5)"
                    : "#E5E7EB",
                  color: canProceed() && !loading ? "white" : "#9CA3AF",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: canProceed() && !loading ? "pointer" : "not-allowed",
                  boxShadow: canProceed() && !loading ? "0 4px 16px rgba(108,99,255,0.30)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {loading ? "Submitting..." : step === 3 ? "Complete Setup ✓" : "Continue →"}
              </button>
            </div>
          )}

          {/* Sign-in link */}
          {!done && step === 1 && (
            <p style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginTop: 20, marginBottom: 0 }}>
              Already have an account?{" "}
              <a href="/login" style={{ color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>
                Log in
              </a>
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pop {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}