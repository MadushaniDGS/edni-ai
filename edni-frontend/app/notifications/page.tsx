"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import apiClient from "@/lib/apiClient";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

interface Notification {
  id: number;
  icon: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  created_at: string;
}

type FilterType = "all" | "unread" | "read";

const COLORS = {
  purple: "#7C3AED",
  purpleDark: "#5B21B6",
  violet: "#8B5CF6",
  indigo: "#6366F1",
  blue: "#3B82F6",
  blueDark: "#1D4ED8",
  purpleLight: "#EDE9FE",
  blueLight: "#DBEAFE",
  background: "#F7F7FC",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

function getNotificationTheme(index: number, unread: boolean) {
  const themes = [
    {
      gradient: "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
      accent: "#7C3AED",
      soft: "#F5F3FF",
    },
    {
      gradient: "linear-gradient(135deg, #DDD6FE 0%, #BFDBFE 100%)",
      accent: "#6366F1",
      soft: "#EEF2FF",
    },
    {
      gradient: "linear-gradient(135deg, #F3E8FF 0%, #E0E7FF 100%)",
      accent: "#8B5CF6",
      soft: "#FAF5FF",
    },
    {
      gradient: "linear-gradient(135deg, #E0E7FF 0%, #DBEAFE 100%)",
      accent: "#4F46E5",
      soft: "#EEF2FF",
    },
  ];

  const theme = themes[index % themes.length];

  if (!unread) {
    return {
      ...theme,
      accent: "#94A3B8",
      soft: "#F8FAFC",
    };
  }

  return theme;
}

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // ============================================================
  // FETCH NOTIFICATIONS
  // ============================================================

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await apiClient.get("/notifications");

        if (Array.isArray(response.data)) {
          setNotifications(response.data);
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
        setError("Failed to load notifications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ============================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ============================================================

  const markAsRead = async (id: number) => {
    try {
      setMarkingId(id);

      await apiClient.put(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, unread: false }
            : notification
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setMarkingId(null);
    }
  };

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);

      await apiClient.put("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          unread: false,
        }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  // ============================================================
  // FILTER + SEARCH
  // ============================================================

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && notification.unread) ||
        (filter === "read" && !notification.unread);

      const matchesSearch =
        !query ||
        notification.title.toLowerCase().includes(query) ||
        notification.desc.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search]);

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const readCount = notifications.length - unreadCount;

  // ============================================================
  // TIME FORMAT
  // ============================================================

  const formatTime = (notification: Notification) => {
    if (!notification.created_at) {
      return notification.time;
    }

    const created = new Date(notification.created_at).getTime();

    if (Number.isNaN(created)) {
      return notification.time;
    }

    const now = Date.now();
    const diff = Math.max(0, now - created);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    if (days < 7) {
      return `${days}d ago`;
    }

    return new Date(notification.created_at).toLocaleDateString();
  };

  // ============================================================
  // NOTIFICATION CLICK
  // ============================================================

  const handleNotificationClick = async (
    notification: Notification
  ) => {
    setExpandedId(
      expandedId === notification.id ? null : notification.id
    );

    if (notification.unread) {
      await markAsRead(notification.id);
    }
  };

  // ============================================================
  // CLEAR SEARCH/FILTER
  // ============================================================

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #F8F7FC 0%, #F7F9FF 50%, #F5F3FF 100%)",
        overflowX: "hidden",
      }}
    >
      <Sidebar />

      {/* FIXED TOP BAR */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 1000,
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(124,58,237,0.10)",
        }}
      >
        <TopBar title="Notifications" />
      </div>

      <main
        style={{
          marginLeft: 240,
          paddingTop: 64,
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 1220,
            margin: "0 auto",
            padding: "22px 28px 55px",
          }}
        >
          {/* =====================================================
              HERO HEADER
          ====================================================== */}

          <section
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 24,
              padding: "24px 26px",
              marginBottom: 20,
              background:
                "linear-gradient(135deg, #8176f7 0%, #7669ef 45%, #9b75e9 100%)",
              boxShadow:
                "0 18px 42px rgba(91,33,182,0.18)",
              color: "#FFFFFF",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                right: -70,
                top: -110,
                background: "rgba(255,255,255,0.10)",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: "50%",
                right: 110,
                bottom: -90,
                background: "rgba(255,255,255,0.08)",
              }}
            />

            <div
              style={{
                position: "absolute",
                width: 75,
                height: 75,
                borderRadius: 22,
                right: 40,
                bottom: 18,
                transform: "rotate(18deg)",
                background: "rgba(255,255,255,0.07)",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                }}
              >
                <button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  style={{
                    width: 42,
                    height: 42,
                    border: "1px solid rgba(255,255,255,0.20)",
                    borderRadius: 13,
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                    fontSize: 21,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  ←
                </button>

                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "5px 9px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.13)",
                      border:
                        "1px solid rgba(255,255,255,0.16)",
                      fontSize: 10,
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    🔔 Stay Updated
                  </div>

                  <h1
                    style={{
                      margin: 0,
                      fontSize: 27,
                      lineHeight: 1.15,
                      fontWeight: 800,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Notifications
                  </h1>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "rgba(255,255,255,0.86)",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                    }}
                  >
                    Stay updated with your learning activity and
                    important alerts.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => fetchNotifications(true)}
                  disabled={refreshing}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 11,
                    border:
                      "1px solid rgba(255,255,255,0.20)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: refreshing
                      ? "not-allowed"
                      : "pointer",
                    opacity: refreshing ? 0.65 : 1,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      marginRight: 5,
                      fontSize: 16,
                    }}
                  >
                    ↻
                  </span>
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={markingAll}
                    style={{
                      height: 40,
                      padding: "0 14px",
                      border: "none",
                      borderRadius: 11,
                      background: "#FFFFFF",
                      color: COLORS.purpleDark,
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: markingAll
                        ? "not-allowed"
                        : "pointer",
                      opacity: markingAll ? 0.7 : 1,
                      boxShadow:
                        "0 7px 18px rgba(0,0,0,0.10)",
                    }}
                  >
                    {markingAll
                      ? "Marking..."
                      : "✓ Mark all as read"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* =====================================================
              SUMMARY CARDS
          ====================================================== */}

          {!loading && !error && notifications.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, minmax(0, 1fr))",
                gap: 13,
                marginBottom: 17,
              }}
            >
              {/* TOTAL */}
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%)",
                  border: "1px solid #E9E7EF",
                  borderRadius: 17,
                  padding: "15px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow:
                    "0 5px 18px rgba(17,24,39,0.04)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 19,
                    background:
                      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
                  }}
                >
                  🔔
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: COLORS.muted,
                      marginBottom: 2,
                    }}
                  >
                    Total notifications
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: COLORS.text,
                    }}
                  >
                    {notifications.length}
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    width: 75,
                    height: 75,
                    borderRadius: "50%",
                    right: -30,
                    top: -30,
                    background:
                      "rgba(124,58,237,0.05)",
                  }}
                />
              </div>

              {/* UNREAD */}
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, #FFFFFF 0%, #EFF6FF 100%)",
                  border: "1px solid #E0E7FF",
                  borderRadius: 17,
                  padding: "15px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow:
                    "0 5px 18px rgba(59,130,246,0.05)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                    color: COLORS.indigo,
                    background:
                      "linear-gradient(135deg, #E0E7FF 0%, #DBEAFE 100%)",
                  }}
                >
                  ●
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: COLORS.muted,
                      marginBottom: 2,
                    }}
                  >
                    Unread
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: COLORS.indigo,
                    }}
                  >
                    {unreadCount}
                  </div>
                </div>
              </div>

              {/* READ */}
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 100%)",
                  border: "1px solid #E9E7EF",
                  borderRadius: 17,
                  padding: "15px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow:
                    "0 5px 18px rgba(17,24,39,0.04)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    color: "#059669",
                    background:
                      "linear-gradient(135deg, #D1FAE5 0%, #E0E7FF 100%)",
                  }}
                >
                  ✓
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: COLORS.muted,
                      marginBottom: 2,
                    }}
                  >
                    Read
                  </div>

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#059669",
                    }}
                  >
                    {readCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              SEARCH + FILTER TOOLBAR
          ====================================================== */}

          {!loading && !error && notifications.length > 0 && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E8E6EF",
                borderRadius: 17,
                padding: 12,
                marginBottom: 16,
                boxShadow:
                  "0 5px 18px rgba(17,24,39,0.035)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {/* SEARCH */}
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    minWidth: 220,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 13,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94A3B8",
                      fontSize: 18,
                      zIndex: 2,
                    }}
                  >
                    ⌕
                  </span>

                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    style={{
                      width: "100%",
                      height: 40,
                      boxSizing: "border-box",
                      border:
                        "1px solid #E5E7EB",
                      borderRadius: 11,
                      padding: "0 39px",
                      outline: "none",
                      fontSize: 12,
                      color: COLORS.text,
                      background: "#FAFAFC",
                    }}
                  />

                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform:
                          "translateY(-50%)",
                        width: 25,
                        height: 25,
                        border: "none",
                        borderRadius: "50%",
                        background: "#EDE9FE",
                        color: COLORS.purple,
                        cursor: "pointer",
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* FILTER TABS */}
                <div
                  style={{
                    display: "flex",
                    padding: 4,
                    gap: 3,
                    borderRadius: 11,
                    background:
                      "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
                  }}
                >
                  {[
                    {
                      key: "all" as FilterType,
                      label: "All",
                      count: notifications.length,
                    },
                    {
                      key: "unread" as FilterType,
                      label: "Unread",
                      count: unreadCount,
                    },
                    {
                      key: "read" as FilterType,
                      label: "Read",
                      count: readCount,
                    },
                  ].map((item) => {
                    const active = filter === item.key;

                    return (
                      <button
                        key={item.key}
                        onClick={() =>
                          setFilter(item.key)
                        }
                        style={{
                          border: "none",
                          borderRadius: 8,
                          padding: "7px 10px",
                          background: active
                            ? "#FFFFFF"
                            : "transparent",
                          color: active
                            ? COLORS.purple
                            : COLORS.muted,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: active
                            ? "0 2px 7px rgba(17,24,39,0.08)"
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {item.label}

                        <span
                          style={{
                            minWidth: 18,
                            height: 18,
                            padding: "0 4px",
                            borderRadius: 999,
                            background: active
                              ? COLORS.purpleLight
                              : "#E5E7EB",
                            color: active
                              ? COLORS.purple
                              : COLORS.muted,
                            fontSize: 9,
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent:
                              "center",
                          }}
                        >
                          {item.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              LOADING
          ====================================================== */}

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 11,
              }}
            >
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  style={{
                    height: 105,
                    borderRadius: 17,
                    background:
                      "linear-gradient(90deg, #FFFFFF 0%, #F5F3FF 50%, #FFFFFF 100%)",
                    border:
                      "1px solid #E9E7EF",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      minWidth: 48,
                      borderRadius: 14,
                      background: "#EDE9FE",
                    }}
                  />

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: "30%",
                        height: 12,
                        borderRadius: 6,
                        background: "#E5E7EB",
                        marginBottom: 10,
                      }}
                    />

                    <div
                      style={{
                        width: "72%",
                        height: 9,
                        borderRadius: 6,
                        background: "#EEF2F7",
                        marginBottom: 8,
                      }}
                    />

                    <div
                      style={{
                        width: "22%",
                        height: 8,
                        borderRadius: 6,
                        background: "#F1F5F9",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =====================================================
              ERROR
          ====================================================== */}

          {!loading && error && (
            <div
              style={{
                minHeight: 300,
                background: "#FFFFFF",
                border: "1px solid #FECACA",
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 30,
                boxShadow:
                  "0 8px 25px rgba(127,29,29,0.04)",
              }}
            >
              <div
                style={{
                  width: 65,
                  height: 65,
                  borderRadius: 19,
                  background:
                    "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  marginBottom: 13,
                }}
              >
                ⚠️
              </div>

              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  fontWeight: 800,
                  color: COLORS.text,
                }}
              >
                Something went wrong
              </h3>

              <p
                style={{
                  margin: 0,
                  maxWidth: 430,
                  color: COLORS.muted,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                }}
              >
                {error}
              </p>

              <button
                onClick={() => fetchNotifications()}
                style={{
                  marginTop: 17,
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 15px",
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                  color: "#FFFFFF",
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow:
                    "0 7px 16px rgba(124,58,237,0.18)",
                }}
              >
                Try again
              </button>
            </div>
          )}

          {/* =====================================================
              EMPTY DATABASE
          ====================================================== */}

          {!loading &&
            !error &&
            notifications.length === 0 && (
              <div
                style={{
                  minHeight: 330,
                  background: "#FFFFFF",
                  border: "1px solid #E9E7EF",
                  borderRadius: 21,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 30,
                  boxShadow:
                    "0 8px 25px rgba(17,24,39,0.035)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 74,
                    height: 74,
                    borderRadius: 22,
                    background:
                      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    marginBottom: 15,
                  }}
                >
                  🔔

                  <div
                    style={{
                      position: "absolute",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "#8B5CF6",
                      right: 2,
                      top: 3,
                      border: "3px solid #FFFFFF",
                    }}
                  />
                </div>

                <h3
                  style={{
                    margin: "0 0 7px",
                    fontSize: 18,
                    fontWeight: 800,
                    color: COLORS.text,
                  }}
                >
                  No notifications yet
                </h3>

                <p
                  style={{
                    maxWidth: 440,
                    margin: 0,
                    color: COLORS.muted,
                    fontSize: 12.5,
                    lineHeight: 1.6,
                  }}
                >
                  You&apos;re all caught up. New notifications
                  will appear here when they arrive.
                </p>
              </div>
            )}

          {/* =====================================================
              NO SEARCH/FILTER RESULTS
          ====================================================== */}

          {!loading &&
            !error &&
            notifications.length > 0 &&
            filteredNotifications.length === 0 && (
              <div
                style={{
                  minHeight: 300,
                  background: "#FFFFFF",
                  border: "1px solid #E9E7EF",
                  borderRadius: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: 30,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    background:
                      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 27,
                    marginBottom: 14,
                  }}
                >
                  ⌕
                </div>

                <h3
                  style={{
                    margin: "0 0 7px",
                    fontSize: 18,
                    fontWeight: 800,
                    color: COLORS.text,
                  }}
                >
                  No matching notifications
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: COLORS.muted,
                    fontSize: 12.5,
                  }}
                >
                  Try changing your search or notification
                  filter.
                </p>

                <button
                  onClick={clearFilters}
                  style={{
                    marginTop: 17,
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 15px",
                    background:
                      "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                    color: "#FFFFFF",
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}

          {/* =====================================================
              NOTIFICATION LIST
          ====================================================== */}

          {!loading &&
            !error &&
            filteredNotifications.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
              >
                {filteredNotifications.map(
                  (notification, index) => {
                    const expanded =
                      expandedId === notification.id;

                    const theme = getNotificationTheme(
                      index,
                      notification.unread
                    );

                    return (
                      <div
                        key={notification.id}
                        style={{
                          background: "#FFFFFF",
                          border:
                            "1px solid #E7E5EE",
                          borderLeft: notification.unread
                            ? `4px solid ${theme.accent}`
                            : "1px solid #E7E5EE",
                          borderRadius: 17,
                          overflow: "hidden",
                          boxShadow: expanded
                            ? "0 12px 30px rgba(91,33,182,0.10)"
                            : "0 5px 18px rgba(17,24,39,0.035)",
                          transition:
                            "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                        }}
                      >
                        {/* MAIN NOTIFICATION */}
                        <button
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                          style={{
                            width: "100%",
                            border: "none",
                            background: "transparent",
                            textAlign: "left",
                            padding: "15px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 13,
                            cursor: "pointer",
                          }}
                        >
                          {/* Dynamic icon box */}
                          <div
                            style={{
                              position: "relative",
                              width: 49,
                              height: 49,
                              minWidth: 49,
                              borderRadius: 15,
                              background: theme.gradient,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 21,
                              boxShadow:
                                "0 5px 14px rgba(91,33,182,0.08)",
                              border:
                                "1px solid rgba(255,255,255,0.8)",
                            }}
                          >
                            {notification.icon ||
                              "🔔"}

                            {notification.unread && (
                              <span
                                style={{
                                  position: "absolute",
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background:
                                    "#3B82F6",
                                  right: 2,
                                  top: 2,
                                  border:
                                    "2px solid #FFFFFF",
                                }}
                              />
                            )}
                          </div>

                          {/* CONTENT */}
                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                                marginBottom: 4,
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: COLORS.text,
                                  lineHeight: 1.3,
                                }}
                              >
                                {notification.title}
                              </h3>

                              {notification.unread && (
                                <span
                                  style={{
                                    padding: "3px 7px",
                                    borderRadius: 999,
                                    background:
                                      "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
                                    color:
                                      COLORS.purple,
                                    fontSize: 8.5,
                                    fontWeight: 800,
                                    letterSpacing:
                                      "0.5px",
                                  }}
                                >
                                  NEW
                                </span>
                              )}
                            </div>

                            <p
                              style={{
                                margin: 0,
                                color: COLORS.muted,
                                fontSize: 11.5,
                                lineHeight: 1.5,
                                display:
                                  "-webkit-box",
                                WebkitLineClamp: expanded
                                  ? undefined
                                  : 2,
                                WebkitBoxOrient:
                                  "vertical",
                                overflow: expanded
                                  ? "visible"
                                  : "hidden",
                              }}
                            >
                              {notification.desc}
                            </p>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 10,
                                marginTop: 7,
                                fontSize: 9.5,
                                color: "#94A3B8",
                              }}
                            >
                              <span>
                                🕐{" "}
                                {formatTime(
                                  notification
                                )}
                              </span>

                              {notification.unread && (
                                <span
                                  style={{
                                    color:
                                      theme.accent,
                                    fontWeight: 700,
                                  }}
                                >
                                  ● Unread
                                </span>
                              )}
                            </div>
                          </div>

                          {/* RIGHT */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              flexShrink: 0,
                            }}
                          >
                            {notification.unread && (
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background:
                                    "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
                                  boxShadow:
                                    "0 0 0 4px #EDE9FE",
                                }}
                              />
                            )}

                            <span
                              style={{
                                fontSize: 25,
                                color: "#94A3B8",
                                display: "inline-block",
                                transform: expanded
                                  ? "rotate(90deg)"
                                  : "rotate(0deg)",
                                transition:
                                  "transform 0.2s ease",
                              }}
                            >
                              ›
                            </span>
                          </div>
                        </button>

                        {/* =================================================
                            EXPANDED AREA
                        ================================================== */}

                        {expanded && (
                          <div
                            style={{
                              padding:
                                "0 16px 16px 78px",
                            }}
                          >
                            <div
                              style={{
                                height: 1,
                                background:
                                  "#EEEAF5",
                                marginBottom: 15,
                              }}
                            />

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(2, minmax(0, 1fr))",
                                gap: 12,
                                marginBottom: 14,
                              }}
                            >
                              <div
                                style={{
                                  padding: 11,
                                  borderRadius: 12,
                                  background:
                                    "linear-gradient(135deg, #FAF5FF 0%, #EFF6FF 100%)",
                                  border:
                                    "1px solid #E9E7EF",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: 9,
                                    textTransform:
                                      "uppercase",
                                    letterSpacing:
                                      "0.5px",
                                    fontWeight: 800,
                                    color:
                                      "#94A3B8",
                                    marginBottom: 4,
                                  }}
                                >
                                  Notification
                                </span>

                                <strong
                                  style={{
                                    color:
                                      COLORS.text,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  {notification.title}
                                </strong>
                              </div>

                              <div
                                style={{
                                  padding: 11,
                                  borderRadius: 12,
                                  background:
                                    "linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)",
                                  border:
                                    "1px solid #E9E7EF",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: 9,
                                    textTransform:
                                      "uppercase",
                                    letterSpacing:
                                      "0.5px",
                                    fontWeight: 800,
                                    color:
                                      "#94A3B8",
                                    marginBottom: 4,
                                  }}
                                >
                                  Received
                                </span>

                                <strong
                                  style={{
                                    color:
                                      COLORS.text,
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                  }}
                                >
                                  {notification.created_at
                                    ? new Date(
                                      notification.created_at
                                    ).toLocaleString()
                                    : notification.time}
                                </strong>
                              </div>
                            </div>

                            {notification.unread ? (
                              <button
                                onClick={() =>
                                  markAsRead(
                                    notification.id
                                  )
                                }
                                disabled={
                                  markingId ===
                                  notification.id
                                }
                                style={{
                                  border: "none",
                                  borderRadius: 10,
                                  padding:
                                    "9px 13px",
                                  background:
                                    "linear-gradient(135deg, #3B82F6 0%, #6366F1 60%, #7C3AED 100%)",
                                  color: "#FFFFFF",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor:
                                    markingId ===
                                      notification.id
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity:
                                    markingId ===
                                      notification.id
                                      ? 0.65
                                      : 1,
                                  boxShadow:
                                    "0 7px 16px rgba(99,102,241,0.18)",
                                }}
                              >
                                {markingId ===
                                  notification.id
                                  ? "Marking as read..."
                                  : "✓ Mark as read"}
                              </button>
                            ) : (
                              <div
                                style={{
                                  display:
                                    "inline-flex",
                                  alignItems:
                                    "center",
                                  gap: 5,
                                  padding:
                                    "7px 10px",
                                  borderRadius: 9,
                                  background:
                                    "#ECFDF5",
                                  color: "#047857",
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                }}
                              >
                                ✓ This notification
                                has been read
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
        </div>
      </main>
    </div>
  );
}