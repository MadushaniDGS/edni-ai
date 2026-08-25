"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

interface TopBarProps {
  title?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export default function TopBar({ title, showSearch = false, searchPlaceholder = "Search..." }: TopBarProps) {
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [search, setSearch] = useState("");
  const [initial, setInitial] = useState("A");
  const [semester, setSemester] = useState("Fall Semester 2024");

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("edni_access");
    if (!token) return;

    apiClient.get("/auth/me")
      .then((res) => {
        setInitial((res.data.first_name?.[0] ?? "A").toUpperCase());
        if (res.data.semester) setSemester(res.data.semester);
      })
      .catch(() => { });
  }, []);

  const dateStr = time.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "0 32px", height: 64,
      borderBottom: "1px solid #F0F0F0",
      background: "white",
      position: "sticky", top: 0, zIndex: 30, flexShrink: 0,
    }}>
      {/* Date / time */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 140 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#111827" }}>{dateStr}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#4F46E5" }}>{timeStr}</span>
      </div>

      {title && (
        <>
          <div style={{ width: 1, height: 30, background: "#E5E7EB" }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.3px" }}>{title}</span>
        </>
      )}

      {showSearch && (
        <div style={{
          flex: 1, maxWidth: 340, marginLeft: title ? 0 : "auto",
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 14px", height: 38,
          background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 20,
        }}>
          <span style={{ color: "#9CA3AF", fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "#374151", outline: "none" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ border: "none", background: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 13, padding: 0 }}>
              ✕
            </button>
          )}
        </div>
      )}

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{
          padding: "5px 12px", borderRadius: 8,
          border: "1.5px solid #E5E7EB", background: "white",
          fontSize: 12.5, fontWeight: 500, color: "#374151",
        }}>{semester}</span>

        {/* Bell */}
        <div
          onClick={() => router.push("/profile")}
          style={{ position: "relative", cursor: "pointer", fontSize: 20 }}
        >
          🔔
        </div>

        {/* Avatar */}
        <div
          onClick={() => router.push("/profile")}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}
        >{initial}</div>
      </div>
    </div>
  );
}