"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface PersonalData {
  firstName: string;
  lastName: string;
  email: string;
}

const SIDEBAR_ITEMS = [
  { id: "dashboard", icon: "⊞", label: "Dashboard", path: "/dashboard" },
  { id: "Questions ", icon: "📊", label: "Take Questions", path: "/diagnostic" },
  { id: "knowledge-map", icon: "🗺️", label: "Knowledge Map", path: "/knowledge-profile" },
  { id: "study-plan", icon: "📅", label: "Study Plan", path: "/study-planner" },
  { id: "resources", icon: "📚", label: "Learning Resources", path: "/learning-resources" },
  { id: "progress", icon: "📈", label: "Progress", path: "/analytics" },
  { id: "mentor", icon: "🤖", label: "AI Mentor", path: "/mentor" },

];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [user, setUser] = useState<{ firstName: string; email: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const storedUserRaw = localStorage.getItem("edni_user");
      if (storedUserRaw) {
        const parsed: PersonalData = JSON.parse(storedUserRaw);
        setUser({
          firstName: parsed.firstName || "User",
          email: parsed.email || "",
        });
      } else {
        setUser({ firstName: "User", email: "" });
      }
    } catch {
      setUser({ firstName: "User", email: "" });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("edni_access");
    localStorage.removeItem("edni_refresh");
    localStorage.removeItem("edni_user");
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside
      style={{
        width: 240,
        height: "100vh",
        background: "white",
        borderRight: "1px solid #E5E7EB",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
      }}
    >
      {/* Logo Header Section */}
      <div
        onClick={() => router.push("/dashboard")}
        style={{
          padding: "20px 16px",
          cursor: "pointer",
          borderBottom: "1px solid #E5E7EB",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <Image
              src="/icon.png"
              alt="Edni AI Logo"
              width={36}
              height={36}
              style={{ objectFit: "contain" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#4F46E5",
                letterSpacing: "-0.3px",
              }}
            >
              Edni AI
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>
              Academic Excellence
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav
        style={{
          flex: 1,
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflowY: "auto",
        }}
      >
        {SIDEBAR_ITEMS.map((item) => {
          const isItemActive = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: isItemActive ? "#EEF2FF" : "transparent",
                color: isItemActive ? "#4F46E5" : "#6B7280",
                fontSize: 13,
                fontWeight: isItemActive ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
                borderLeft: isItemActive ? "3px solid #4F46E5" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isItemActive) e.currentTarget.style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                if (!isItemActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 }}>
                {item.icon}
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Dynamic Profile Section */}
      <div
        ref={profileRef}
        style={{
          padding: "10px",
          borderTop: "1px solid #E5E7EB",
          position: "relative",
          flexShrink: 0,
          background: "white",
        }}
      >
        {profileDropdown && (
          <div
            style={{
              position: "absolute",
              left: "calc(100% + 8px)",
              bottom: 10,
              width: 180,
              display: "flex",
              flexDirection: "column",
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: "white",
              overflow: "hidden",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              zIndex: 50,
            }}
          >
            <button
              onClick={() => {
                router.push("/profile");
                setProfileDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                border: "none",
                background: "transparent",
                color: "#374151",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                borderBottom: "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14 }}>👤</span>
              <span>My Profile</span>
            </button>

            <button
              onClick={() => {
                router.push("/settings");
                setProfileDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                border: "none",
                background: "transparent",
                color: "#374151",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                borderBottom: "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14 }}>⚙️</span>
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                router.push("/help");
                setProfileDropdown(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                border: "none",
                background: "transparent",
                color: "#374151",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                borderBottom: "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14 }}>❓</span>
              <span>Help & Support</span>
            </button>

            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                border: "none",
                background: "transparent",
                color: "#EF4444",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14 }}>🚪</span>
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* User Card Trigger displaying firstName */}
        <div
          onClick={() => setProfileDropdown(!profileDropdown)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px",
            borderRadius: 8,
            background: "#F9FAFB",
            cursor: "pointer",
            border: "1px solid #E5E7EB",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F3F4F6";
            e.currentTarget.style.borderColor = "#D1D5DB";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#F9FAFB";
            e.currentTarget.style.borderColor = "#E5E7EB";
          }}
        >
          {/* Avatar Icon */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.firstName || ""}
            </div>
            {user?.email && (
              <div
                style={{
                  fontSize: 11,
                  color: "#9CA3AF",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </div>
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              color: "#9CA3AF",
              transform: profileDropdown ? "rotate(-90deg)" : "rotate(90deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            ▲
          </span>
        </div>
      </div>
    </aside>
  );
}