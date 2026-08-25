"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  const NAV_ITEMS = [
    { id: "account", icon: "👤", label: "Account" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
    { id: "appearance", icon: "🎨", label: "Appearance" },
  ];

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "white",
      borderRight: "1px solid #F0F0F0",
      display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
    }}>
      <div style={{ padding: "22px 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "white", fontWeight: 800,
          }}>E</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#4F46E5" }}>Edni AI</div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {NAV_ITEMS.map((item) => {
          const on = active === item.id;
          return (
            <button key={item.id} onClick={() => setActive(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10, border: "none",
              background: on ? "#EEF2FF" : "transparent",
              color: on ? "#4F46E5" : "#6B7280",
              fontSize: 13.5, fontWeight: on ? 700 : 500,
              cursor: "pointer", width: "100%",
              borderLeft: on ? "3px solid #4F46E5" : "3px solid transparent",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 46, height: 26, borderRadius: 13, border: "none",
      background: value ? "#4F46E5" : "#E5E7EB",
      position: "relative", cursor: "pointer", transition: "background 0.25s", flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "white",
        position: "absolute", top: 3,
        left: value ? 23 : 3,
        transition: "left 0.25s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
      }} />
    </button>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function InputField({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{label}</label>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          padding: "10px 13px", border: `1.5px solid ${focused ? "#6C63FF" : "#E5E7EB"}`,
          borderRadius: 9, fontSize: 13.5, color: "#111827", outline: "none",
          boxShadow: focused ? "0 0 0 3px rgba(108,99,255,0.10)" : "none",
          transition: "all 0.2s",
        }}
      />
    </div>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "18px 0", borderBottom: "1px solid #F0F0F0",
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: desc ? 3 : 0 }}>{label}</div>
        {desc && <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, border: "1.5px solid #E5E7EB",
      marginBottom: 20, padding: "24px", overflow: "hidden",
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Account Panel ────────────────────────────────────────────────────────────
function AccountPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInst] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.get("/auth/me")
      .then((res) => {
        setName(`${res.data.first_name} ${res.data.last_name}`);
        setEmail(res.data.email);
        setInst(res.data.institution || "");
      })
      .catch(() => { });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const [firstName, ...rest] = name.trim().split(" ");
      await apiClient.put("/auth/me", {
        first_name: firstName,
        last_name: rest.join(" "),
        institution,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="Personal Information">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <InputField label="Full Name" value={name} onChange={setName} />
          <InputField label="Email" value={email} onChange={setEmail} type="email" />
        </div>
        <InputField label="Institution" value={institution} onChange={setInst} />
        {error && <p style={{ fontSize: 12.5, color: "#EF4444", margin: "10px 0 0" }}>{error}</p>}
        {success && <p style={{ fontSize: 12.5, color: "#059669", margin: "10px 0 0" }}>✓ Saved!</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            marginTop: 16, padding: "10px 24px", borderRadius: 10,
            border: "none", background: success ? "#10B981" : "linear-gradient(135deg,#6C63FF,#4F46E5)",
            color: "white", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : success ? "✓ Saved" : "Save Changes"}
        </button>
      </SectionCard>
    </>
  );
}

// ─── Notifications Panel ───────────────────────────────────────────────────────
function NotificationsPanel() {
  const [settings, setSettings] = useState({
    studyReminders: true,
    weeklyReport: true,
    achievementAlerts: true,
    pushNotifs: true,
    emailDigest: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <SectionCard title="Learning Alerts">
        <SettingRow label="Study Reminders" desc="Daily nudges to keep your study streak alive.">
          <Toggle value={settings.studyReminders} onChange={() => toggle("studyReminders")} />
        </SettingRow>
        <SettingRow label="Weekly Progress Report" desc="Summary of your achievements every Monday.">
          <Toggle value={settings.weeklyReport} onChange={() => toggle("weeklyReport")} />
        </SettingRow>
        <SettingRow label="Achievement Alerts" desc="Get notified when you unlock a new badge.">
          <Toggle value={settings.achievementAlerts} onChange={() => toggle("achievementAlerts")} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Delivery Channels">
        <SettingRow label="Push Notifications" desc="In-app and browser push alerts.">
          <Toggle value={settings.pushNotifs} onChange={() => toggle("pushNotifs")} />
        </SettingRow>
        <SettingRow label="Email Digest" desc="Receive a daily summary by email.">
          <Toggle value={settings.emailDigest} onChange={() => toggle("emailDigest")} />
        </SettingRow>
      </SectionCard>
    </>
  );
}

// ─── Appearance Panel ──────────────────────────────────────────────────────────
function AppearancePanel() {
  const [theme, setTheme] = useState("Light");
  const [accent, setAccent] = useState("#4F46E5");

  const accents = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <>
      <SectionCard title="Theme">
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {["Light", "Dark", "System"].map((t) => (
            <button key={t} onClick={() => setTheme(t)} style={{
              flex: 1, padding: "16px 12px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${theme === t ? "#4F46E5" : "#E5E7EB"}`,
              background: theme === t ? "#EEF2FF" : "#F9FAFB",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 24 }}>{t === "Light" ? "☀️" : t === "Dark" ? "🌙" : "💻"}</span>
              <span style={{ fontSize: 13, fontWeight: theme === t ? 700 : 500, color: theme === t ? "#4F46E5" : "#6B7280" }}>{t}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Accent Color">
        <div style={{ display: "flex", gap: 12 }}>
          {accents.map((c) => (
            <button key={c} onClick={() => setAccent(c)} style={{
              width: 40, height: 40, borderRadius: "50%", border: "none",
              background: c, cursor: "pointer",
              boxShadow: accent === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : "none",
            }} />
          ))}
        </div>
      </SectionCard>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("account");

  useEffect(() => {
    if (!localStorage.getItem("edni_access")) {
      router.push("/login");
    }
  }, [router]);

  const panels: Record<string, React.ReactNode> = {
    account: <AccountPanel />,
    notifications: <NotificationsPanel />,
    appearance: <AppearancePanel />,
  };

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: "#F7F8FC", minHeight: "100vh", display: "flex" }}>
      <Sidebar active={tab} setActive={setTab} />

      <main style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 32px", height: 64, borderBottom: "1px solid #F0F0F0",
          background: "white", position: "sticky", top: 0, zIndex: 30,
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Settings</h1>
          <div style={{ marginLeft: "auto" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800 }}>
              A
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "32px" }}>
          <div style={{ maxWidth: 700 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 20px 0" }}>
              {tab === "account" ? "Account" : tab === "notifications" ? "Notifications" : "Appearance"}
            </h2>
            <div key={tab} style={{ animation: "fadeUp 0.25s ease" }}>
              {panels[tab]}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 32px", borderTop: "1px solid #F0F0F0",
          background: "white", textAlign: "center",
        }}>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>© 2024 Edni AI Academy</span>
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}