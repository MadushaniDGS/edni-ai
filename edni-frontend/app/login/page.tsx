"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "forgot";

function Orb({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{
      position: "absolute", borderRadius: "50%",
      filter: "blur(60px)", pointerEvents: "none", ...style,
    }} />
  );
}

function SocialBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, padding: "10px 16px",
        border: `1.5px solid ${hov ? "#6C63FF" : "#E5E7EB"}`,
        borderRadius: 10, background: hov ? "#EEF2FF" : "white",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: "pointer", transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: hov ? "#4F46E5" : "#374151" }}>{label}</span>
    </button>
  );
}

function Input({
  label, type = "text", placeholder, value, onChange,
  icon, right,
}: {
  label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
  icon?: string; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        border: `1.5px solid ${focused ? "#6C63FF" : "#E5E7EB"}`,
        borderRadius: 10, background: "white",
        boxShadow: focused ? "0 0 0 3px rgba(108,99,255,0.10)" : "none",
        transition: "all 0.2s", overflow: "hidden",
      }}>
        {icon && (
          <span style={{ padding: "0 12px", fontSize: 16, color: focused ? "#6C63FF" : "#9CA3AF", transition: "color 0.2s" }}>
            {icon}
          </span>
        )}
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, padding: icon ? "11px 0" : "11px 14px",
            border: "none", outline: "none",
            fontSize: 14, color: "#111827", background: "transparent",
            fontFamily: "inherit",
          }}
        />
        {right && <div style={{ paddingRight: 12 }}>{right}</div>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsGuest } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const validate = () => {
    if (!email.trim()) { setError("Please enter your email address."); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return false; }
    if (mode === "login" && !password) { setError("Please enter your password."); return false; }
    return true;
  };

  const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

  const handleLogin = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (data.access_token) localStorage.setItem("edni_access", data.access_token);
      if (data.refresh_token) localStorage.setItem("edni_refresh", data.refresh_token);

      const userPayload = {
        id: data.user?.id ?? "usr_default",
        firstName: data.user?.first_name ?? data.user?.firstName ?? email.split("@")[0],
        lastName: data.user?.last_name ?? data.user?.lastName ?? "",
        email: data.user?.email ?? email,
        institution: data.user?.institution ?? "University",
        degree: data.user?.degree ?? "Computer Science",
        yearOfStudy: data.user?.year_of_study ?? "Year 1",
        gpa: data.user?.gpa ?? 3.8,
        semester: data.user?.semester ?? "Fall Semester",
      };

      // 1. Auth context update
      await login(userPayload);

      // 2. Explicit Redirect Trigger
      router.push("/dashboard");

    } catch {
      setError("Cannot connect to server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("edni_access", "demo_guest_token_123");
    loginAsGuest();
    router.push("/dashboard"); // Added guest redirect
  };

  const handleForgot = async () => {
    setError("");
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email to reset your password."); return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); setResetSent(true); }, 800);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") mode === "login" ? handleLogin() : handleForgot();
  };

  return (
    <div
      onKeyDown={handleKey}
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
        background: "linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 40%,#FDF2F8 100%)",
        position: "relative", overflow: "hidden",
        padding: "20px",
      }}
    >
      <Orb style={{ width: 500, height: 500, top: -120, left: -100, background: "rgba(108,99,255,0.12)" }} />
      <Orb style={{ width: 400, height: 400, bottom: -80, right: -80, background: "rgba(139,92,246,0.10)" }} />
      <Orb style={{ width: 300, height: 300, top: "40%", left: "30%", background: "rgba(16,185,129,0.06)" }} />

      <div style={{
        width: "100%", maxWidth: 420, padding: "48px", position: "relative",
        background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.80)",
        borderRadius: 16,
        boxShadow: "0 8px 40px rgba(108,99,255,0.06)",
      }}>
        <div
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, cursor: "pointer" }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "white", fontWeight: 800,
            boxShadow: "0 4px 14px rgba(108,99,255,0.35)",
          }}>E</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.4px" }}>Edni AI</span>
        </div>

        {mode === "forgot" ? (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <button
              onClick={() => { setMode("login"); setResetSent(false); setError(""); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "#6B7280", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5, marginBottom: 28, padding: 0,
              }}
            >← Back to login</button>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
              Reset password
            </h2>
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 28px 0", lineHeight: 1.6 }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {resetSent ? (
              <div style={{
                padding: "20px", borderRadius: 12, textAlign: "center",
                background: "#ECFDF5", border: "1.5px solid #6EE7B7",
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📧</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#065F46", marginBottom: 6 }}>Check your inbox!</div>
                <div style={{ fontSize: 13, color: "#047857" }}>
                  We sent a reset link to <strong>{email}</strong>
                </div>
                <button
                  onClick={() => { setMode("login"); setResetSent(false); }}
                  style={{
                    marginTop: 16, padding: "9px 24px",
                    border: "none", borderRadius: 9,
                    background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
                    color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >Back to Login</button>
              </div>
            ) : (
              <>
                <Input label="Email Address" type="email" placeholder="you@university.edu"
                  value={email} onChange={setEmail} icon="✉️" />
                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: 9, background: "#FEF2F2", border: "1px solid #FECACA", marginTop: 12 }}>
                    <span style={{ fontSize: 12.5, color: "#EF4444" }}>⚠ {error}</span>
                  </div>
                )}
                <button onClick={handleForgot} disabled={loading} style={{
                  width: "100%", marginTop: 20, padding: "13px",
                  border: "none", borderRadius: 10,
                  background: loading ? "#818CF8" : "linear-gradient(135deg,#6C63FF,#4F46E5)",
                  color: "white", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(108,99,255,0.30)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  {loading
                    ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>✦</span> Sending…</>
                    : "Send Reset Link →"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 6px 0", letterSpacing: "-0.6px" }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
                Don&apos;t have an account?{" "}
                <span
                  onClick={() => router.push("/register")}
                  style={{ color: "#4F46E5", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                >Sign up free</span>
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
              <SocialBtn icon="🔵" label="Google" onClick={handleGuestLogin} />
              <SocialBtn icon="⚫" label="GitHub" onClick={handleGuestLogin} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 9, marginBottom: 16,
                background: "#FEF2F2", border: "1.5px solid #FECACA",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 12.5, color: "#EF4444" }}>{error}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Input
                label="Email Address" type="email"
                placeholder="you@university.edu"
                value={email} onChange={(v) => { setEmail(v); setError(""); }}
                icon="✉️"
              />
              <Input
                label="Password" type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password} onChange={(v) => { setPassword(v); setError(""); }}
                icon="🔒"
                right={
                  <button
                    onClick={() => setShowPass((v) => !v)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#9CA3AF", padding: 0 }}
                  >{showPass ? "Hide" : "Show"}</button>
                }
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox" checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ accentColor: "#4F46E5", width: 15, height: 15 }}
                />
                <span style={{ fontSize: 13, color: "#374151" }}>Remember me</span>
              </label>
              <button
                onClick={() => { setMode("forgot"); setError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4F46E5", padding: 0 }}
              >Forgot password?</button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%", marginTop: 24, padding: "13px",
                border: "none", borderRadius: 10,
                background: loading ? "#818CF8" : "linear-gradient(135deg,#6C63FF,#4F46E5)",
                color: "white", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(108,99,255,0.32)",
                transition: "opacity 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.92"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {loading
                ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>✦</span> Signing in…</>
                : "Sign In →"}
            </button>

            <button
              onClick={handleGuestLogin}
              style={{
                width: "100%", marginTop: 10, padding: "12px",
                border: "1.5px solid #E5E7EB", borderRadius: 10,
                background: "transparent", color: "#6B7280",
                fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6C63FF"; e.currentTarget.style.color = "#4F46E5"; e.currentTarget.style.background = "#EEF2FF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#6B7280"; e.currentTarget.style.background = "transparent"; }}
            >
              👀 Continue as Guest (Demo)
            </button>

            <p style={{ textAlign: "center", fontSize: 11.5, color: "#9CA3AF", marginTop: 20, lineHeight: 1.6 }}>
              By signing in you agree to our{" "}
              <a href="#" style={{ color: "#4F46E5", textDecoration: "none" }}>Terms of Service</a>
              {" "}and{" "}
              <a href="#" style={{ color: "#4F46E5", textDecoration: "none" }}>Privacy Policy</a>.
            </p>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}