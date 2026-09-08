"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/* =========================================================
   TYPES
========================================================= */

interface Resource {
  id: string;
  title: string;
  description?: string;
  type?: string;
  duration?: string;
  difficulty?: string;
  concepts?: string[];
  tags?: string[];
  url: string;
  rating?: number;
  views?: number;
  priority?: string;
  related_gaps?: string[];
  bloom_level?: number;
  relevance_score?: number;
}

interface KnowledgeProfile {
  critical_gaps?: Array<
    | string
    | {
      concept?: string;
      area?: string;
      mastery?: number;
      severity?: string;
    }
  >;
  learning_area_summary?: Record<string, number>;
  concept_profiles?: Array<{
    concept: string;
    overall_mastery: number;
    highest_gap_severity?: string;
  }>;
}

interface RAGResponse {
  resources: Resource[];
  gap_name?: string;
  remediation_strategy?: string;
  recommended_path?: string[];
}

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  primary: "#6366F1",
  primaryDark: "#4F46E5",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  secondary: "#64748B",
  muted: "#94A3B8",
  border: "#E2E8F0",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeGap(gap: KnowledgeProfile["critical_gaps"] extends
  | Array<infer T>
  | undefined
  ? T
  : string): string {
  if (typeof gap === "string") return gap;

  return gap?.concept || gap?.area || "Knowledge Gap";
}

function getTypeIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case "video":
      return "▶";
    case "article":
      return "📄";
    case "interactive":
      return "⚡";
    case "exercise":
      return "✏";
    case "documentation":
    case "docs":
      return "📚";
    default:
      return "🔗";
  }
}

function getTypeStyle(type?: string) {
  switch (type?.toLowerCase()) {
    case "video":
      return {
        background: "#EEF2FF",
        color: "#4F46E5",
      };

    case "interactive":
      return {
        background: "#ECFDF5",
        color: "#059669",
      };

    case "exercise":
      return {
        background: "#FFF7ED",
        color: "#EA580C",
      };

    case "documentation":
    case "docs":
      return {
        background: "#F5F3FF",
        color: "#7C3AED",
      };

    default:
      return {
        background: "#F1F5F9",
        color: "#475569",
      };
  }
}

