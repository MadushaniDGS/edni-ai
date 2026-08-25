"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
];

const FEATURES = [
  {
    icon: "🔍",
    color: "#6C63FF",
    bg: "rgba(108,99,255,0.12)",
    title: "Knowledge Gap Detection",
    description:
      "Our diagnostic engine scans your current understanding, mapping exactly where your foundations need strengthening before building higher-level concepts.",
    visual: "bar-chart",
  },
  {
    icon: "📅",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    title: "Personalized Planning",
    description:
      "Schedules that adapt to your rhythm. Agentic AI dynamically adjusts your roadmap based on real-time performance and upcoming deadlines.",
    visual: null,
  },
  {
    icon: "🤖",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    title: "AI Mentor",
    description:
      "Always-on Socratic tutoring. Don't just get the answer; learn how to arrive at it through guided conversational prompts.",
    visual: null,
  },
  {
    icon: "📊",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    title: "Progress Analytics",
    description:
      "Visualize your mastery. Interactive charts track your progression through Bloom's Taxonomy levels for every subject.",
    visual: "donut",
  },
  {
    icon: "⚡",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.12)",
    title: "Adaptive Learning",
    description:
      "The difficulty scales with you. RAG technology pulls the perfect resources at the exact moment you are ready for them.",
    visual: null,
  },
  {
    icon: "💡",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    title: "Smart Recommendations",
    description:
      "Curated academic papers, video lectures, and practice problems tailored specifically to bridge your identified knowledge gaps.",
    visual: null,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: "0 40px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        transition: "all 0.3s ease",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src="/icon.png"
          alt="Edni AI Logo"
          style={{
            width: 32,
            height: 32,
            objectFit: "contain",
          }}
        />
        <span style={{ fontSize: 16, fontWeight: 700, color: "#4F46E5", letterSpacing: "-0.3px" }}>
          Edni AI
        </span>
      </div>

      {/* Nav Links */}
      <div style={{ display: "flex", gap: 36 }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              fontSize: 14,
              color: "#374151",
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
          >
            {item.label}
          </a>
        ))}
      </div>

      {/* CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/login"
          style={{
            fontSize: 14,
            color: "#374151",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
        >
          Log In
        </Link>

        <Link
          href="/register"
          style={{
            padding: "8px 20px",
            background: "linear-gradient(135deg, #6C63FF, #4F46E5)",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-block",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

function DashboardCard() {
  const items = [
    {
      icon: "🔍",
      iconBg: "#EEF2FF",
      title: "Diagnostic Engine",
      subtitle: "Analyzing knowledge gaps",
      right: <span style={{ fontSize: 16 }}>✅</span>,
    },
    {
      icon: "🤖",
      iconBg: "#F5F3FF",
      title: "Agentic AI Planner",
      subtitle: "RAG-powered curriculum",
      right: (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 64,
              height: 6,
              borderRadius: 3,
              background: "#E5E7EB",
              overflow: "hidden",
            }}
          >
            <div
              style={{ width: "60%", height: "100%", background: "#6C63FF", borderRadius: 3 }}
            />
          </div>
        </div>
      ),
    },
    {
      icon: "🗺️",
      iconBg: "#ECFDF5",
      title: "Personalized Roadmap",
      subtitle: "Optimised for mastery",
      right: <span style={{ fontSize: 16, color: "#6C63FF" }}>↑</span>,
      active: true,
    },
  ];

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
        padding: 24,
        width: 320,
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            👤
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Student Profile</span>
        </div>
        <span style={{ fontSize: 12, color: "#4F46E5", fontWeight: 600 }}>Bloom&apos;s Sync</span>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <div key={i}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: item.active ? "#FAFAFA" : "transparent",
                border: item.active ? "1.5px solid #E0E0FF" : "1px solid transparent",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: item.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: item.active ? "#4F46E5" : "#111827" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{item.subtitle}</div>
              </div>
              {item.right}
            </div>
            {/* connector line */}
            {i < items.length - 1 && (
              <div style={{ width: 1, height: 12, background: "#E5E7EB", marginLeft: 30 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartVisual() {
  const bars = [
    { h: 55, active: false },
    { h: 80, active: true },
    { h: 50, active: false },
    { h: 70, active: true },
    { h: 45, active: false },
    { h: 85, active: true },
  ];
  return (
    <div
      style={{
        marginTop: 20,
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        height: 70,
        padding: "0 8px",
      }}
    >
      {bars.map((bar, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {bar.active && (
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
          )}
          <div
            style={{
              width: "100%",
              height: bar.h,
              borderRadius: "6px 6px 0 0",
              background: bar.active
                ? "linear-gradient(180deg, #4F46E5, #6C63FF)"
                : "#C7D2FE",
              transition: "height 0.3s ease",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function DonutVisual() {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const progress = 0.75;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E5E7EB" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#4F46E5"
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          75%
        </div>
      </div>
      <span style={{ fontSize: 13, color: "#6B7280" }}>Overall Mastery</span>
    </div>
  );
}

function FeatureCard({ feature }: { feature: (typeof FEATURES)[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        borderRadius: 16,
        padding: 28,
        border: `1.5px solid ${hovered ? feature.color + "44" : "#F0F0F0"}`,
        boxShadow: hovered
          ? `0 12px 40px ${feature.color}18, 0 2px 8px rgba(0,0,0,0.04)`
          : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.25s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: feature.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          marginBottom: 16,
        }}
      >
        {feature.icon}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 10px 0" }}>
        {feature.title}
      </h3>
      <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
        {feature.description}
      </p>
      {feature.visual === "bar-chart" && <BarChartVisual />}
      {feature.visual === "donut" && <DonutVisual />}
    </div>
  );
}

function StarRating({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: 14, color: i < n ? "#F59E0B" : "#E5E7EB" }}>★</span>
      ))}
    </div>
  );
}

function TestimonialCard({ t }: {
  t: {
    name: string; role: string; avatar: string; avatarBg: string;
    rating: number; text: string; highlight: string; highlightColor: string;
  };
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white", borderRadius: 18, padding: "28px 26px",
        border: `1.5px solid ${hovered ? "#C7D2FE" : "#E5E7EB"}`,
        boxShadow: hovered ? "0 12px 40px rgba(108,99,255,0.10)" : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.25s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        display: "flex", flexDirection: "column", gap: 0,
      }}
    >
      <StarRating n={t.rating} />

      {/* Quote */}
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: "0 0 20px 0", flex: 1 }}>
        &ldquo;{t.text}&rdquo;
      </p>

      {/* Highlight pill */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontSize: 11.5, fontWeight: 700,
          color: t.highlightColor,
          background: t.highlightColor + "15",
          padding: "4px 12px", borderRadius: 20,
          border: `1px solid ${t.highlightColor}30`,
        }}>✦ {t.highlight}</span>
      </div>

      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 18, borderTop: "1px solid #F0F0F0" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: t.avatarBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0,
        }}>{t.avatar}</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>{t.name}</div>
          <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}

