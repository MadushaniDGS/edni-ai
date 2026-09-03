"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

interface TopBarProps {
  title?: string;
  onMenuToggle?: () => void;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
}

export default function TopBar({
  title = "Dashboard",
  onMenuToggle,
  isDarkMode = false,
  onThemeToggle,
}: TopBarProps) {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [initial, setInitial] = useState("");
  const [semester, setSemester] = useState("");

  // Real-time clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load user data
  useEffect(() => {
    const token = localStorage.getItem("edni_access");
    if (!token) return;

    apiClient
      .get("/user/auth/me")
      .then((res) => {
        setInitial((res.data.first_name?.[0] ?? "A").toUpperCase());
        if (res.data.semester) setSemester(res.data.semester);
      })
      .catch(() => { });
  }, []);

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const bgColor = isDarkMode ? "#1F2937" : "#FFFFFF";
  const textColor = isDarkMode ? "#F3F4F6" : "#111827";
  const borderColor = isDarkMode ? "#374151" : "#E5E7EB";
  const hoverBg = isDarkMode ? "#374151" : "#F3F4F6";
  const secondaryText = isDarkMode ? "#D1D5DB" : "#6B7280";

  const handleMessagesClick = async () => {
    try {
      await apiClient.get("/notifications"); // GET /api/v1/notifications
      router.push("/notifications");
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 24px",
        height: 64,
        borderBottom: `1px solid ${borderColor}`,
        background: bgColor,
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
        transition: "background-color 0.3s, border-color 0.3s",
      }}
    >
      {/* Menu Toggle Button (Hamburger) */}
      <button
        onClick={onMenuToggle}
        style={{
          display: "flex",
          alignItems: "center",
          marginLeft: "240px",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: secondaryText,
          fontSize: 20,
          transition: "all 0.2s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = "#4F46E5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = secondaryText;
        }}
        title="Toggle Sidebar"
      >
        ☰
      </button>

      {/* Page Title */}
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#4F46E5",
          letterSpacing: "-0.3px",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Date & Time Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          minWidth: 100,
          gap: 4,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: secondaryText }}>
          {dateStr}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#4F46E5",
            lineHeight: 1,
          }}
        >
          {timeStr}
        </span>
      </div>

      {/* Notifications Icon Button */}
      <button
        onClick={() => router.push("/notifications")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          color: secondaryText,
          transition: "all 0.2s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = "#4F46E5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = secondaryText;
        }}
        title="Notifications"
      >
        ✉️
      </button>

      {/* Theme Toggle Button */}
      <button
        onClick={onThemeToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          color: secondaryText,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = "#4F46E5";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = secondaryText;
        }}
        title="Toggle Theme"
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>

    </header>
  );
}