function getDifficultyStyle(difficulty?: string) {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      return {
        background: "#ECFDF5",
        color: "#047857",
      };

    case "intermediate":
      return {
        background: "#FFFBEB",
        color: "#B45309",
      };

    case "advanced":
      return {
        background: "#FEF2F2",
        color: "#B91C1C",
      };

    default:
      return {
        background: "#F1F5F9",
        color: "#475569",
      };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function LearningResourcesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);

  const [knowledgeGaps, setKnowledgeGaps] = useState<string[]>([]);
  const [selectedGap, setSelectedGap] = useState<string | null>(null);

  const [resources, setResources] = useState<Resource[]>([]);

  const [remediationStrategy, setRemediationStrategy] =
    useState<string>("");

  const [recommendedPath, setRecommendedPath] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  const [error, setError] = useState("");

  /* =========================================================
     AUTH + KNOWLEDGE PROFILE
  ========================================================= */

  useEffect(() => {
    const token =
      localStorage.getItem("edni_access") ||
      sessionStorage.getItem("edni_access");

    if (!token) {
      router.push("/login");
      return;
    }

    fetchKnowledgeProfile(token);
  }, [router]);

  const fetchKnowledgeProfile = async (token: string) => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get<KnowledgeProfile>(
        `${API_URL}/knowledge-profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const gaps = (response.data.critical_gaps || [])
        .map(normalizeGap)
        .filter(Boolean);

      setKnowledgeGaps(gaps);

      if (gaps.length === 0) {
        setError(
          "No knowledge gaps are available yet. Complete a diagnostic assessment first."
        );
        setLoading(false);
        return;
      }

      const firstGap = gaps[0];

      setSelectedGap(firstGap);

      await fetchResources(firstGap, token);
    } catch (err) {
      console.error("Knowledge profile error:", err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem("edni_access");
          sessionStorage.removeItem("edni_access");
          router.push("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
          "Unable to load your knowledge profile."
        );
      } else {
        setError("Unable to load your knowledge profile.");
      }

      setLoading(false);
    }
  };

  /* =========================================================
     REAL RAG RESOURCES
  ========================================================= */

  const fetchResources = async (
    gap: string,
    token?: string
  ) => {
    try {
      setResourceLoading(true);
      setError("");

      const accessToken =
        token ||
        localStorage.getItem("edni_access") ||
        sessionStorage.getItem("edni_access");

      if (!accessToken) {
        router.push("/login");
        return;
      }

      const response = await axios.get<RAGResponse>(
        `${API_URL}/resources/remediate/${encodeURIComponent(gap)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      /*
       * IMPORTANT:
       * Everything below comes from the backend.
       * No fallback/mock resource database is used.
       */

      setResources(response.data.resources || []);

      setRemediationStrategy(
        response.data.remediation_strategy || ""
      );

      setRecommendedPath(
        response.data.recommended_path || []
      );
    } catch (err) {
      console.error("Resource API error:", err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem("edni_access");
          sessionStorage.removeItem("edni_access");
          router.push("/login");
          return;
        }

        if (err.response?.status === 404) {
          setError(
            "The resource recommendation endpoint was not found. Check GET /resources/remediate/{gap} in the backend."
          );
        } else {
          setError(
            err.response?.data?.detail ||
            "Unable to load recommended resources."
          );
        }
      } else {
        setError("Unable to load recommended resources.");
      }

      setResources([]);
      setRemediationStrategy("");
      setRecommendedPath([]);
    } finally {
      setResourceLoading(false);
      setLoading(false);
    }
  };

  /* =========================================================
     FILTERING
  ========================================================= */

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        resource.title.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.concepts?.some((concept) =>
          concept.toLowerCase().includes(query)
        ) ||
        resource.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );

      const matchesType =
        !selectedType ||
        resource.type?.toLowerCase() === selectedType.toLowerCase();

      const matchesDifficulty =
        !selectedDifficulty ||
        resource.difficulty?.toLowerCase() ===
        selectedDifficulty.toLowerCase();

      return (
        matchesSearch &&
        matchesType &&
        matchesDifficulty
      );
    });
  }, [
    resources,
    searchTerm,
    selectedType,
    selectedDifficulty,
  ]);

  /* =========================================================
     OPEN EXTERNAL RESOURCE
  ========================================================= */

  const openResource = (url: string) => {
    if (!url) return;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="spinner" />

          <h3
            style={{
              margin: "20px 0 6px",
              color: COLORS.text,
            }}
          >
            Finding resources for you
          </h3>

          <p
            style={{
              margin: 0,
              color: COLORS.secondary,
              fontSize: 14,
            }}
          >
            Loading your knowledge profile...
          </p>
        </div>

        <style jsx>{`
          .spinner {
            width: 46px;
            height: 46px;
            margin: auto;
            border: 4px solid #e2e8f0;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
      }}
    >
      <Sidebar />

      <div
        style={{
          marginLeft: 240,
          paddingTop: 64,
        }}
      >
        <TopBar />

        {/* HEADER */}

        <section
          style={{
            background:
              "linear-gradient(135deg, #111827 0%, #312E81 100%)",
            color: "white",
            padding: "42px 40px",
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: "auto",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: 20,
                background: "rgba(255,255,255,.12)",
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              AI-PERSONALIZED LEARNING
            </div>

            <h1
              style={{
                margin: "0 0 10px",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              Learning Resources
            </h1>

            <p
              style={{
                margin: 0,
                color: "#CBD5E1",
                maxWidth: 700,
                lineHeight: 1.6,
              }}
            >
              Resources selected according to your actual
              knowledge gaps and remediation needs.
            </p>
          </div>
        </section>

        <main
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "32px 28px 60px",
          }}
        >
          {/* ERROR */}

          {error && (
            <div
              style={{
                padding: 18,
                marginBottom: 24,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 12,
                color: "#B91C1C",
              }}
            >
              <strong>Unable to load resources</strong>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            </div>
          )}

          {/* KNOWLEDGE GAPS */}

          {knowledgeGaps.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      color: COLORS.text,
                    }}
                  >
                    Your Knowledge Gaps
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 13,
                      color: COLORS.secondary,
                    }}
                  >
                    Select a gap to view targeted resources.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {knowledgeGaps.map((gap) => {
                  const active = selectedGap === gap;

                  return (
                    <button
                      key={gap}
                      onClick={() => {
                        setSelectedGap(gap);
                        fetchResources(gap);
                      }}
                      style={{
                        border: active
                          ? `2px solid ${COLORS.primary}`
                          : `1px solid ${COLORS.border}`,
                        background: active
                          ? "#EEF2FF"
                          : COLORS.card,
                        color: active
                          ? COLORS.primaryDark
                          : COLORS.secondary,
                        padding: "11px 16px",
                        borderRadius: 10,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        transition: "all .2s",
                      }}
                    >
                      {gap}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* REMEDIATION */}

          {remediationStrategy && (
            <section
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 22,
                marginBottom: 24,
                boxShadow: "0 2px 8px rgba(15,23,42,.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "#EEF2FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  ✨
                </div>

                <div>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: 15,
                      color: COLORS.text,
                    }}
                  >
                    AI Remediation Strategy
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: COLORS.secondary,
                      lineHeight: 1.6,
                      fontSize: 14,
                    }}
                  >
                    {remediationStrategy}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* RECOMMENDED PATH */}

          {recommendedPath.length > 0 && (
            <section
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 14,
                padding: 22,
                marginBottom: 28,
              }}
            >
              <h3
                style={{
                  margin: "0 0 14px",
                  fontSize: 15,
                  color: "#166534",
                }}
              >
                Recommended Learning Sequence
              </h3>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {recommendedPath
                  .slice(0, 6)
                  .map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 12px",
                        background: "white",
                        borderRadius: 8,
                        border: "1px solid #DCFCE7",
                        fontSize: 13,
                        color: "#166534",
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#DCFCE7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </span>

                      {item}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* FILTERS */}

          <section
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 18,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(250px,1fr) 170px 170px",
                gap: 12,
              }}
            >
              <input
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                placeholder="Search resources, concepts, skills..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 9,
                  outline: "none",
                  fontSize: 14,
                }}
              />

              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value)
                }
                style={{
                  padding: "12px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 9,
                  background: "white",
                  color: COLORS.secondary,
                }}
              >
                <option value="">All Types</option>
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="interactive">
                  Interactive
                </option>
                <option value="exercise">Exercise</option>
                <option value="documentation">
                  Documentation
                </option>
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) =>
                  setSelectedDifficulty(e.target.value)
                }
                style={{
                  padding: "12px",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 9,
                  background: "white",
                  color: COLORS.secondary,
                }}
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">
                  Intermediate
                </option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </section>

          {/* RESOURCE COUNT */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                margin: 0,
                color: COLORS.secondary,
                fontSize: 14,
              }}
            >
              {resourceLoading
                ? "Finding resources..."
                : `${filteredResources.length} resources`}
            </p>

            {selectedGap && (
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 7,
                  background: "#EEF2FF",
                  color: COLORS.primaryDark,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                For: {selectedGap}
              </span>
            )}
          </div>

          {/* RESOURCES */}

          {resourceLoading ? (
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 60,
                textAlign: "center",
              }}
            >
              <div className="smallSpinner" />

              <p
                style={{
                  margin: "16px 0 0",
                  color: COLORS.secondary,
                }}
              >
                Finding personalized resources...
              </p>

              <style jsx>{`
                .smallSpinner {
                  width: 34px;
                  height: 34px;
                  margin: auto;
                  border: 3px solid #e2e8f0;
                  border-top-color: #6366f1;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}</style>
            </div>
          ) : filteredResources.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill,minmax(330px,1fr))",
                gap: 20,
              }}
            >
              {filteredResources.map((resource) => {
                const typeStyle = getTypeStyle(
                  resource.type
                );

                const difficultyStyle =
                  getDifficultyStyle(
                    resource.difficulty
                  );

                return (
                  <article
                    key={resource.id}
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 16,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      transition:
                        "transform .2s, box-shadow .2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 15px 35px rgba(15,23,42,.10)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "none";
                    }}
                  >
                    {/* CARD TOP */}

                    <div
                      style={{
                        padding: "14px 16px",
                        background: typeStyle.background,
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: typeStyle.color,
                        }}
                      >
                        {getTypeIcon(resource.type)}{" "}
                        {resource.type || "Resource"}
                      </span>

                      {resource.difficulty && (
                        <span
                          style={{
                            padding: "5px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              difficultyStyle.background,
                            color:
                              difficultyStyle.color,
                          }}
                        >
                          {resource.difficulty}
                        </span>
                      )}
                    </div>

                    {/* CONTENT */}

                    <div
                      style={{
                        padding: 20,
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <h3
                        style={{
                          margin: "0 0 9px",
                          color: COLORS.text,
                          fontSize: 17,
                          lineHeight: 1.4,
                        }}
                      >
                        {resource.title}
                      </h3>

                      {resource.description && (
                        <p
                          style={{
                            margin: "0 0 16px",
                            color: COLORS.secondary,
                            fontSize: 13,
                            lineHeight: 1.6,
                            flex: 1,
                          }}
                        >
                          {resource.description}
                        </p>
                      )}

                      {/* CONCEPTS */}

                      {resource.concepts &&
                        resource.concepts.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              marginBottom: 16,
                            }}
                          >
                            {resource.concepts
                              .slice(0, 4)
                              .map((concept) => (
                                <span
                                  key={concept}
                                  style={{
                                    padding:
                                      "5px 8px",
                                    background:
                                      "#F1F5F9",
                                    borderRadius: 6,
                                    color:
                                      COLORS.secondary,
                                    fontSize: 11,
                                  }}
                                >
                                  {concept}
                                </span>
                              ))}
                          </div>
                        )}

                      {/* METADATA */}

                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          flexWrap: "wrap",
                          paddingTop: 13,
                          borderTop: `1px solid ${COLORS.border}`,
                          color: COLORS.muted,
                          fontSize: 12,
                        }}
                      >
                        {resource.duration && (
                          <span>
                            ⏱ {resource.duration}
                          </span>
                        )}

                        {resource.bloom_level && (
                          <span>
                            Bloom {resource.bloom_level}
                          </span>
                        )}

                        {resource.relevance_score !==
                          undefined && (
                            <span>
                              {Math.round(
                                resource.relevance_score *
                                100
                              )}
                              % relevant
                            </span>
                          )}
                      </div>
                    </div>

                    {/* ACCESS */}

                    <div
                      style={{
                        padding: 14,
                        borderTop: `1px solid ${COLORS.border}`,
                        background: "#F8FAFC",
                      }}
                    >
                      <button
                        onClick={() =>
                          openResource(resource.url)
                        }
                        disabled={!resource.url}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: 9,
                          padding: "11px 14px",
                          background: resource.url
                            ? COLORS.primary
                            : "#CBD5E1",
                          color: "white",
                          fontWeight: 700,
                          cursor: resource.url
                            ? "pointer"
                            : "not-allowed",
                        }}
                      >
                        Access Resource →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: 60,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  marginBottom: 12,
                }}
              >
                📚
              </div>

              <h3
                style={{
                  margin: "0 0 8px",
                  color: COLORS.text,
                }}
              >
                No resources available
              </h3>

              <p
                style={{
                  margin: 0,
                  color: COLORS.secondary,
                  fontSize: 14,
                }}
              >
                There are currently no resources returned
                by the recommendation service for this
                knowledge gap.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}