"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  const NAV_ITEMS = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "profile", icon: "👤", label: "Profile" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <aside
      style={{
        width: 240, minHeight: "100vh", background: "white",
        borderRight: "1px solid #F0F0F0",
        display: "flex", flexDirection: "column",
        position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
        padding: "24px 0",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "0 20px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: "white", fontWeight: 800,
          }}>E</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#4F46E5" }}>Edni AI</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10, border: "none", width: "100%",
                background: isActive ? "#EEF2FF" : "transparent",
                color: isActive ? "#4F46E5" : "#6B7280",
                fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
                borderLeft: isActive ? "3px solid #4F46E5" : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const [active, setActive] = useState("profile");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("edni_access");
    if (!token) {
      router.push("/login");
      return;
    }

    apiClient.get("/auth/me")
      .then((res) => {
        setUser(res.data);
        setName(`${res.data.first_name} ${res.data.last_name}`);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load user:", err);
        setError("Failed to load profile");
        setLoading(false);
      });
  }, [router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [firstName, ...rest] = name.trim().split(" ");
      const res = await apiClient.put("/auth/me", {
        first_name: firstName || user.first_name,
        last_name: rest.join(" ") || user.last_name,
      });
      setUser(res.data);
      setEditing(false);
    } catch (err) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: 18, color: "#6B7280" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: "#F7F8FC", minHeight: "100vh", display: "flex" }}>
      <Sidebar active={active} setActive={setActive} />

      <main style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 36px", height: 68, borderBottom: "1px solid #F0F0F0",
          background: "white", position: "sticky", top: 0, zIndex: 30,
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Profile</h1>
          <div style={{ marginLeft: "auto" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800 }}>
              {user?.first_name?.[0]}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "36px" }}>
          {error && (
            <div style={{ padding: "12px 16px", marginBottom: 20, borderRadius: 10, background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ maxWidth: 600, background: "white", borderRadius: 16, border: "1.5px solid #E5E7EB", padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Personal Information</h2>
              <button
                onClick={() => editing ? handleSave() : setEditing(true)}
                disabled={saving}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "1.5px solid #E5E7EB", background: "white",
                  color: "#374151", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? "Saving..." : editing ? "Save" : "Edit"}
              </button>
            </div>

            {user && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Full Name</label>
                  {editing ? (
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 12px", borderRadius: 8,
                        border: "1.5px solid #6C63FF", fontSize: 14, outline: "none",
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{name}</div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>{user.email}</div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Institution</label>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>{user.institution || "N/A"}</div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Degree</label>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>{user.degree || "N/A"}</div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Year of Study</label>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>{user.year_of_study || "N/A"}</div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>GPA</label>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#111827" }}>{user.gpa || "N/A"}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "18px 36px", borderTop: "1px solid #F0F0F0", background: "white", textAlign: "center" }}>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>© 2024 Edni AI Academy</span>
        </div>
      </main>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}