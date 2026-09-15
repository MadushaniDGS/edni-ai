"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Resource {
  id: number;
  title: string;
  description?: string;
  type?: string;
  url?: string;
  difficulty?: string;
  concepts?: string[];
  learning_area?: string;
  bloom_level?: number;
  bloom_levels?: number[];
  estimated_minutes?: number;
  duration_minutes?: number;
  relevance_score?: number;
  relevance?: number;
  source?: string;
}

interface KnowledgeProfile {
  critical_gaps?: Array<{
    concept?: string;
    area?: string;
    mastery?: number;
    severity?: string;
    gap?: string;
    learning_area?: string;
  }>;
  knowledge_gaps?: Array<{
    concept?: string;
    area?: string;
    mastery?: number;
    severity?: string;
    gap?: string;
    learning_area?: string;
  }>;
  learning_area?: string;
}

interface RAGResponse {
  resources?: Resource[];
  remediation_strategy?: string;
  recommended_path?: string[];
}

const COLORS = {
  purple: "#7C3AED",
  purpleDark: "#5B21B6",
  purpleLight: "#EDE9FE",
  purpleSoft: "#F5F3FF",
  violet: "#8B5CF6",
  pink: "#EC4899",
  indigo: "#6366F1",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  white: "#FFFFFF",
  background: "#F8F7FC",
};

function normalizeGap(
  gap:
    | string
    | {
      concept?: string;
      area?: string;
      mastery?: number;
      severity?: string;
      gap?: string;
      learning_area?: string;
    }
): string {
  if (typeof gap === "string") return gap;

  return (
    gap.concept ||
    gap.gap ||
    gap.area ||
    gap.learning_area ||
    "Knowledge Gap"
  );
}

function getTypeIcon(type?: string) {
  const value = type?.toLowerCase() || "";

  if (value.includes("video")) return "🎥";
  if (value.includes("article")) return "📖";
  if (value.includes("book")) return "📚";
  if (value.includes("course")) return "🎓";
  if (value.includes("quiz")) return "🧠";
  if (value.includes("documentation")) return "📘";
  if (value.includes("pdf")) return "📄";
  if (value.includes("tutorial")) return "🛠️";

  return "🔗";
}

function getTypeTheme(type?: string, index: number = 0) {
  const value = type?.toLowerCase() || "";

  if (value.includes("video")) {
    return {
      gradient: "linear-gradient(135deg, #FCE7F3 0%, #F5D0FE 100%)",
      accent: "#DB2777",
      soft: "#FDF2F8",
      icon: "🎥",
    };
  }

  if (value.includes("article")) {
    return {
      gradient: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
      accent: "#7C3AED",
      soft: "#F5F3FF",
      icon: "📖",
    };
  }

  if (value.includes("course")) {
    return {
      gradient: "linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%)",
      accent: "#4F46E5",
      soft: "#EEF2FF",
      icon: "🎓",
    };
  }

  if (value.includes("book") || value.includes("pdf")) {
    return {
      gradient: "linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)",
      accent: "#9333EA",
      soft: "#FAF5FF",
      icon: "📚",
    };
  }

  const themes = [
    {
      gradient: "linear-gradient(135deg, #EDE9FE 0%, #F5D0FE 100%)",
      accent: "#7C3AED",
      soft: "#F5F3FF",
      icon: "✨",
    },
    {
      gradient: "linear-gradient(135deg, #FCE7F3 0%, #EDE9FE 100%)",
      accent: "#A21CAF",
      soft: "#FDF4FF",
      icon: "💡",
    },
    {
      gradient: "linear-gradient(135deg, #DDD6FE 0%, #E0E7FF 100%)",
      accent: "#6366F1",
      soft: "#EEF2FF",
      icon: "🚀",
    },
    {
      gradient: "linear-gradient(135deg, #F5D0FE 0%, #DDD6FE 100%)",
      accent: "#8B5CF6",
      soft: "#FAF5FF",
      icon: "🎯",
    },
  ];

  return themes[index % themes.length];
}

function getDifficultyTheme(difficulty?: string) {
  const value = difficulty?.toLowerCase() || "";

  if (value.includes("easy") || value.includes("beginner")) {
    return {
      background: "#ECFDF5",
      color: "#047857",
      label: difficulty || "Beginner",
    };
  }

  if (value.includes("hard") || value.includes("advanced")) {
    return {
      background: "#FEF2F2",
      color: "#B91C1C",
      label: difficulty || "Advanced",
    };
  }

  return {
    background: "#FFF7ED",
    color: "#C2410C",
    label: difficulty || "Intermediate",
  };
}

