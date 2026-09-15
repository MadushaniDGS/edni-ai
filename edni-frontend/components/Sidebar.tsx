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
  {
    id: "dashboard",
    icon: "🏠",
    label: "Dashboard",
    path: "/dashboard",
    iconBg: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
    iconColor: "#7C3AED",
  },
  {
    id: "Questions",
    icon: "📝",
    label: "Take Questions",
    path: "/diagnostic",
    iconBg: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
    iconColor: "#2563EB",
  },
  {
    id: "knowledge-map",
    icon: "🗺️",
    label: "Knowledge Map",
    path: "/knowledge-profile",
    iconBg: "linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)",
    iconColor: "#9333EA",
  },
  {
    id: "study-plan",
    icon: "📅",
    label: "Study Plan",
    path: "/study-planner",
    iconBg: "linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)",
    iconColor: "#4F46E5",
  },
  {
    id: "resources",
    icon: "📚",
    label: "Learning Resources",
    path: "/learning-resources",
    iconBg: "linear-gradient(135deg, #FCE7F3 0%, #F5D0FE 100%)",
    iconColor: "#BE185D",
  },
  {
    id: "progress",
    icon: "📈",
    label: "Progress",
    path: "/analytics",
    iconBg: "linear-gradient(135deg, #DCFCE7 0%, #D1FAE5 100%)",
    iconColor: "#059669",
  },
  {
    id: "mentor",
    icon: "🤖",
    label: "AI Mentor",
    path: "/mentor",
    iconBg: "linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)",
    iconColor: "#D97706",
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [profileDropdown, setProfileDropdown] =
    useState(false);

  const [user, setUser] = useState<{
    firstName: string;
    email: string;
  } | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const storedUserRaw =
        localStorage.getItem("edni_user");

      if (storedUserRaw) {
        const parsed: PersonalData =
          JSON.parse(storedUserRaw);

        setUser({
          firstName: parsed.firstName || "User",
          email: parsed.email || "",
        });
      } else {
        setUser({
          firstName: "User",
          email: "",
        });
      }
    } catch {
      setUser({
        firstName: "User",
        email: "",
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("edni_access");
    localStorage.removeItem("edni_refresh");
    localStorage.removeItem("edni_user");

    router.push("/login");
  };

  const isActive = (path: string) =>
    pathname === path ||
    pathname.startsWith(path + "/");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node
        )
      ) {
        setProfileDropdown(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  return (
    <aside
      style={{
        width: 240,
        height: "100vh",
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #FCFBFF 100%)",
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
      {/* =====================================================
          LOGO HEADER
      ====================================================== */}

      <div
        onClick={() => router.push("/dashboard")}
        style={{
          padding: "20px 16px",
          cursor: "pointer",
          borderBottom: "1px solid #E5E7EB",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
              boxShadow:
                "0 5px 12px rgba(124,58,237,0.10)",
            }}
          >
            <Image
              src="/icon.png"
              alt="Edni AI Logo"
              width={36}
              height={36}
              style={{
                objectFit: "contain",
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                background:
                  "linear-gradient(90deg, #6D28D9 0%, #7C3AED 55%, #2563EB 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.3px",
              }}
            >
              Edni AI
            </div>

            <div
              style={{
                fontSize: 10,
                color: "#9CA3AF",
                marginTop: 1,
              }}
            >
              Academic Excellence
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION MENU
      ====================================================== */}

      <nav
        style={{
          flex: 1,
          padding: "11px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
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
                padding: "9px 10px",
                borderRadius: 12,
                border: "none",
                background: isItemActive
                  ? "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)"
                  : "transparent",
                color: isItemActive
                  ? "#4F46E5"
                  : "#6B7280",
                fontSize: 13,
                fontWeight: isItemActive ? 700 : 500,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition:
                  "all 0.18s ease",
                borderLeft: isItemActive
                  ? "3px solid #7C3AED"
                  : "3px solid transparent",
                boxShadow: isItemActive
                  ? "0 5px 14px rgba(124,58,237,0.07)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!isItemActive) {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, #FAFAFF 0%, #F8FAFF 100%)";

                  e.currentTarget.style.transform =
                    "translateX(2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isItemActive) {
                  e.currentTarget.style.background =
                    "transparent";

                  e.currentTarget.style.transform =
                    "translateX(0)";
                }
              }}
            >
              {/* COLORFUL STICKER ICON */}
              <span
                style={{
                  width: 35,
                  height: 35,
                  minWidth: 35,
                  borderRadius: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: item.iconBg,
                  boxShadow:
                    "0 4px 10px rgba(17,24,39,0.06)",
                  fontSize: 18,
                  lineHeight: 1,
                  transform: isItemActive
                    ? "scale(1.05)"
                    : "scale(1)",
                  transition:
                    "transform 0.18s ease",
                }}
              >
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

      {/* =====================================================
          PROFILE SECTION
      ====================================================== */}

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
        {/* ===================================================
            PROFILE DROPDOWN
        ==================================================== */}

        {profileDropdown && (
          <div
            style={{
              position: "absolute",
              left: "calc(100% + 8px)",
              bottom: 10,
              width: 180,
              display: "flex",
              flexDirection: "column",
              borderRadius: 13,
              border: "1px solid #E5E7EB",
              background: "white",
              overflow: "hidden",
              boxShadow:
                "0 12px 30px rgba(17,24,39,0.12)",
              zIndex: 50,
            }}
          >
            {/* MY PROFILE */}
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
                borderBottom:
                  "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "#FAF9FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "transparent";
              }}
            >
              <span style={styles.dropdownStickerPurple}>
                👤
              </span>

              <span>My Profile</span>
            </button>

            {/* SETTINGS */}
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
                borderBottom:
                  "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "#FAF9FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "transparent";
              }}
            >
              <span style={styles.dropdownStickerBlue}>
                ⚙️
              </span>

              <span>Settings</span>
            </button>

            {/* HELP */}
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
                borderBottom:
                  "1px solid #F3F4F6",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "#FAF9FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "transparent";
              }}
            >
              <span style={styles.dropdownStickerYellow}>
                💡
              </span>

              <span>Help & Support</span>
            </button>

            {/* LOG OUT */}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "#FEF2F2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "transparent";
              }}
            >
              <span style={styles.dropdownStickerRed}>
                🚪
              </span>

              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* ===================================================
            USER CARD
        ==================================================== */}

        <div
          onClick={() =>
            setProfileDropdown(!profileDropdown)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px",
            borderRadius: 11,
            background:
              "linear-gradient(135deg, #FAFAFF 0%, #F8FAFF 100%)",
            cursor: "pointer",
            border: "1px solid #E9E7EF",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)";

            e.currentTarget.style.borderColor =
              "#DDD6FE";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, #FAFAFF 0%, #F8FAFF 100%)";

            e.currentTarget.style.borderColor =
              "#E9E7EF";
          }}
        >
          {/* COLORFUL USER STICKER */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background:
                "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
              border:
                "1px solid #C4B5FD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 17,
              boxShadow:
                "0 4px 10px rgba(99,102,241,0.10)",
            }}
          >
            🐶
          </div>

          <div
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
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
                  fontSize: 10,
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

          {/* DROPDOWN ARROW */}
          <span
            style={{
              fontSize: 12,
              color: "#9CA3AF",
              transform: profileDropdown
                ? "rotate(-90deg)"
                : "rotate(90deg)",
              transition:
                "transform 0.2s",
              flexShrink: 0,
            }}
          >
            ›
          </span>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  dropdownStickerPurple: {
    width: 27,
    height: 27,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
    fontSize: 14,
  },

  dropdownStickerBlue: {
    width: 27,
    height: 27,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)",
    fontSize: 14,
  },

  dropdownStickerYellow: {
    width: 27,
    height: 27,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #FEF3C7 0%, #FED7AA 100%)",
    fontSize: 14,
  },

  dropdownStickerRed: {
    width: 27,
    height: 27,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
    fontSize: 14,
  },
};