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

    const fetchNotifications = useCallback(async (isRefresh = false) => {
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
    }, []);

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

            // Update UI immediately
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

            // Update UI immediately
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

    const handleNotificationClick = async (notification: Notification) => {
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
        <div className="notifications-page">
            <Sidebar />

            <main className="main-content">
                <TopBar title="Notifications" />

                <div className="content-container">

                    {/* =====================================================
              HEADER
          ====================================================== */}

                    <div className="page-header">
                        <div className="header-left">
                            <button
                                className="back-button"
                                onClick={() => router.back()}
                                aria-label="Go back"
                            >
                                ←
                            </button>

                            <div>
                                <div className="title-row">
                                    <h1>Notifications</h1>

                                    {unreadCount > 0 && (
                                        <span className="unread-count">
                                            {unreadCount} unread
                                        </span>
                                    )}
                                </div>

                                <p>
                                    Stay updated with your learning activity and
                                    important alerts.
                                </p>
                            </div>
                        </div>

                        <div className="header-actions">
                            <button
                                className="refresh-button"
                                onClick={() => fetchNotifications(true)}
                                disabled={refreshing}
                            >
                                <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"}>
                                    ↻
                                </span>
                                {refreshing ? "Refreshing..." : "Refresh"}
                            </button>

                            {unreadCount > 0 && (
                                <button
                                    className="mark-all-button"
                                    onClick={markAllAsRead}
                                    disabled={markingAll}
                                >
                                    {markingAll ? "Marking..." : "✓ Mark all as read"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* =====================================================
              SUMMARY CARDS
          ====================================================== */}

                    {!loading && !error && notifications.length > 0 && (
                        <div className="summary-grid">

                            <div className="summary-card">
                                <div className="summary-icon total-icon">
                                    🔔
                                </div>

                                <div>
                                    <span>Total notifications</span>
                                    <strong>{notifications.length}</strong>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-icon unread-icon">
                                    ●
                                </div>

                                <div>
                                    <span>Unread</span>
                                    <strong>{unreadCount}</strong>
                                </div>
                            </div>

                            <div className="summary-card">
                                <div className="summary-icon read-icon">
                                    ✓
                                </div>

                                <div>
                                    <span>Read</span>
                                    <strong>
                                        {notifications.length - unreadCount}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =====================================================
              SEARCH + FILTER TOOLBAR
          ====================================================== */}

                    {!loading && !error && notifications.length > 0 && (
                        <div className="toolbar">

                            <div className="search-wrapper">
                                <span className="search-icon">⌕</span>

                                <input
                                    type="text"
                                    placeholder="Search notifications..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />

                                {search && (
                                    <button
                                        className="clear-search"
                                        onClick={() => setSearch("")}
                                        aria-label="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <div className="filter-tabs">
                                <button
                                    className={filter === "all" ? "active" : ""}
                                    onClick={() => setFilter("all")}
                                >
                                    All
                                    <span>{notifications.length}</span>
                                </button>

                                <button
                                    className={filter === "unread" ? "active" : ""}
                                    onClick={() => setFilter("unread")}
                                >
                                    Unread
                                    {unreadCount > 0 && (
                                        <span>{unreadCount}</span>
                                    )}
                                </button>

                                <button
                                    className={filter === "read" ? "active" : ""}
                                    onClick={() => setFilter("read")}
                                >
                                    Read
                                    <span>{notifications.length - unreadCount}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* =====================================================
              LOADING
          ====================================================== */}

                    {loading && (
                        <div className="notification-list">
                            {[1, 2, 3, 4].map((item) => (
                                <div className="skeleton-card" key={item}>
                                    <div className="skeleton-icon" />

                                    <div className="skeleton-content">
                                        <div className="skeleton-line title-line" />
                                        <div className="skeleton-line text-line" />
                                        <div className="skeleton-line small-line" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* =====================================================
              ERROR
          ====================================================== */}

                    {!loading && error && (
                        <div className="state-card error-card">
                            <div className="state-icon">⚠️</div>

                            <h3>Something went wrong</h3>

                            <p>{error}</p>

                            <button
                                className="retry-button"
                                onClick={() => fetchNotifications()}
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
                            <div className="state-card">
                                <div className="empty-bell">🔔</div>

                                <h3>No notifications yet</h3>

                                <p>
                                    You&apos;re all caught up. New notifications will
                                    appear here when they arrive.
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
                            <div className="state-card">
                                <div className="empty-bell">⌕</div>

                                <h3>No matching notifications</h3>

                                <p>
                                    Try changing your search or notification filter.
                                </p>

                                <button
                                    className="retry-button"
                                    onClick={clearFilters}
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
                            <div className="notification-list">

                                {filteredNotifications.map((notification) => {
                                    const expanded =
                                        expandedId === notification.id;

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`notification-card ${notification.unread ? "unread" : "read"
                                                } ${expanded ? "expanded" : ""}`}
                                        >
                                            <button
                                                className="notification-main"
                                                onClick={() =>
                                                    handleNotificationClick(notification)
                                                }
                                            >
                                                {/* Icon */}
                                                <div className="notification-icon">
                                                    {notification.icon || "🔔"}
                                                </div>

                                                {/* Content */}
                                                <div className="notification-content">
                                                    <div className="notification-title-row">
                                                        <h3>{notification.title}</h3>

                                                        {notification.unread && (
                                                            <span className="new-badge">
                                                                NEW
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p>{notification.desc}</p>

                                                    <div className="notification-meta">
                                                        <span>
                                                            🕐 {formatTime(notification)}
                                                        </span>

                                                        {notification.unread && (
                                                            <span className="unread-label">
                                                                Unread
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right side */}
                                                <div className="notification-right">
                                                    {notification.unread && (
                                                        <span className="unread-dot" />
                                                    )}

                                                    <span
                                                        className={`expand-arrow ${expanded ? "open" : ""
                                                            }`}
                                                    >
                                                        ›
                                                    </span>
                                                </div>
                                            </button>

                                            {/* =================================================
                          EXPANDED AREA
                      ================================================== */}

                                            {expanded && (
                                                <div className="expanded-content">
                                                    <div className="expanded-divider" />

                                                    <div className="expanded-details">
                                                        <div>
                                                            <span>Notification</span>
                                                            <strong>
                                                                {notification.title}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>Received</span>
                                                            <strong>
                                                                {notification.created_at
                                                                    ? new Date(
                                                                        notification.created_at
                                                                    ).toLocaleString()
                                                                    : notification.time}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    {notification.unread && (
                                                        <button
                                                            className="mark-read-button"
                                                            onClick={() =>
                                                                markAsRead(notification.id)
                                                            }
                                                            disabled={
                                                                markingId === notification.id
                                                            }
                                                        >
                                                            {markingId === notification.id
                                                                ? "Marking as read..."
                                                                : "✓ Mark as read"}
                                                        </button>
                                                    )}

                                                    {!notification.unread && (
                                                        <div className="already-read">
                                                            ✓ This notification has been read
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                </div>
            </main>

            {/* ==========================================================
          PAGE STYLES
      =========================================================== */}

            <style jsx>{`
        .notifications-page {
          min-height: 100vh;
          background: #f8fafc;
        }

        .main-content {
          margin-left: 240px;
          min-height: 100vh;
        }

        .content-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 32px 60px;
        }

        /* HEADER */

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          margin-bottom: 28px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-button {
          width: 42px;
          height: 42px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 12px;
          font-size: 22px;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button:hover {
          transform: translateX(-2px);
          border-color: #6c63ff;
          color: #6c63ff;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title-row h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 750;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .page-header p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .unread-count {
          padding: 5px 10px;
          border-radius: 20px;
          background: #ede9fe;
          color: #6c63ff;
          font-size: 12px;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .refresh-button,
        .mark-all-button {
          height: 42px;
          padding: 0 15px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 650;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .refresh-button {
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
        }

        .refresh-button:hover:not(:disabled) {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .mark-all-button {
          border: none;
          background: #6c63ff;
          color: white;
          box-shadow: 0 4px 12px rgba(108, 99, 255, 0.2);
        }

        .mark-all-button:hover:not(:disabled) {
          background: #5b54e8;
          transform: translateY(-1px);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-icon {
          display: inline-block;
          margin-right: 6px;
          font-size: 17px;
        }

        .spinning {
          animation: spin 0.8s linear infinite;
        }

        /* SUMMARY */

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.06);
        }

        .summary-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }

        .total-icon {
          background: #eef2ff;
        }

        .unread-icon {
          background: #fff7ed;
          color: #f97316;
        }

        .read-icon {
          background: #ecfdf5;
          color: #10b981;
        }

        .summary-card span {
          display: block;
          color: #64748b;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .summary-card strong {
          display: block;
          color: #0f172a;
          font-size: 22px;
        }

        /* TOOLBAR */

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          margin-bottom: 18px;
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 480px;
        }

        .search-wrapper input {
          width: 100%;
          height: 42px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 0 40px;
          outline: none;
          font-size: 13px;
          color: #0f172a;
          background: #f8fafc;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .search-wrapper input:focus {
          border-color: #6c63ff;
          background: white;
          box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.08);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 20px;
          z-index: 1;
        }

        .clear-search {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border: none;
          background: #e2e8f0;
          border-radius: 50%;
          color: #64748b;
          cursor: pointer;
          font-size: 16px;
        }

        .filter-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 11px;
        }

        .filter-tabs button {
          border: none;
          background: transparent;
          color: #64748b;
          padding: 8px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .filter-tabs button:hover {
          color: #334155;
        }

        .filter-tabs button.active {
          background: white;
          color: #6c63ff;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
        }

        .filter-tabs button span {
          min-width: 18px;
          height: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e2e8f0;
          color: #64748b;
          border-radius: 10px;
          font-size: 10px;
        }

        .filter-tabs button.active span {
          background: #ede9fe;
          color: #6c63ff;
        }

        /* NOTIFICATION LIST */

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .notification-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .notification-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
        }

        .notification-card.unread {
          border-left: 4px solid #6c63ff;
          background: #ffffff;
        }

        .notification-card.read {
          opacity: 0.88;
        }

        .notification-card.expanded {
          border-color: #c4b5fd;
          box-shadow: 0 8px 25px rgba(108, 99, 255, 0.08);
        }

        .notification-main {
          width: 100%;
          border: none;
          background: transparent;
          text-align: left;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
        }

        .notification-icon {
          width: 50px;
          height: 50px;
          flex-shrink: 0;
          border-radius: 14px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .unread .notification-icon {
          background: #f0edff;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title-row {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 5px;
        }

        .notification-title-row h3 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
        }

        .new-badge {
          padding: 3px 7px;
          border-radius: 5px;
          background: #ede9fe;
          color: #6c63ff;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .notification-content > p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .notification-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          font-size: 11px;
          color: #94a3b8;
        }

        .unread-label {
          color: #6c63ff;
          font-weight: 650;
        }

        .notification-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .unread-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #6c63ff;
          box-shadow: 0 0 0 4px #ede9fe;
        }

        .expand-arrow {
          font-size: 25px;
          color: #94a3b8;
          transition: transform 0.2s ease;
        }

        .expand-arrow.open {
          transform: rotate(90deg);
        }

        /* EXPANDED */

        .expanded-content {
          padding: 0 20px 20px 86px;
          animation: expandIn 0.2s ease;
        }

        .expanded-divider {
          height: 1px;
          background: #e2e8f0;
          margin-bottom: 18px;
        }

        .expanded-details {
          display: flex;
          gap: 40px;
          margin-bottom: 16px;
        }

        .expanded-details div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .expanded-details span {
          color: #94a3b8;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
        }

        .expanded-details strong {
          color: #334155;
          font-size: 12px;
          font-weight: 600;
        }

        .mark-read-button {
          border: none;
          background: #6c63ff;
          color: white;
          padding: 9px 14px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .mark-read-button:hover:not(:disabled) {
          background: #5b54e8;
        }

        .already-read {
          color: #10b981;
          font-size: 12px;
          font-weight: 600;
        }

        /* STATES */

        .state-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 35px;
        }

        .state-icon,
        .empty-bell {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 16px;
        }

        .state-card h3 {
          margin: 0 0 7px;
          color: #0f172a;
          font-size: 18px;
        }

        .state-card p {
          max-width: 430px;
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .error-card .state-icon {
          background: #fef2f2;
        }

        .retry-button {
          margin-top: 18px;
          border: none;
          background: #6c63ff;
          color: white;
          padding: 10px 17px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
        }

        /* SKELETON */

        .skeleton-card {
          height: 100px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          gap: 16px;
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
        }

        .skeleton-card::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.7),
            transparent
          );
          animation: shimmer 1.4s infinite;
        }

        .skeleton-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: #e2e8f0;
          flex-shrink: 0;
        }

        .skeleton-content {
          flex: 1;
          padding-top: 3px;
        }

        .skeleton-line {
          background: #e2e8f0;
          border-radius: 5px;
          height: 10px;
          margin-bottom: 10px;
        }

        .title-line {
          width: 35%;
          height: 13px;
        }

        .text-line {
          width: 70%;
        }

        .small-line {
          width: 20%;
        }

        /* ANIMATIONS */

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes expandIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .main-content {
            margin-left: 0;
          }

          .content-container {
            padding: 24px 20px 50px;
          }

          .page-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-wrapper {
            max-width: none;
          }

          .filter-tabs {
            width: 100%;
          }

          .filter-tabs button {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 600px) {
          .content-container {
            padding: 20px 14px 40px;
          }

          .title-row h1 {
            font-size: 24px;
          }

          .header-left {
            align-items: flex-start;
          }

          .back-button {
            flex-shrink: 0;
          }

          .header-actions {
            flex-direction: column;
          }

          .header-actions button {
            width: 100%;
          }

          .notification-main {
            padding: 15px;
            gap: 11px;
          }

          .notification-icon {
            width: 42px;
            height: 42px;
            font-size: 18px;
          }

          .notification-title-row h3 {
            font-size: 13px;
          }

          .notification-content > p {
            font-size: 12px;
          }

          .notification-right {
            gap: 7px;
          }

          .expanded-content {
            padding: 0 15px 15px 68px;
          }

          .expanded-details {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
        </div>
    );
}