export default function LearningResourcesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [knowledgeGaps, setKnowledgeGaps] = useState<any[]>([]);
  const [selectedGap, setSelectedGap] = useState<string>("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [remediationStrategy, setRemediationStrategy] = useState("");
  const [recommendedPath, setRecommendedPath] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("edni_access");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchKnowledgeProfile();
  }, [router]);

  const fetchKnowledgeProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("edni_access");

      const response = await axios.get(`${API_URL}/knowledge-profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const profile: KnowledgeProfile = response.data;

      const gaps =
        profile.critical_gaps ||
        profile.knowledge_gaps ||
        [];

      setKnowledgeGaps(gaps);

      if (gaps.length > 0) {
        const firstGap = normalizeGap(gaps[0]);
        setSelectedGap(firstGap);
        await fetchResources(firstGap);
      } else {
        setResources([]);
      }
    } catch (err: any) {
      console.error("Knowledge profile error:", err);
      setError(
        err?.response?.data?.detail ||
        "Unable to load your learning resources."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async (gap: string) => {
    try {
      setResourceLoading(true);
      setError("");

      const token = localStorage.getItem("edni_access");

      const response = await axios.get(
        `${API_URL}/resources/remediate/${encodeURIComponent(gap)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data: RAGResponse = response.data;

      setResources(data.resources || []);
      setRemediationStrategy(data.remediation_strategy || "");
      setRecommendedPath(data.recommended_path || []);
    } catch (err: any) {
      console.error("Resource error:", err);

      if (err?.response?.status === 401) {
        localStorage.removeItem("edni_access");
        localStorage.removeItem("edni_refresh");
        router.push("/login");
        return;
      }

      setResources([]);
      setRemediationStrategy("");
      setRecommendedPath([]);

      setError(
        err?.response?.data?.detail ||
        "Unable to load resources for this knowledge gap."
      );
    } finally {
      setResourceLoading(false);
    }
  };

  const handleGapChange = async (gap: string) => {
    setSelectedGap(gap);
    await fetchResources(gap);
  };

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const typeMatch =
        selectedType === "ALL" ||
        resource.type?.toUpperCase() === selectedType;

      const difficultyMatch =
        selectedDifficulty === "ALL" ||
        resource.difficulty?.toUpperCase() === selectedDifficulty;

      return typeMatch && difficultyMatch;
    });
  }, [resources, selectedType, selectedDifficulty]);

  const resourceTypes = useMemo(() => {
    const types = resources
      .map((resource) => resource.type?.toUpperCase())
      .filter(Boolean) as string[];

    return ["ALL", ...Array.from(new Set(types))];
  }, [resources]);

  const difficulties = useMemo(() => {
    const values = resources
      .map((resource) => resource.difficulty?.toUpperCase())
      .filter(Boolean) as string[];

    return ["ALL", ...Array.from(new Set(values))];
  }, [resources]);

  const openResource = (url?: string) => {
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #F8F7FC 0%, #F5F3FF 50%, #FAF5FF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            border: "5px solid #E9D5FF",
            borderTopColor: COLORS.purple,
          }}
        />
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: COLORS.purpleDark,
          }}
        >
          Preparing your learning resources...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #F8F7FC 0%, #FAF9FF 50%, #F5F3FF 100%)",
        overflowX: "hidden",
      }}
    >
      <Sidebar />

      {/* FIXED TOP BAR */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 260,
          right: 0,
          height: 64,
          zIndex: 1000,
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(124,58,237,0.10)",
        }}
      >
        <TopBar title="Learning Resources" />
      </div>

      <main
        style={{
          marginLeft: 240,
          paddingTop: 64,
          minHeight: "100vh",
        }}
      >
        {/* HERO / HEADER */}
        <section
          style={{
            position: "relative",
            margin: "18px 22px 0",
            minHeight: 190,
            borderRadius: 24,
            padding: "24px 28px",
            overflow: "hidden",
            color: "white",
            background:
              "linear-gradient(135deg, #4C1D95 0%, #6D28D9 42%, #8B5CF6 72%, #A855F7 100%)",
            boxShadow: "0 18px 45px rgba(91,33,182,0.20)",
          }}
        >
          {/* Decorative graphics */}
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              right: -75,
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
              bottom: -85,
              background: "rgba(255,255,255,0.08)",
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              borderRadius: 24,
              right: 30,
              bottom: 25,
              background: "rgba(255,255,255,0.07)",
              transform: "rotate(18deg)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              maxWidth: 750,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 11px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              <span>✨</span>
              AI-Powered Learning Support
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.15,
                fontWeight: 800,
                letterSpacing: "-0.6px",
              }}
            >
              Learning Resources
            </h1>

            <p
              style={{
                margin: "9px 0 14px",
                maxWidth: 650,
                fontSize: 13.5,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              Explore personalized resources selected to help you close your
              current knowledge gaps and strengthen your understanding.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                🎯 Gap-focused
              </div>

              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                🧠 Adaptive
              </div>

              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                🔎 RAG-powered
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            padding: "18px 22px 40px",
          }}
        >
          {/* ERROR */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 15px",
                borderRadius: 14,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#991B1B",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* KNOWLEDGE GAPS */}
          {knowledgeGaps.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: COLORS.text,
                      letterSpacing: "-0.3px",
                    }}
                  >
                    Your Knowledge Gaps
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      color: COLORS.muted,
                      fontSize: 12,
                    }}
                  >
                    Choose a gap to discover targeted learning resources.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: COLORS.purpleDark,
                    background: COLORS.purpleLight,
                    padding: "6px 10px",
                    borderRadius: 999,
                  }}
                >
                  🧩 {knowledgeGaps.length} gap
                  {knowledgeGaps.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 10,
                }}
              >
                {knowledgeGaps.map((gap, index) => {
                  const gapName = normalizeGap(gap);
                  const active = selectedGap === gapName;

                  return (
                    <button
                      key={`${gapName}-${index}`}
                      onClick={() => handleGapChange(gapName)}
                      style={{
                        border: active
                          ? "1px solid rgba(124,58,237,0.40)"
                          : "1px solid #E5E7EB",
                        background: active
                          ? "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)"
                          : "#FFFFFF",
                        color: active ? "#FFFFFF" : COLORS.text,
                        borderRadius: 16,
                        padding: "12px 13px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: active
                          ? "0 10px 24px rgba(124,58,237,0.18)"
                          : "0 4px 14px rgba(17,24,39,0.04)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.transform =
                            "translateY(-2px)";
                          e.currentTarget.style.borderColor = "#C4B5FD";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.borderColor = "#E5E7EB";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 35,
                          height: 35,
                          minWidth: 35,
                          borderRadius: 11,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: active
                            ? "rgba(255,255,255,0.16)"
                            : "#F5F3FF",
                          fontSize: 17,
                        }}
                      >
                        {active ? "🎯" : "🧩"}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {gapName}
                        </div>

                        {gap?.mastery !== undefined && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 10.5,
                              opacity: active ? 0.82 : 0.7,
                            }}
                          >
                            Current mastery: {Math.round(gap.mastery)}%
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* REMEDIATION STRATEGY */}
          {remediationStrategy && (
            <section
              style={{
                marginBottom: 18,
                borderRadius: 18,
                padding: "14px 16px",
                background:
                  "linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 55%, #EEF2FF 100%)",
                border: "1px solid #E9D5FF",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 21,
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
                  boxShadow: "0 8px 18px rgba(124,58,237,0.18)",
                }}
              >
                ✨
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: COLORS.purpleDark,
                    }}
                  >
                    Personalized Remediation
                  </span>

                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "3px 7px",
                      borderRadius: 999,
                      background: "#EDE9FE",
                      color: "#6D28D9",
                    }}
                  >
                    AI RECOMMENDED
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "#5B5567",
                  }}
                >
                  {remediationStrategy}
                </div>
              </div>
            </section>
          )}

          {/* RECOMMENDED PATH */}
          {recommendedPath.length > 0 && (
            <section style={{ marginBottom: 19 }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: COLORS.text,
                  marginBottom: 10,
                }}
              >
                Recommended Learning Path
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {recommendedPath.map((step, index) => (
                  <div
                    key={`${step}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <div
                      style={{
                        width: 29,
                        height: 29,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 800,
                        background:
                          "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
                        boxShadow: "0 5px 12px rgba(124,58,237,0.16)",
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 10,
                        padding: "7px 10px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {step}
                    </div>

                    {index < recommendedPath.length - 1 && (
                      <div
                        style={{
                          color: "#C4B5FD",
                          fontSize: 15,
                          fontWeight: 700,
                        }}
                      >
                        →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FILTERS */}
          <section
            style={{
              background: "#FFFFFF",
              borderRadius: 17,
              border: "1px solid #E9E7EF",
              padding: "12px 14px",
              marginBottom: 16,
              boxShadow: "0 5px 18px rgba(17,24,39,0.035)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 10,
                    background: COLORS.purpleLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                  }}
                >
                  🎨
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: COLORS.text,
                    }}
                  >
                    Explore Resources
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: COLORS.muted,
                      marginTop: 2,
                    }}
                  >
                    Filter resources by type and difficulty
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 7,
                }}
              >
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  style={{
                    border: "1px solid #DDD6FE",
                    background: "#FAF9FF",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 11,
                    color: COLORS.text,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === "ALL" ? "All Types" : type}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  style={{
                    border: "1px solid #DDD6FE",
                    background: "#FAF9FF",
                    borderRadius: 10,
                    padding: "8px 10px",
                    fontSize: 11,
                    color: COLORS.text,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty === "ALL"
                        ? "All Difficulties"
                        : difficulty}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* RESOURCE COUNT */}
          {!resourceLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 11,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.muted,
                }}
              >
                Showing{" "}
                <span
                  style={{
                    color: COLORS.purpleDark,
                    fontWeight: 800,
                  }}
                >
                  {filteredResources.length}
                </span>{" "}
                learning resource
                {filteredResources.length !== 1 ? "s" : ""}
              </div>

              {selectedGap && (
                <div
                  style={{
                    padding: "5px 9px",
                    background: "#F5F3FF",
                    color: "#6D28D9",
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  🎯 {selectedGap}
                </div>
              )}
            </div>
          )}

          {/* RESOURCE LOADING */}
          {resourceLoading ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 18,
                border: "1px solid #E9E7EF",
                padding: "38px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: "4px solid #E9D5FF",
                  borderTopColor: COLORS.purple,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.purpleDark,
                }}
              >
                Finding the best resources for you...
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.muted,
                }}
              >
                Matching your knowledge gap with relevant content
              </div>
            </div>
          ) : filteredResources.length === 0 ? (
            /* EMPTY STATE */
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                border: "1px solid #E9E7EF",
                padding: "48px 20px",
                textAlign: "center",
                boxShadow: "0 8px 20px rgba(17,24,39,0.035)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, #EDE9FE 0%, #F5D0FE 100%)",
                  fontSize: 27,
                }}
              >
                📚
              </div>

              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: COLORS.text,
                }}
              >
                No resources found
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: COLORS.muted,
                }}
              >
                Try another knowledge gap or adjust your filters.
              </div>
            </div>
          ) : (
            /* RESOURCE GRID */
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(285px, 1fr))",
                gap: 15,
              }}
            >
              {filteredResources.map((resource, index) => {
                const theme = getTypeTheme(resource.type, index);
                const difficultyTheme = getDifficultyTheme(
                  resource.difficulty
                );

                const relevance =
                  resource.relevance_score ?? resource.relevance;

                const duration =
                  resource.estimated_minutes ??
                  resource.duration_minutes;

                return (
                  <article
                    key={resource.id ?? `${resource.title}-${index}`}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 19,
                      overflow: "hidden",
                      border: "1px solid #E9E7EF",
                      boxShadow: "0 7px 22px rgba(17,24,39,0.05)",
                      transition:
                        "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(-5px)";
                      e.currentTarget.style.boxShadow =
                        "0 16px 32px rgba(91,33,182,0.13)";
                      e.currentTarget.style.borderColor = "#DDD6FE";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 7px 22px rgba(17,24,39,0.05)";
                      e.currentTarget.style.borderColor = "#E9E7EF";
                    }}
                  >
                    {/* Dynamic card header */}
                    <div
                      style={{
                        position: "relative",
                        minHeight: 90,
                        padding: "15px 15px 14px",
                        background: theme.gradient,
                        overflow: "hidden",
                      }}
                    >
                      {/* Decorative shapes */}
                      <div
                        style={{
                          position: "absolute",
                          width: 100,
                          height: 100,
                          borderRadius: "50%",
                          right: -40,
                          top: -48,
                          background: "rgba(255,255,255,0.30)",
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          width: 55,
                          height: 55,
                          borderRadius: 16,
                          right: 25,
                          bottom: -25,
                          background: "rgba(255,255,255,0.22)",
                          transform: "rotate(20deg)",
                        }}
                      />

                      <div
                        style={{
                          position: "relative",
                          zIndex: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              minWidth: 42,
                              borderRadius: 14,
                              background: "rgba(255,255,255,0.72)",
                              border:
                                "1px solid rgba(255,255,255,0.60)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                              boxShadow:
                                "0 5px 14px rgba(91,33,182,0.08)",
                            }}
                          >
                            {resource.type
                              ? getTypeIcon(resource.type)
                              : theme.icon}
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 9.5,
                                textTransform: "uppercase",
                                letterSpacing: "0.7px",
                                fontWeight: 800,
                                color: theme.accent,
                              }}
                            >
                              {resource.type || "Resource"}
                            </div>

                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: "#4B5563",
                              }}
                            >
                              Personalized pick
                            </div>
                          </div>
                        </div>

                        {relevance !== undefined && (
                          <div
                            style={{
                              padding: "5px 7px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.78)",
                              color: theme.accent,
                              fontSize: 9.5,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✨ {Math.round(Number(relevance) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card content */}
                    <div style={{ padding: "15px 15px 14px" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 15,
                          lineHeight: 1.35,
                          fontWeight: 800,
                          color: COLORS.text,
                          letterSpacing: "-0.2px",
                        }}
                      >
                        {resource.title}
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 11px",
                          color: COLORS.muted,
                          fontSize: 11.5,
                          lineHeight: 1.6,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: 55,
                        }}
                      >
                        {resource.description ||
                          "A personalized learning resource selected to support your current knowledge gap."}
                      </p>

                      {/* Tags */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 5,
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 7px",
                            borderRadius: 7,
                            background: difficultyTheme.background,
                            color: difficultyTheme.color,
                            fontSize: 9.5,
                            fontWeight: 800,
                          }}
                        >
                          {difficultyTheme.label}
                        </span>

                        {resource.learning_area && (
                          <span
                            style={{
                              padding: "4px 7px",
                              borderRadius: 7,
                              background: "#F3F4F6",
                              color: "#4B5563",
                              fontSize: 9.5,
                              fontWeight: 700,
                            }}
                          >
                            📍 {resource.learning_area}
                          </span>
                        )}

                        {resource.bloom_level !== undefined && (
                          <span
                            style={{
                              padding: "4px 7px",
                              borderRadius: 7,
                              background: "#EEF2FF",
                              color: "#4338CA",
                              fontSize: 9.5,
                              fontWeight: 700,
                            }}
                          >
                            🧠 Bloom {resource.bloom_level}
                          </span>
                        )}
                      </div>

                      {/* Concepts */}
                      {resource.concepts &&
                        resource.concepts.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                fontSize: 9.5,
                                fontWeight: 800,
                                color: "#6B7280",
                                marginBottom: 5,
                              }}
                            >
                              KEY CONCEPTS
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 5,
                              }}
                            >
                              {resource.concepts
                                .slice(0, 4)
                                .map((concept, conceptIndex) => (
                                  <span
                                    key={`${concept}-${conceptIndex}`}
                                    style={{
                                      padding: "4px 7px",
                                      borderRadius: 7,
                                      background:
                                        conceptIndex % 2 === 0
                                          ? "#FAF5FF"
                                          : "#FDF2F8",
                                      color:
                                        conceptIndex % 2 === 0
                                          ? "#7C3AED"
                                          : "#BE185D",
                                      border:
                                        conceptIndex % 2 === 0
                                          ? "1px solid #E9D5FF"
                                          : "1px solid #FBCFE8",
                                      fontSize: 9.5,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {concept}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                      {/* Meta information */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          paddingTop: 10,
                          borderTop: "1px solid #F0EEF4",
                          marginBottom: 12,
                        }}
                      >
                        {duration !== undefined && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 9.5,
                              color: COLORS.muted,
                            }}
                          >
                            ⏱️ {duration} min
                          </span>
                        )}

                        {resource.source && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 9.5,
                              color: COLORS.muted,
                            }}
                          >
                            🌐 {resource.source}
                          </span>
                        )}
                      </div>

                      {/* Button */}
                      <button
                        onClick={() => openResource(resource.url)}
                        disabled={!resource.url}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: 11,
                          padding: "10px 12px",
                          background: resource.url
                            ? `linear-gradient(135deg, ${theme.accent} 0%, #A855F7 100%)`
                            : "#E5E7EB",
                          color: resource.url ? "#FFFFFF" : "#9CA3AF",
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: resource.url
                            ? "pointer"
                            : "not-allowed",
                          boxShadow: resource.url
                            ? `0 7px 16px ${theme.accent}28`
                            : "none",
                          transition:
                            "transform 0.18s ease, box-shadow 0.18s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (resource.url) {
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        {resource.url
                          ? "Open Learning Resource  →"
                          : "Resource Unavailable"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}