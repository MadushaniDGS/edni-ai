"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import apiClient from "@/lib/apiClient";

const NAV_ITEMS = [
  { id: "dashboard", icon: "⊞", label: "Dashboard", path: "/dashboard" },
  { id: "knowledge", icon: "🗺️", label: "Knowledge Map", path: "/knowledge" },
  { id: "profile", icon: "👤", label: "Profile", path: "/profile" },
  { id: "settings", icon: "⚙️", label: "Settings", path: "/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("edni_access");
    localStorage.removeItem("edni_refresh");
    localStorage.removeItem("edni_user");
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const NavBtn = ({ icon, label, path }: { icon: string; label: string; path: string }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => router.push(path)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 12px", borderRadius: 10, border: "none",
          background: active ? "#EEF2FF" : "transparent",
          color: active ? "#4F46E5" : "#6B7280",
          fontSize: 13.5, fontWeight: active ? 700 : 500,
          cursor: "pointer", textAlign: "left", width: "100%",
          transition: "all 0.15s",
          borderLeft: active ? "3px solid #4F46E5" : "3px solid transparent",
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#F9FAFB"; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
      </button>
    );
  };

  return (
    <aside style={{
      width: 240, minHeight: "100vh", background: "white",
      borderRight: "1px solid #F0F0F0",
      display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
    }}>
      {/* Logo */}
      <div
        onClick={() => router.push("/dashboard")}
        style={{ padding: "22px 20px 28px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "white", fontWeight: 800,
          }}>E</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.3px" }}>Edni AI</div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Academic Excellence</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV_ITEMS.map((item) => (
          <NavBtn key={item.id} icon={item.icon} label={item.label} path={item.path} />
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: "#F0F0F0", margin: "8px 20px" }} />

      {/* Bottom */}
      <div style={{ padding: "8px 12px 20px" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 10, border: "none",
            background: "transparent", color: "#EF4444",
            fontSize: 13.5, fontWeight: 600, cursor: "pointer", textAlign: "left", width: "100%",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}