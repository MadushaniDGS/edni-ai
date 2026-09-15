"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import apiClient from "@/lib/apiClient";

import {
  Menu,
  Bell,
  Sun,
  Moon,
} from "lucide-react";

interface TopBarProps {
  title?: string;
  onMenuToggle?: () => void;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
}

export default function TopBar({
  title = "Dashboard",
  onMenuToggle,
  isDarkMode,
  onThemeToggle,
}: TopBarProps) {
  const router = useRouter();

  const [time, setTime] = useState(new Date());
  const [initial, setInitial] = useState("");
  const [semester, setSemester] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Local fallback for theme when parent does not provide theme state
  const [localDarkMode, setLocalDarkMode] = useState(false);

  const effectiveDarkMode =
    isDarkMode ?? localDarkMode;

  // ============================================================
  // REAL-TIME CLOCK
  // ============================================================

  useEffect(() => {
    const t = setInterval(
      () => setTime(new Date()),
      1000
    );

    return () => clearInterval(t);
  }, []);

  // ============================================================
  // LOAD USER DATA
  // ============================================================

  useEffect(() => {
    const token = localStorage.getItem("edni_access");

    if (!token) return;

    apiClient
      .get("/user/auth/me")
      .then((res) => {
        setInitial(
          (res.data.first_name?.[0] ?? "A").toUpperCase()
        );

        if (res.data.semester) {
          setSemester(res.data.semester);
        }
      })
      .catch(() => { });
  }, []);

  // ============================================================
  // LOAD UNREAD NOTIFICATIONS
  // ============================================================

  const fetchUnreadNotifications = useCallback(
    async () => {
      try {
        const response =
          await apiClient.get("/notifications");

        if (!Array.isArray(response.data)) {
          setUnreadCount(0);
          return;
        }

        const unread = response.data.filter(
          (notification: any) =>
            notification?.unread === true
        );

        setUnreadCount(unread.length);
      } catch (error) {
        console.error(
          "Failed to load notification status:",
          error
        );
      }
    },
    []
  );

  useEffect(() => {
    fetchUnreadNotifications();

    const handleFocus = () => {
      fetchUnreadNotifications();
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [fetchUnreadNotifications]);

  // ============================================================
  // DATE / TIME
  // ============================================================

  const dateStr = time.toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    }
  );

  const timeStr = time.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );

  // ============================================================
  // COLORS
  // ============================================================

  const bgColor = effectiveDarkMode
    ? "#111827"
    : "#FFFFFF";

  const borderColor = effectiveDarkMode
    ? "#374151"
    : "#E5E7EB";

  const secondaryText = effectiveDarkMode
    ? "#D1D5DB"
    : "#64748B";

  // ============================================================
  // SIDEBAR TOGGLE
  // ============================================================

  const handleSidebarToggle = () => {
    // Keep existing parent functionality
    if (onMenuToggle) {
      onMenuToggle();
      return;
    }

    // Fallback so the button is still functional
    // when no parent handler has been provided.
    if (typeof window !== "undefined") {
      const sidebar =
        document.querySelector(
          "aside"
        ) as HTMLElement | null;

      if (sidebar) {
        const isHidden =
          sidebar.dataset.collapsed === "true";

        sidebar.style.transition =
          "transform 0.25s ease";

        sidebar.style.transform = isHidden
          ? "translateX(0)"
          : "translateX(-100%)";

        sidebar.dataset.collapsed =
          isHidden ? "false" : "true";
      }

      window.dispatchEvent(
        new CustomEvent("edni-sidebar-toggle")
      );
    }
  };

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  const handleNotificationsClick = async () => {
    try {
      const response =
        await apiClient.get("/notifications");

      if (Array.isArray(response.data)) {
        const unread = response.data.filter(
          (notification: any) =>
            notification?.unread === true
        );

        setUnreadCount(unread.length);
      }

      router.push("/notifications");
    } catch (error) {
      console.error(
        "Failed to load notifications",
        error
      );

      router.push("/notifications");
    }
  };

  // ============================================================
  // THEME TOGGLE
  // ============================================================

  const handleThemeToggle = () => {
    if (onThemeToggle) {
      onThemeToggle();
      return;
    }

    setLocalDarkMode((previous) => {
      const next = !previous;

      if (typeof document !== "undefined") {
        document.documentElement.style.colorScheme =
          next ? "dark" : "light";

        document.body.style.transition =
          "background-color 0.3s ease, color 0.3s ease";

        document.body.style.backgroundColor =
          next ? "#111827" : "#FFFFFF";

        document.body.style.color =
          next ? "#F3F4F6" : "#111827";
      }

      return next;
    });
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 22px",
        height: 64,
        borderBottom: `1px solid ${borderColor}`,
        background: effectiveDarkMode
          ? "rgba(17,24,39,0.96)"
          : "rgba(255,255,255,0.96)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter:
          "blur(14px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
        transition:
          "background-color 0.3s, border-color 0.3s",
        boxShadow: effectiveDarkMode
          ? "0 4px 18px rgba(0,0,0,0.12)"
          : "0 4px 18px rgba(91,33,182,0.04)",
      }}
    >
      {/* ======================================================
          LEFT: SIDEBAR TOGGLE + TITLE
      ======================================================= */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          minWidth: 0,
        }}
      >
        {/* SIDEBAR TOGGLE */}
        <button
          onClick={handleSidebarToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 39,
            height: 39,
            borderRadius: 11,
            background:
              effectiveDarkMode
                ? "rgba(124,58,237,0.13)"
                : "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
            border:
              effectiveDarkMode
                ? "1px solid rgba(139,92,246,0.20)"
                : "1px solid #E9E7EF",
            cursor: "pointer",
            color:
              effectiveDarkMode
                ? "#C4B5FD"
                : "#6D28D9",
            transition: "all 0.2s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              effectiveDarkMode
                ? "rgba(124,58,237,0.23)"
                : "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)";

            e.currentTarget.style.color =
              effectiveDarkMode
                ? "#DDD6FE"
                : "#7C3AED";

            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(124,58,237,0.12)";

            e.currentTarget.style.transform =
              "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              effectiveDarkMode
                ? "rgba(124,58,237,0.13)"
                : "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)";

            e.currentTarget.style.color =
              effectiveDarkMode
                ? "#C4B5FD"
                : "#6D28D9";

            e.currentTarget.style.boxShadow =
              "none";

            e.currentTarget.style.transform =
              "translateY(0)";
          }}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu
            size={20}
            strokeWidth={2.3}
          />
        </button>

        {/* PAGE TITLE */}
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            background:
              "linear-gradient(90deg, #6D28D9 0%, #7C3AED 52%, #2563EB 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:
              "transparent",
            letterSpacing: "-0.3px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 320,
          }}
        >
          {title}
        </span>
      </div>

      {/* SPACER */}
      <div style={{ flex: 1 }} />

      {/* ======================================================
          DATE + TIME
      ======================================================= */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          minWidth: 92,
          gap: 3,
          padding: "5px 9px",
          borderRadius: 10,
          background:
            effectiveDarkMode
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, #FAF9FF 0%, #F8FAFF 100%)",
          border:
            effectiveDarkMode
              ? "1px solid rgba(255,255,255,0.07)"
              : "1px solid #EEF2FF",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: secondaryText,
            lineHeight: 1,
          }}
        >
          {dateStr}
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: effectiveDarkMode
              ? "#A78BFA"
              : "#6366F1",
            lineHeight: 1,
          }}
        >
          {timeStr}
        </span>
      </div>

      {/* ======================================================
          NOTIFICATIONS
      ======================================================= */}

      <button
        onClick={handleNotificationsClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 39,
          height: 39,
          borderRadius: 11,
          background:
            effectiveDarkMode
              ? "rgba(124,58,237,0.10)"
              : "#FFFFFF",
          border:
            effectiveDarkMode
              ? "1px solid rgba(139,92,246,0.15)"
              : "1px solid #E9E7EF",
          cursor: "pointer",
          color:
            effectiveDarkMode
              ? "#C4B5FD"
              : "#64748B",
          transition: "all 0.2s ease",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            effectiveDarkMode
              ? "rgba(124,58,237,0.22)"
              : "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)";

          e.currentTarget.style.color =
            effectiveDarkMode
              ? "#DDD6FE"
              : "#7C3AED";

          e.currentTarget.style.boxShadow =
            "0 6px 16px rgba(124,58,237,0.11)";

          e.currentTarget.style.transform =
            "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            effectiveDarkMode
              ? "rgba(124,58,237,0.10)"
              : "#FFFFFF";

          e.currentTarget.style.color =
            effectiveDarkMode
              ? "#C4B5FD"
              : "#64748B";

          e.currentTarget.style.boxShadow =
            "none";

          e.currentTarget.style.transform =
            "translateY(0)";
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell
          size={18}
          strokeWidth={2.1}
        />

        {/* REAL UNREAD INDICATOR */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              width: 8,
              height: 8,
              borderRadius: "50%",
              right: 5,
              top: 4,
              background:
                "linear-gradient(135deg, #A855F7 0%, #3B82F6 100%)",
              border: `2px solid ${effectiveDarkMode
                  ? "#111827"
                  : "#FFFFFF"
                }`,
              boxSizing: "content-box",
            }}
          />
        )}
      </button>

      {/* ======================================================
          THEME TOGGLE
      ======================================================= */}

      <button
        onClick={handleThemeToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 39,
          height: 39,
          borderRadius: 11,
          background:
            effectiveDarkMode
              ? "rgba(59,130,246,0.10)"
              : "#FFFFFF",
          border:
            effectiveDarkMode
              ? "1px solid rgba(59,130,246,0.15)"
              : "1px solid #E9E7EF",
          cursor: "pointer",
          color:
            effectiveDarkMode
              ? "#FDE68A"
              : "#64748B",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            effectiveDarkMode
              ? "rgba(59,130,246,0.20)"
              : "linear-gradient(135deg, #FEF3C7 0%, #EDE9FE 100%)";

          e.currentTarget.style.color =
            effectiveDarkMode
              ? "#FDE68A"
              : "#7C3AED";

          e.currentTarget.style.boxShadow =
            "0 6px 16px rgba(124,58,237,0.10)";

          e.currentTarget.style.transform =
            "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            effectiveDarkMode
              ? "rgba(59,130,246,0.10)"
              : "#FFFFFF";

          e.currentTarget.style.color =
            effectiveDarkMode
              ? "#FDE68A"
              : "#64748B";

          e.currentTarget.style.boxShadow =
            "none";

          e.currentTarget.style.transform =
            "translateY(0)";
        }}
        title={
          effectiveDarkMode
            ? "Switch to Light Mode"
            : "Switch to Dark Mode"
        }
        aria-label="Toggle Theme"
      >
        {effectiveDarkMode ? (
          <Sun
            size={18}
            strokeWidth={2.1}
          />
        ) : (
          <Moon
            size={18}
            strokeWidth={2.1}
          />
        )}
      </button>
    </header>
  );
}