function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EdniAIPage() {
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "#FAFBFF" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "100px 80px 60px",
          gap: 80,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Left */}
        <div style={{ flex: 1 }}>
          <FadeIn>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                background: "#EEF2FF",
                border: "1px solid #C7D2FE",
                borderRadius: 100,
                marginBottom: 28,
              }}
            >
              <span style={{ fontSize: 14 }}>✨</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4F46E5" }}>
                Intelligent Academic Planning
              </span>
            </div>

            <h1
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.1,
                color: "#111827",
                margin: "0 0 22px 0",
                letterSpacing: "-1.5px",
              }}
            >
              Learn Smarter with{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #6C63FF, #4F46E5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI
              </span>
            </h1>

            <p
              style={{
                fontSize: 16,
                color: "#6B7280",
                lineHeight: 1.7,
                maxWidth: 440,
                margin: "0 0 36px 0",
              }}
            >
              Personalized academic planning powered by Agentic AI, Bloom&apos;s Taxonomy, and
              Retrieval-Augmented Generation. Unlock your true academic potential with a system
              that adapts to your learning style.
            </p>

            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 40 }}>
              <button
                style={{
                  padding: "14px 28px",
                  background: "linear-gradient(135deg, #6C63FF, #4F46E5)",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(79,70,229,0.35)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 28px rgba(79,70,229,0.42)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(79,70,229,0.35)";
                }}
              >
                Get Started →
              </button>
              <button
                style={{
                  padding: "14px 24px",
                  background: "transparent",
                  color: "#374151",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6C63FF")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#EEF2FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  ▶
                </span>
                Watch Demo
              </button>
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex" }}>
                {["👩‍🎓", "👨‍🎓", "👩‍💻"].map((em, i) => (
                  <div
                    key={i}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      border: "2px solid white",
                      marginLeft: i > 0 ? -10 : 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {em}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: "#6B7280" }}>
                Trusted by{" "}
                <strong style={{ color: "#111827" }}>10,000+</strong> top students globally
              </span>
            </div>
          </FadeIn>
        </div>

        {/* Right — Dashboard card */}
        <FadeIn delay={200}>
          <div
            style={{
              position: "relative",
              padding: "20px",
            }}
          >
            {/* Decorative blobs */}
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(108,99,255,0.15), transparent 70%)",
                filter: "blur(20px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -20,
                left: -20,
                width: 140,
                height: 140,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)",
                filter: "blur(20px)",
                pointerEvents: "none",
              }}
            />
            <DashboardCard />
          </div>
        </FadeIn>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        style={{ padding: "80px 80px", maxWidth: 1200, margin: "0 auto" }}
      >
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: "#111827",
                margin: "0 0 14px 0",
                letterSpacing: "-0.8px",
              }}
            >
              The Architecture of Excellence
            </h2>
            <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
              A comprehensive suite of tools designed to elevate your cognitive processing and
              streamline your academic journey.
            </p>
          </div>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 80}>
              <FeatureCard feature={feature} />
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" style={{ padding: "80px 80px", background: "white" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <span style={{
                display: "inline-block", padding: "6px 16px", borderRadius: 100,
                background: "#EEF2FF", border: "1px solid #C7D2FE",
                fontSize: 12, fontWeight: 700, color: "#4F46E5", marginBottom: 16,
              }}>HOW IT WORKS</span>
              <h2 style={{ fontSize: 38, fontWeight: 800, color: "#111827", margin: "0 0 14px 0", letterSpacing: "-0.8px" }}>
                From enrollment to mastery in 4 steps
              </h2>
              <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
                Edni AI guides you through a structured, adaptive journey tailored to how your brain actually learns.
              </p>
            </div>
          </FadeIn>

          {/* Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, position: "relative" }}>
            {/* Connector line */}
            <div style={{
              position: "absolute", top: 36, left: "12.5%", right: "12.5%", height: 2,
              background: "linear-gradient(90deg,#6C63FF,#4F46E5,#818CF8,#C7D2FE)",
              zIndex: 0,
            }} />

            {[
              {
                step: "01", icon: "🎯", color: "#4F46E5", bg: "#EEF2FF",
                title: "Diagnostic Assessment",
                desc: "A 20-question adaptive test maps your exact knowledge state across Bloom's Taxonomy levels.",
                detail: "Takes ~15 minutes",
              },
              {
                step: "02", icon: "🗺️", color: "#8B5CF6", bg: "#F5F3FF",
                title: "Knowledge Gap Mapping",
                desc: "Our RAG engine identifies prerequisite gaps and builds your personalised dependency graph.",
                detail: "AI-powered analysis",
              },
              {
                step: "03", icon: "📅", color: "#06B6D4", bg: "#ECFEFF",
                title: "AI Study Plan Generated",
                desc: "A dynamic weekly schedule is created, prioritising critical gaps and adapting to your calendar.",
                detail: "Updated in real-time",
              },
              {
                step: "04", icon: "📈", color: "#10B981", bg: "#ECFDF5",
                title: "Learn, Track & Improve",
                desc: "Work through modules with your AI Mentor, take quizzes, and watch your mastery grow week by week.",
                detail: "Continuous feedback",
              },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 20px", position: "relative", zIndex: 1 }}>
                  {/* Step circle */}
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: s.bg, border: `2.5px solid ${s.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, marginBottom: 20,
                    boxShadow: `0 0 0 6px white, 0 0 0 8px ${s.color}22`,
                  }}>{s.icon}</div>

                  {/* Step number */}
                  <span style={{ fontSize: 11, fontWeight: 800, color: s.color, letterSpacing: "1px", marginBottom: 8 }}>
                    STEP {s.step}
                  </span>

                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 10px 0", lineHeight: 1.3 }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.65, margin: "0 0 12px 0" }}>
                    {s.desc}
                  </p>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, color: s.color,
                    background: s.bg, padding: "3px 10px", borderRadius: 20,
                  }}>{s.detail}</span>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Demo video mockup */}
          <FadeIn delay={200}>
            <div style={{
              marginTop: 72, borderRadius: 20, overflow: "hidden",
              border: "1.5px solid #E5E7EB",
              boxShadow: "0 24px 80px rgba(108,99,255,0.12)",
              background: "#0F172A",
              position: "relative",
            }}>
              {/* Browser chrome */}
              <div style={{
                background: "#1E293B", padding: "12px 20px",
                display: "flex", alignItems: "center", gap: 8,
                borderBottom: "1px solid #334155",
              }}>
                {["#EF4444", "#F59E0B", "#10B981"].map((c) => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
                ))}
                <div style={{
                  flex: 1, margin: "0 16px", background: "#334155",
                  borderRadius: 6, padding: "4px 12px",
                  fontSize: 12, color: "#94A3B8", textAlign: "center",
                }}>app.edni.ai/dashboard</div>
              </div>

              {/* Screen content */}
              <div style={{
                height: 340, display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                background: "linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#0F172A 100%)",
              }}>
                {/* Grid overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: "radial-gradient(rgba(108,99,255,0.15) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }} />

                {/* Play button */}
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "rgba(79,70,229,0.9)", backdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", zIndex: 2,
                  boxShadow: "0 0 0 16px rgba(79,70,229,0.15), 0 0 0 32px rgba(79,70,229,0.08)",
                  transition: "transform 0.2s",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <span style={{ fontSize: 28, marginLeft: 4 }}>▶</span>
                </div>

                {/* Floating UI snippets */}
                <div style={{
                  position: "absolute", top: 24, left: 32,
                  background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12,
                  padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4 }}>Current Mastery</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>78%</div>
                  <div style={{ fontSize: 10, color: "#10B981", marginTop: 2 }}>↑ +2% this week</div>
                </div>

                <div style={{
                  position: "absolute", top: 24, right: 32,
                  background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12,
                  padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 4 }}>Study Streak</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>7 🔥</div>
                  <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 2 }}>Keep it going!</div>
                </div>

                <div style={{
                  position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12,
                  padding: "10px 20px", display: "flex", gap: 24,
                }}>
                  {[
                    { label: "Modules Done", val: "24/30" },
                    { label: "Knowledge Gaps", val: "12" },
                    { label: "Assignments", val: "46" },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" style={{ padding: "80px 80px", background: "#FAFBFF" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <span style={{
                display: "inline-block", padding: "6px 16px", borderRadius: 100,
                background: "#EEF2FF", border: "1px solid #C7D2FE",
                fontSize: 12, fontWeight: 700, color: "#4F46E5", marginBottom: 16,
              }}>TESTIMONIALS</span>
              <h2 style={{ fontSize: 38, fontWeight: 800, color: "#111827", margin: "0 0 14px 0", letterSpacing: "-0.8px" }}>
                Loved by students worldwide
              </h2>
              <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
                Over 10,000 students have transformed their academic performance with Edni AI.
              </p>
            </div>
          </FadeIn>

          {/* Stats row */}
          <FadeIn delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 56 }}>
              {[
                { val: "10,000+", label: "Active Students", icon: "👩‍🎓" },
                { val: "94%", label: "Grade Improvement", icon: "📈" },
                { val: "4.9/5", label: "Average Rating", icon: "⭐" },
                { val: "50+", label: "Universities", icon: "🏛️" },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "white", borderRadius: 16, padding: "24px",
                  border: "1.5px solid #E5E7EB", textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#4F46E5", letterSpacing: "-0.8px", marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Testimonial cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22 }}>
            {[
              {
                name: "Priya Sharma",
                role: "M.S. Computer Science, Stanford",
                avatar: "PS",
                avatarBg: "linear-gradient(135deg,#6C63FF,#4F46E5)",
                rating: 5,
                text: "Edni AI completely changed how I approach studying. The knowledge gap detection found blind spots I didn't even know I had. My GPA went from 3.2 to 3.8 in one semester.",
                highlight: "GPA from 3.2 → 3.8",
                highlightColor: "#4F46E5",
              },
              {
                name: "James Okafor",
                role: "Undergraduate, Data Science — MIT",
                avatar: "JO",
                avatarBg: "linear-gradient(135deg,#10B981,#059669)",
                rating: 5,
                text: "The AI Mentor is like having a brilliant tutor available 24/7. It never just gives me the answer — it walks me through the reasoning, which actually makes me retain everything.",
                highlight: "Always-on AI Mentor",
                highlightColor: "#10B981",
              },
              {
                name: "Supuni Perera",
                role: "B.Sc. Software Engineering, NSBM",
                avatar: "SP",
                avatarBg: "linear-gradient(135deg,#8B5CF6,#7C3AED)",
                rating: 5,
                text: "The personalized study planner is incredible. It knows exactly when I have deadlines and adjusts my schedule automatically. I've never felt more in control of my academics.",
                highlight: "Study Planner",
                highlightColor: "#8B5CF6",
              },
              {
                name: "Aisha Mohammed",
                role: "PhD Candidate, Machine Learning — UCL",
                avatar: "AM",
                avatarBg: "linear-gradient(135deg,#F59E0B,#D97706)",
                rating: 5,
                text: "As a PhD student, I was skeptical of AI study tools. But the Bloom's Taxonomy integration is genuinely sophisticated — it pushes me to synthesize and evaluate, not just recall.",
                highlight: "Bloom's Taxonomy",
                highlightColor: "#F59E0B",
              },
              {
                name: "Lucas Ferreira",
                role: "Year 3, Computer Engineering — USP",
                avatar: "LF",
                avatarBg: "linear-gradient(135deg,#EF4444,#DC2626)",
                rating: 5,
                text: "I failed my Algorithms midterm last year. After one month with Edni AI's diagnostic and gap analysis, I scored 91% on the final. The dependency graph showed me exactly what to study first.",
                highlight: "Midterm fail → 91% final",
                highlightColor: "#EF4444",
              },
              {
                name: "Yuki Tanaka",
                role: "Exchange Student, Computer Science — TU Berlin",
                avatar: "YT",
                avatarBg: "linear-gradient(135deg,#06B6D4,#0891B2)",
                rating: 5,
                text: "Studying in a second language is hard. Edni AI's progress analytics helped me see exactly which concepts I was struggling with vs. which ones were just language barriers. Game-changer.",
                highlight: "Progress Analytics",
                highlightColor: "#06B6D4",
              },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 80}>
                <TestimonialCard t={t} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: "60px 80px 100px", maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div
            style={{
              background: "linear-gradient(135deg, #6C63FF 0%, #4F46E5 50%, #3730A3 100%)",
              borderRadius: 24,
              padding: "60px 80px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Background decoration */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -80,
                left: -40,
                width: 250,
                height: 250,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                pointerEvents: "none",
              }}
            />

            <h2
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: "white",
                margin: "0 0 16px 0",
                letterSpacing: "-0.8px",
              }}
            >
              Ready to unlock your potential?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", margin: "0 0 36px 0" }}>
              Join thousands of students already learning smarter with Edni AI.
            </p>
            <button
              style={{
                padding: "14px 36px",
                background: "white",
                color: "#4F46E5",
                border: "none",
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Get Started for Free →
            </button>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: "24px 80px",
          borderTop: "1px solid #F0F0F0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#9CA3AF" }}>© 2024 Edni AI Academy</span>
        <div style={{ display: "flex", gap: 28 }}>
          {["Academic Support", "Privacy Policy", "Terms of Service"].map((link) => (
            <a
              key={link}
              href="#"
              style={{ fontSize: 13, color: "#9CA3AF", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
            >
              {link}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
