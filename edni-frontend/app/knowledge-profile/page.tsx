"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ============================================================
// TYPES
// ============================================================

type BloomResult = {
    bloom_label?: string;
    theta?: number;
    mastery?: number;
    gap_severity?: string;
    questions_seen?: number;
    correct?: number;
};

type ConceptProfile = {
    concept: string;
    learning_area: string;
    overall_mastery: number;
    highest_gap_severity?: string;
    highest_gap_level?: number;
    prerequisite_gap?: boolean;
    remediation_priority?: number;
    bloom_results?: Record<string, BloomResult>;
};

type CriticalGap =
    | string
    | {
        concept?: string;
        mastery?: number;
        severity?: string;
        area?: string;
    };

type KnowledgeProfile = {
    id: string;
    student_id: string;
    diagnostic_id: string;
    feedback_cycle: number;
    overall_theta: number;
    overall_mastery: number;
    bloom_summary: Record<string, any>;
    learning_area_summary: Record<string, number>;
    critical_gaps: CriticalGap[];
    concept_profiles: ConceptProfile[];
    total_questions: number;
    correct_answers: number;
    diagnostic_time_sec: number;
    created_at?: string;
};

// ============================================================
// BLOOM LEVELS
// ============================================================

const BLOOM_LEVELS = [
    {
        id: "1",
        label: "Remember",
        description: "Recall facts and basic concepts",
        icon: "🧠",
    },
    {
        id: "2",
        label: "Understand",
        description: "Explain ideas and concepts",
        icon: "💡",
    },
    {
        id: "3",
        label: "Apply",
        description: "Use information in new situations",
        icon: "⚙️",
    },
    {
        id: "4",
        label: "Analyze",
        description: "Break information into parts",
        icon: "🔍",
    },
    {
        id: "5",
        label: "Evaluate",
        description: "Justify decisions and solutions",
        icon: "⚖️",
    },
    {
        id: "6",
        label: "Create",
        description: "Produce new ideas or solutions",
        icon: "🚀",
    },
];

// ============================================================
// HELPERS
// ============================================================

function getMasteryColor(value: number) {
    if (value >= 80) return "#16a34a";
    if (value >= 60) return "#ca8a04";
    if (value >= 40) return "#ea580c";
    return "#dc2626";
}

function getSeverityColor(severity?: string) {
    switch (severity?.toLowerCase()) {
        case "critical":
            return "#dc2626";

        case "high":
            return "#ea580c";

        case "medium":
            return "#ca8a04";

        case "low":
            return "#16a34a";

        default:
            return "#64748b";
    }
}

function getMasteryLabel(value: number) {
    if (value >= 80) return "Excellent";
    if (value >= 60) return "Good";
    if (value >= 40) return "Developing";
    return "Needs Attention";
}

function formatTime(seconds: number) {
    if (!seconds || seconds <= 0) return "0 sec";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (minutes === 0) {
        return `${remainingSeconds} sec`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}

function getBloomMastery(
    summary: Record<string, any> | undefined,
    id: string,
    label: string
): number {
    if (!summary) return 0;

    const possibleKeys = [
        id,
        `level_${id}`,
        `bloom_${id}`,
        label,
        label.toLowerCase(),
        `level${id}`,
    ];

    for (const key of possibleKeys) {
        const value = summary[key];

        if (typeof value === "number") {
            return value;
        }

        if (value && typeof value === "object") {
            if (typeof value.mastery === "number") {
                return value.mastery;
            }

            if (typeof value.overall_mastery === "number") {
                return value.overall_mastery;
            }

            if (typeof value.value === "number") {
                return value.value;
            }
        }
    }

    return 0;
}

// ============================================================
// PAGE
// ============================================================

export default function KnowledgeProfilePage() {
    const router = useRouter();

    const [profile, setProfile] = useState<KnowledgeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ========================================================
    // FETCH PROFILE
    // ========================================================

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError("");

                const token = localStorage.getItem("edni_access");

                if (!token) {
                    router.push("/login");
                    return;
                }

                const response = await axios.get(
                    `${API_URL}/knowledge-profile`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setProfile(response.data);
            } catch (err: any) {
                console.error("Knowledge profile error:", err);

                if (err?.response?.status === 401) {
                    localStorage.removeItem("edni_access");
                    router.push("/login");
                    return;
                }

                if (err?.response?.status === 404) {
                    setError(
                        "No knowledge profile found. Please complete the diagnostic assessment first."
                    );
                } else {
                    setError(
                        "Unable to load your knowledge profile. Please try again."
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
        return (
            <div style={styles.page}>
                <Sidebar />
                <div style={styles.main}>
                    <TopBar />

                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>

                        <h2 style={styles.loadingTitle}>
                            Loading Knowledge Profile
                        </h2>

                        <p style={styles.loadingText}>
                            Analyzing your learning profile...
                        </p>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes spin {
                        to {
                            transform: rotate(360deg);
                        }
                    }

                    .spinner {
                        animation: spin 0.8s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    // ========================================================
    // ERROR
    // ========================================================

    if (error || !profile) {
        return (
            <div style={styles.page}>
                <Sidebar />

                <div style={styles.main}>
                    <TopBar />

                    <div style={styles.errorContainer}>
                        <div style={styles.errorIcon}>!</div>

                        <h2 style={styles.errorTitle}>
                            Knowledge Profile Unavailable
                        </h2>

                        <p style={styles.errorText}>
                            {error ||
                                "No knowledge profile is available yet."}
                        </p>

                        <button
                            onClick={() => router.push("/diagnostic")}
                            style={styles.primaryButton}
                        >
                            Take Diagnostic Assessment
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================================
    // CALCULATIONS
    // ========================================================

    const overallMastery = Number(profile.overall_mastery || 0);
    const overallTheta = Number(profile.overall_theta || 0);

    const accuracy =
        profile.total_questions > 0
            ? (profile.correct_answers / profile.total_questions) * 100
            : 0;

    const learningAreas = Object.entries(
        profile.learning_area_summary || {}
    );

    // IMPORTANT:
    // No useMemo here. This avoids the useMemo error.
    const bloomData = BLOOM_LEVELS.map((level) => ({
        ...level,
        mastery: getBloomMastery(
            profile.bloom_summary,
            level.id,
            level.label
        ),
    }));

    // Normalize critical gaps so objects are never rendered directly.
    const normalizedGaps = (profile.critical_gaps || []).map((gap) => {
        if (typeof gap === "string") {
            return {
                concept: gap,
                mastery: undefined,
                severity: undefined,
                area: undefined,
            };
        }

        return {
            concept: gap?.concept || "Knowledge Gap",
            mastery:
                typeof gap?.mastery === "number"
                    ? gap.mastery
                    : undefined,
            severity: gap?.severity,
            area: gap?.area,
        };
    });

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div style={styles.page}>
            <Sidebar />

            <div style={styles.main}>
                <TopBar />

                <div style={styles.content}>
                    {/* ==================================================
                        HEADER
                    ================================================== */}

                    <div style={styles.header}>
                        <div>
                            <div style={styles.eyebrow}>
                                PERSONALIZED LEARNING PROFILE
                            </div>

                            <h1 style={styles.pageTitle}>
                                Knowledge Profile
                            </h1>

                            <p style={styles.subtitle}>
                                Understand your current knowledge,
                                strengths, and areas that need improvement.
                            </p>
                        </div>

                        <div style={styles.cycleCard}>
                            <div style={styles.cycleLabel}>
                                DIAGNOSTIC CYCLE
                            </div>

                            <div style={styles.cycleNumber}>
                                #{profile.feedback_cycle || 1}
                            </div>

                            <div style={styles.cycleStatus}>
                                Latest assessment
                            </div>
                        </div>
                    </div>

                    {/* ==================================================
                        HERO
                    ================================================== */}

                    <section style={styles.hero}>
                        <div style={styles.heroLeft}>
                            <div style={styles.heroEyebrow}>
                                OVERALL MASTERY
                            </div>

                            <div style={styles.heroMasteryRow}>
                                <div
                                    style={{
                                        ...styles.masteryCircle,
                                        background: `conic-gradient(${getMasteryColor(
                                            overallMastery
                                        )} ${overallMastery * 3.6
                                            }deg, #e2e8f0 ${overallMastery * 3.6
                                            }deg)`,
                                    }}
                                >
                                    <div style={styles.masteryCircleInner}>
                                        <strong
                                            style={{
                                                ...styles.masteryNumber,
                                                color: getMasteryColor(
                                                    overallMastery
                                                ),
                                            }}
                                        >
                                            {overallMastery.toFixed(1)}%
                                        </strong>

                                        <span
                                            style={styles.masteryCircleText}
                                        >
                                            mastery
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h2 style={styles.heroTitle}>
                                        {getMasteryLabel(overallMastery)}
                                    </h2>

                                    <p style={styles.heroDescription}>
                                        Your overall performance across the
                                        diagnostic assessment.
                                    </p>

                                    <div style={styles.heroProgress}>
                                        <div
                                            style={{
                                                ...styles.heroProgressFill,
                                                width: `${Math.min(
                                                    Math.max(
                                                        overallMastery,
                                                        0
                                                    ),
                                                    100
                                                )}%`,
                                                background:
                                                    getMasteryColor(
                                                        overallMastery
                                                    ),
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.thetaCard}>
                            <div style={styles.thetaIcon}>θ</div>

                            <div>
                                <div style={styles.thetaLabel}>
                                    IRT ABILITY
                                </div>

                                <div style={styles.thetaValue}>
                                    {overallTheta.toFixed(2)}
                                </div>

                                <div style={styles.thetaDescription}>
                                    Estimated ability level
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ==================================================
                        STAT CARDS
                    ================================================== */}

                    <div style={styles.statsGrid}>
                        <StatCard
                            icon="✓"
                            label="Accuracy"
                            value={`${accuracy.toFixed(1)}%`}
                            description={`${profile.correct_answers} correct answers`}
                        />

                        <StatCard
                            icon="◉"
                            label="Questions"
                            value={String(profile.total_questions)}
                            description="Questions assessed"
                        />

                        <StatCard
                            icon="◷"
                            label="Diagnostic Time"
                            value={formatTime(
                                profile.diagnostic_time_sec
                            )}
                            description="Assessment duration"
                        />

                        <StatCard
                            icon="▦"
                            label="Learning Areas"
                            value={String(learningAreas.length)}
                            description="Areas evaluated"
                        />
                    </div>

                    {/* ==================================================
                        BLOOM TAXONOMY
                    ================================================== */}

                    <SectionHeader
                        eyebrow="COGNITIVE PERFORMANCE"
                        title="Bloom's Taxonomy"
                        description="Your mastery across different levels of thinking."
                    />

                    <div style={styles.bloomGrid}>
                        {bloomData.map((level) => (
                            <div
                                key={level.id}
                                style={styles.bloomCard}
                            >
                                <div style={styles.bloomTop}>
                                    <div style={styles.bloomIcon}>
                                        {level.icon}
                                    </div>

                                    <div style={styles.bloomNumber}>
                                        {level.id}
                                    </div>
                                </div>

                                <h3 style={styles.bloomTitle}>
                                    {level.label}
                                </h3>

                                <p style={styles.bloomDescription}>
                                    {level.description}
                                </p>

                                <div style={styles.bloomValue}>
                                    {level.mastery.toFixed(0)}%
                                </div>

                                <div style={styles.progressTrack}>
                                    <div
                                        style={{
                                            ...styles.progressFill,
                                            width: `${Math.min(
                                                Math.max(
                                                    level.mastery,
                                                    0
                                                ),
                                                100
                                            )}%`,
                                            background:
                                                getMasteryColor(
                                                    level.mastery
                                                ),
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        ...styles.statusText,
                                        color: getMasteryColor(
                                            level.mastery
                                        ),
                                    }}
                                >
                                    {getMasteryLabel(level.mastery)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ==================================================
                        LEARNING AREAS
                    ================================================== */}

                    <SectionHeader
                        eyebrow="SUBJECT PERFORMANCE"
                        title="Learning Area Performance"
                        description="See how you performed across each learning area."
                    />

                    {learningAreas.length === 0 ? (
                        <EmptyState text="No learning area data available." />
                    ) : (
                        <div style={styles.areaGrid}>
                            {learningAreas.map(([area, mastery]) => {
                                const numericMastery =
                                    Number(mastery) || 0;

                                return (
                                    <div
                                        key={area}
                                        style={styles.areaCard}
                                    >
                                        <div
                                            style={
                                                styles.areaCardHeader
                                            }
                                        >
                                            <div
                                                style={
                                                    styles.areaIcon
                                                }
                                            >
                                                {area
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div
                                                style={{
                                                    flex: 1,
                                                }}
                                            >
                                                <h3
                                                    style={
                                                        styles.areaTitle
                                                    }
                                                >
                                                    {area}
                                                </h3>

                                                <span
                                                    style={
                                                        styles.areaStatus
                                                    }
                                                >
                                                    {getMasteryLabel(
                                                        numericMastery
                                                    )}
                                                </span>
                                            </div>

                                            <strong
                                                style={{
                                                    ...styles.areaValue,
                                                    color: getMasteryColor(
                                                        numericMastery
                                                    ),
                                                }}
                                            >
                                                {numericMastery.toFixed(
                                                    1
                                                )}
                                                %
                                            </strong>
                                        </div>

                                        <div
                                            style={
                                                styles.progressTrack
                                            }
                                        >
                                            <div
                                                style={{
                                                    ...styles.progressFill,
                                                    width: `${Math.min(
                                                        Math.max(
                                                            numericMastery,
                                                            0
                                                        ),
                                                        100
                                                    )}%`,
                                                    background:
                                                        getMasteryColor(
                                                            numericMastery
                                                        ),
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ==================================================
                        CRITICAL GAPS
                    ================================================== */}

                    <SectionHeader
                        eyebrow="ATTENTION REQUIRED"
                        title="Critical Knowledge Gaps"
                        description="Concepts that may require additional study or remediation."
                    />

                    {normalizedGaps.length === 0 ? (
                        <div style={styles.successCard}>
                            <div style={styles.successIcon}>✓</div>

                            <div>
                                <h3 style={styles.successTitle}>
                                    No critical gaps detected
                                </h3>

                                <p style={styles.successText}>
                                    Your current profile does not contain
                                    any critical knowledge gaps.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={styles.gapList}>
                            {normalizedGaps.map((gap, index) => (
                                <div
                                    key={`${gap.concept}-${index}`}
                                    style={styles.gapCard}
                                >
                                    <div style={styles.gapIcon}>
                                        !
                                    </div>

                                    <div
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        <div
                                            style={
                                                styles.gapHeader
                                            }
                                        >
                                            <h3
                                                style={
                                                    styles.gapTitle
                                                }
                                            >
                                                {gap.concept}
                                            </h3>

                                            {gap.severity && (
                                                <span
                                                    style={{
                                                        ...styles.severityBadge,
                                                        color: getSeverityColor(
                                                            gap.severity
                                                        ),
                                                        background:
                                                            `${getSeverityColor(
                                                                gap.severity
                                                            )}15`,
                                                    }}
                                                >
                                                    {gap.severity}
                                                </span>
                                            )}
                                        </div>

                                        {gap.area && (
                                            <p
                                                style={
                                                    styles.gapArea
                                                }
                                            >
                                                {gap.area}
                                            </p>
                                        )}

                                        {typeof gap.mastery ===
                                            "number" && (
                                                <div
                                                    style={
                                                        styles.gapMastery
                                                    }
                                                >
                                                    <span>
                                                        Mastery
                                                    </span>

                                                    <strong>
                                                        {gap.mastery.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </strong>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ==================================================
                        CONCEPT ANALYSIS
                    ================================================== */}

                    <SectionHeader
                        eyebrow="DETAILED ANALYSIS"
                        title="Concept-Level Analysis"
                        description="Explore your performance on individual concepts."
                    />

                    {profile.concept_profiles?.length === 0 ? (
                        <EmptyState text="No concept-level data available." />
                    ) : (
                        <div style={styles.conceptList}>
                            {profile.concept_profiles.map(
                                (concept, index) => (
                                    <details
                                        key={`${concept.concept}-${index}`}
                                        style={styles.conceptDetails}
                                    >
                                        <summary
                                            style={
                                                styles.conceptSummary
                                            }
                                        >
                                            <div
                                                style={
                                                    styles.conceptMain
                                                }
                                            >
                                                <div
                                                    style={
                                                        styles.conceptIndex
                                                    }
                                                >
                                                    {String(
                                                        index + 1
                                                    ).padStart(
                                                        2,
                                                        "0"
                                                    )}
                                                </div>

                                                <div>
                                                    <h3
                                                        style={
                                                            styles.conceptTitle
                                                        }
                                                    >
                                                        {
                                                            concept.concept
                                                        }
                                                    </h3>

                                                    <p
                                                        style={
                                                            styles.conceptArea
                                                        }
                                                    >
                                                        {
                                                            concept.learning_area
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div
                                                style={
                                                    styles.conceptRight
                                                }
                                            >
                                                <div
                                                    style={{
                                                        ...styles.conceptMastery,
                                                        color: getMasteryColor(
                                                            concept.overall_mastery
                                                        ),
                                                    }}
                                                >
                                                    {Number(
                                                        concept.overall_mastery ||
                                                        0
                                                    ).toFixed(
                                                        0
                                                    )}
                                                    %
                                                </div>

                                                <span
                                                    style={{
                                                        ...styles.severityBadge,
                                                        color: getSeverityColor(
                                                            concept.highest_gap_severity
                                                        ),
                                                        background:
                                                            `${getSeverityColor(
                                                                concept.highest_gap_severity
                                                            )}15`,
                                                    }}
                                                >
                                                    {concept.highest_gap_severity ||
                                                        "Normal"}
                                                </span>

                                                <span
                                                    style={
                                                        styles.expandIcon
                                                    }
                                                >
                                                    +
                                                </span>
                                            </div>
                                        </summary>

                                        <div
                                            style={
                                                styles.conceptDetailsContent
                                            }
                                        >
                                            <div
                                                style={
                                                    styles.detailGrid
                                                }
                                            >
                                                <DetailItem
                                                    label="Overall Mastery"
                                                    value={`${Number(
                                                        concept.overall_mastery ||
                                                        0
                                                    ).toFixed(
                                                        1
                                                    )}%`}
                                                />

                                                <DetailItem
                                                    label="Learning Area"
                                                    value={
                                                        concept.learning_area
                                                    }
                                                />

                                                <DetailItem
                                                    label="Highest Gap"
                                                    value={
                                                        concept.highest_gap_severity ||
                                                        "None"
                                                    }
                                                />

                                                <DetailItem
                                                    label="Priority"
                                                    value={
                                                        concept.remediation_priority !==
                                                            undefined
                                                            ? String(
                                                                concept.remediation_priority
                                                            )
                                                            : "—"
                                                    }
                                                />
                                            </div>

                                            {concept.prerequisite_gap && (
                                                <div
                                                    style={
                                                        styles.prerequisite
                                                    }
                                                >
                                                    <span>
                                                        ⚠
                                                    </span>

                                                    <span>
                                                        This concept
                                                        has a
                                                        prerequisite
                                                        knowledge gap.
                                                    </span>
                                                </div>
                                            )}

                                            {concept.bloom_results &&
                                                Object.keys(
                                                    concept.bloom_results
                                                ).length >
                                                0 && (
                                                    <div
                                                        style={
                                                            styles.bloomResults
                                                        }
                                                    >
                                                        <h4
                                                            style={
                                                                styles.bloomResultsTitle
                                                            }
                                                        >
                                                            Bloom
                                                            Performance
                                                        </h4>

                                                        <div
                                                            style={
                                                                styles.bloomResultGrid
                                                            }
                                                        >
                                                            {Object.entries(
                                                                concept.bloom_results
                                                            ).map(
                                                                ([
                                                                    key,
                                                                    result,
                                                                ]) => (
                                                                    <div
                                                                        key={
                                                                            key
                                                                        }
                                                                        style={
                                                                            styles.bloomResult
                                                                        }
                                                                    >
                                                                        <div
                                                                            style={
                                                                                styles.bloomResultTop
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {result.bloom_label ||
                                                                                    `Level ${key}`}
                                                                            </span>

                                                                            <strong>
                                                                                {Number(
                                                                                    result.mastery ||
                                                                                    0
                                                                                ).toFixed(
                                                                                    0
                                                                                )}
                                                                                %
                                                                            </strong>
                                                                        </div>

                                                                        <div
                                                                            style={
                                                                                styles.progressTrack
                                                                            }
                                                                        >
                                                                            <div
                                                                                style={{
                                                                                    ...styles.progressFill,
                                                                                    width: `${Math.min(
                                                                                        Math.max(
                                                                                            Number(
                                                                                                result.mastery ||
                                                                                                0
                                                                                            ),
                                                                                            0
                                                                                        ),
                                                                                        100
                                                                                    )}%`,
                                                                                    background:
                                                                                        getMasteryColor(
                                                                                            Number(
                                                                                                result.mastery ||
                                                                                                0
                                                                                            )
                                                                                        ),
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        <div
                                                                            style={
                                                                                styles.resultMeta
                                                                            }
                                                                        >
                                                                            <span>
                                                                                Questions:{" "}
                                                                                {result.questions_seen ??
                                                                                    0}
                                                                            </span>

                                                                            <span>
                                                                                Correct:{" "}
                                                                                {result.correct ??
                                                                                    0}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    </details>
                                )
                            )}
                        </div>
                    )}

                    {/* ==================================================
                        FOOTER
                    ================================================== */}

                    <div style={styles.footer}>
                        <div>
                            <span style={styles.footerLabel}>
                                Diagnostic ID
                            </span>

                            <span style={styles.footerValue}>
                                {profile.diagnostic_id}
                            </span>
                        </div>

                        {profile.created_at && (
                            <div>
                                <span style={styles.footerLabel}>
                                    Completed
                                </span>

                                <span style={styles.footerValue}>
                                    {new Date(
                                        profile.created_at
                                    ).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                details > summary {
                    list-style: none;
                }

                details > summary::-webkit-details-marker {
                    display: none;
                }

                details[open] .expand-icon {
                    transform: rotate(45deg);
                }

                .spinner {
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                @media (max-width: 1200px) {
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 900px) {
                    .hero {
                        grid-template-columns: 1fr;
                    }

                    .bloom-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .area-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 650px) {
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }

                    .bloom-grid {
                        grid-template-columns: 1fr;
                    }

                    .heroMasteryRow {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .header {
                        flex-direction: column;
                    }

                    .cycleCard {
                        width: 100%;
                    }

                    .conceptSummary {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                    }

                    .conceptRight {
                        width: 100%;
                        justify-content: space-between;
                    }
                }
            `}</style>
        </div>
    );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
    icon,
    label,
    value,
    description,
}: {
    icon: string;
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div style={styles.statCard}>
            <div style={styles.statIcon}>{icon}</div>

            <div style={styles.statContent}>
                <span style={styles.statLabel}>{label}</span>

                <strong style={styles.statValue}>{value}</strong>

                <span style={styles.statDescription}>
                    {description}
                </span>
            </div>
        </div>
    );
}

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div style={styles.sectionHeader}>
            <div style={styles.sectionEyebrow}>{eyebrow}</div>

            <h2 style={styles.sectionTitle}>{title}</h2>

            <p style={styles.sectionDescription}>
                {description}
            </p>
        </div>
    );
}

// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div style={styles.detailItem}>
            <span style={styles.detailLabel}>{label}</span>

            <strong style={styles.detailValue}>{value}</strong>
        </div>
    );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ text }: { text: string }) {
    return (
        <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>◌</div>

            <p>{text}</p>
        </div>
    );
}

// ============================================================
// STYLES
// ============================================================

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background:
            "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
        color: "#0f172a",
    },

    main: {
        marginLeft: "240px",
        minHeight: "100vh",
    },

    content: {
        maxWidth: "1500px",
        margin: "0 auto",
        padding: "38px 42px 60px",
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "24px",
        marginBottom: "32px",
    },

    eyebrow: {
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 12px",
        borderRadius: "999px",
        background: "#eef2ff",
        color: "#4f46e5",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "1.5px",
        marginBottom: "12px",
    },

    pageTitle: {
        margin: 0,
        fontSize: "38px",
        lineHeight: 1.1,
        fontWeight: 800,
        letterSpacing: "-1.2px",
        color: "#0f172a",
    },

    subtitle: {
        margin: "10px 0 0",
        color: "#64748b",
        fontSize: "15px",
        maxWidth: "650px",
        lineHeight: 1.6,
    },

    cycleCard: {
        minWidth: "180px",
        padding: "18px 20px",
        borderRadius: "18px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
    },

    cycleLabel: {
        fontSize: "10px",
        fontWeight: 800,
        color: "#94a3b8",
        letterSpacing: "1.3px",
    },

    cycleNumber: {
        marginTop: "5px",
        fontSize: "25px",
        fontWeight: 800,
        color: "#4f46e5",
    },

    cycleStatus: {
        marginTop: "3px",
        fontSize: "12px",
        color: "#64748b",
    },

    // ========================================================
    // HERO
    // ========================================================

    hero: {
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "20px",
        marginBottom: "22px",
    },

    heroLeft: {
        padding: "30px",
        borderRadius: "24px",
        background:
            "linear-gradient(135deg, #ffffff 0%, #f8faff 100%)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 14px 45px rgba(15, 23, 42, 0.07)",
    },

    heroEyebrow: {
        fontSize: "11px",
        fontWeight: 800,
        color: "#64748b",
        letterSpacing: "1.4px",
        marginBottom: "22px",
    },

    heroMasteryRow: {
        display: "flex",
        alignItems: "center",
        gap: "28px",
    },

    masteryCircle: {
        width: "150px",
        height: "150px",
        minWidth: "150px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },

    masteryCircleInner: {
        width: "122px",
        height: "122px",
        borderRadius: "50%",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
    },

    masteryNumber: {
        fontSize: "25px",
        fontWeight: 800,
        lineHeight: 1,
    },

    masteryCircleText: {
        marginTop: "7px",
        fontSize: "11px",
        color: "#94a3b8",
        fontWeight: 600,
    },

    heroTitle: {
        margin: "0 0 7px",
        fontSize: "25px",
        fontWeight: 800,
    },

    heroDescription: {
        margin: 0,
        color: "#64748b",
        fontSize: "14px",
        lineHeight: 1.6,
    },

    heroProgress: {
        width: "100%",
        maxWidth: "420px",
        height: "8px",
        marginTop: "20px",
        borderRadius: "999px",
        background: "#e2e8f0",
        overflow: "hidden",
    },

    heroProgressFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 0.5s ease",
    },

    thetaCard: {
        padding: "28px",
        borderRadius: "24px",
        background:
            "linear-gradient(145deg, #312e81 0%, #4f46e5 100%)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: "18px",
        boxShadow: "0 14px 45px rgba(79, 70, 229, 0.22)",
    },

    thetaIcon: {
        width: "58px",
        height: "58px",
        borderRadius: "17px",
        background: "rgba(255,255,255,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "30px",
        fontWeight: 700,
    },

    thetaLabel: {
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "1.4px",
        opacity: 0.7,
    },

    thetaValue: {
        fontSize: "34px",
        fontWeight: 800,
        marginTop: "4px",
    },

    thetaDescription: {
        fontSize: "12px",
        opacity: 0.75,
        marginTop: "2px",
    },

    // ========================================================
    // STATS
    // ========================================================

    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "16px",
        marginBottom: "58px",
    },

    statCard: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
        padding: "20px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "18px",
        boxShadow: "0 7px 25px rgba(15, 23, 42, 0.045)",
    },

    statIcon: {
        width: "45px",
        height: "45px",
        minWidth: "45px",
        borderRadius: "14px",
        background: "#eef2ff",
        color: "#4f46e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "19px",
        fontWeight: 800,
    },

    statContent: {
        minWidth: 0,
    },

    statLabel: {
        display: "block",
        fontSize: "11px",
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.7px",
    },

    statValue: {
        display: "block",
        marginTop: "3px",
        fontSize: "22px",
        fontWeight: 800,
        color: "#0f172a",
    },

    statDescription: {
        display: "block",
        marginTop: "2px",
        fontSize: "11px",
        color: "#94a3b8",
    },

    // ========================================================
    // SECTION
    // ========================================================

    sectionHeader: {
        marginBottom: "20px",
    },

    sectionEyebrow: {
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "1.5px",
        color: "#6366f1",
        marginBottom: "6px",
    },

    sectionTitle: {
        margin: 0,
        fontSize: "25px",
        fontWeight: 800,
        letterSpacing: "-0.5px",
    },

    sectionDescription: {
        margin: "6px 0 0",
        fontSize: "13px",
        color: "#64748b",
    },

    // ========================================================
    // BLOOM
    // ========================================================

    bloomGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
        marginBottom: "58px",
    },

    bloomCard: {
        padding: "22px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        boxShadow: "0 7px 25px rgba(15, 23, 42, 0.045)",
    },

    bloomTop: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    bloomIcon: {
        width: "43px",
        height: "43px",
        borderRadius: "13px",
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
    },

    bloomNumber: {
        fontSize: "12px",
        fontWeight: 800,
        color: "#cbd5e1",
    },

    bloomTitle: {
        margin: "18px 0 4px",
        fontSize: "17px",
        fontWeight: 800,
    },

    bloomDescription: {
        margin: 0,
        minHeight: "38px",
        color: "#64748b",
        fontSize: "12px",
        lineHeight: 1.5,
    },

    bloomValue: {
        marginTop: "18px",
        fontSize: "27px",
        fontWeight: 800,
    },

    progressTrack: {
        width: "100%",
        height: "7px",
        borderRadius: "999px",
        background: "#e2e8f0",
        overflow: "hidden",
    },

    progressFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 0.4s ease",
    },

    statusText: {
        marginTop: "8px",
        fontSize: "11px",
        fontWeight: 700,
    },

    // ========================================================
    // LEARNING AREAS
    // ========================================================

    areaGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        marginBottom: "58px",
    },

    areaCard: {
        padding: "21px",
        borderRadius: "19px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 7px 25px rgba(15, 23, 42, 0.045)",
    },

    areaCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "13px",
        marginBottom: "16px",
    },

    areaIcon: {
        width: "44px",
        height: "44px",
        minWidth: "44px",
        borderRadius: "13px",
        background: "#eef2ff",
        color: "#4f46e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: "18px",
    },

    areaTitle: {
        margin: 0,
        fontSize: "15px",
        fontWeight: 800,
    },

    areaStatus: {
        display: "block",
        marginTop: "3px",
        color: "#94a3b8",
        fontSize: "11px",
    },

    areaValue: {
        fontSize: "20px",
        fontWeight: 800,
    },

    // ========================================================
    // GAPS
    // ========================================================

    gapList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "58px",
    },

    gapCard: {
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        padding: "20px",
        background: "#ffffff",
        border: "1px solid #fecaca",
        borderLeft: "4px solid #ef4444",
        borderRadius: "16px",
        boxShadow: "0 7px 25px rgba(15, 23, 42, 0.04)",
    },

    gapIcon: {
        width: "38px",
        height: "38px",
        minWidth: "38px",
        borderRadius: "11px",
        background: "#fef2f2",
        color: "#dc2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
    },

    gapHeader: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
    },

    gapTitle: {
        margin: 0,
        fontSize: "15px",
        fontWeight: 800,
    },

    gapArea: {
        margin: "5px 0 0",
        color: "#64748b",
        fontSize: "12px",
    },

    gapMastery: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "10px",
        fontSize: "12px",
        color: "#64748b",
    },

    severityBadge: {
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },

    successCard: {
        display: "flex",
        alignItems: "center",
        gap: "15px",
        padding: "22px",
        marginBottom: "58px",
        borderRadius: "18px",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
    },

    successIcon: {
        width: "42px",
        height: "42px",
        borderRadius: "13px",
        background: "#dcfce7",
        color: "#16a34a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
    },

    successTitle: {
        margin: 0,
        fontSize: "15px",
        fontWeight: 800,
        color: "#166534",
    },

    successText: {
        margin: "4px 0 0",
        fontSize: "12px",
        color: "#4d7c0f",
    },

    // ========================================================
    // CONCEPTS
    // ========================================================

    conceptList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "50px",
    },

    conceptDetails: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "17px",
        overflow: "hidden",
        boxShadow: "0 5px 20px rgba(15, 23, 42, 0.035)",
    },

    conceptSummary: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "19px 21px",
        cursor: "pointer",
    },

    conceptMain: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
    },

    conceptIndex: {
        width: "38px",
        height: "38px",
        minWidth: "38px",
        borderRadius: "11px",
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: "11px",
        fontWeight: 800,
    },

    conceptTitle: {
        margin: 0,
        fontSize: "14px",
        fontWeight: 800,
    },

    conceptArea: {
        margin: "3px 0 0",
        color: "#94a3b8",
        fontSize: "11px",
    },

    conceptRight: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },

    conceptMastery: {
        fontSize: "18px",
        fontWeight: 800,
    },

    expandIcon: {
        width: "28px",
        height: "28px",
        borderRadius: "9px",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontSize: "18px",
        transition: "transform 0.2s ease",
    },

    conceptDetailsContent: {
        padding: "0 21px 22px",
        borderTop: "1px solid #f1f5f9",
    },

    detailGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px",
        paddingTop: "18px",
    },

    detailItem: {
        padding: "14px",
        borderRadius: "13px",
        background: "#f8fafc",
    },

    detailLabel: {
        display: "block",
        fontSize: "10px",
        color: "#94a3b8",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },

    detailValue: {
        display: "block",
        marginTop: "5px",
        fontSize: "13px",
        color: "#334155",
    },

    prerequisite: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "15px",
        padding: "12px 14px",
        borderRadius: "11px",
        background: "#fff7ed",
        color: "#c2410c",
        fontSize: "12px",
        fontWeight: 600,
    },

    bloomResults: {
        marginTop: "20px",
    },

    bloomResultsTitle: {
        margin: "0 0 12px",
        fontSize: "13px",
        fontWeight: 800,
    },

    bloomResultGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "10px",
    },

    bloomResult: {
        padding: "14px",
        borderRadius: "12px",
        background: "#f8fafc",
    },

    bloomResultTop: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        marginBottom: "9px",
        fontSize: "12px",
        fontWeight: 700,
    },

    resultMeta: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "8px",
        fontSize: "10px",
        color: "#94a3b8",
    },

    // ========================================================
    // EMPTY
    // ========================================================

    emptyState: {
        padding: "45px 20px",
        textAlign: "center",
        background: "#ffffff",
        border: "1px dashed #cbd5e1",
        borderRadius: "18px",
        marginBottom: "58px",
        color: "#64748b",
    },

    emptyIcon: {
        fontSize: "30px",
        color: "#94a3b8",
        marginBottom: "8px",
    },

    // ========================================================
    // FOOTER
    // ========================================================

    footer: {
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        paddingTop: "22px",
        borderTop: "1px solid #e2e8f0",
        color: "#64748b",
        fontSize: "12px",
    },

    footerLabel: {
        marginRight: "8px",
        color: "#94a3b8",
        fontWeight: 600,
    },

    footerValue: {
        fontWeight: 700,
        color: "#475569",
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "40px",
    },

    spinner: {
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        border: "4px solid #e2e8f0",
        borderTopColor: "#4f46e5",
        animation: "spin 0.8s linear infinite",
    },

    loadingTitle: {
        margin: "20px 0 5px",
        fontSize: "20px",
        fontWeight: 800,
    },

    loadingText: {
        margin: 0,
        color: "#64748b",
        fontSize: "13px",
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorContainer: {
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "40px",
        textAlign: "center",
    },

    errorIcon: {
        width: "62px",
        height: "62px",
        borderRadius: "20px",
        background: "#fef2f2",
        color: "#dc2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "28px",
        fontWeight: 900,
    },

    errorTitle: {
        margin: "18px 0 7px",
        fontSize: "23px",
        fontWeight: 800,
    },

    errorText: {
        maxWidth: "500px",
        margin: "0 0 20px",
        color: "#64748b",
        fontSize: "14px",
        lineHeight: 1.6,
    },

    primaryButton: {
        border: "none",
        borderRadius: "12px",
        padding: "12px 18px",
        background: "#4f46e5",
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(79, 70, 229, 0.22)",
    },
};