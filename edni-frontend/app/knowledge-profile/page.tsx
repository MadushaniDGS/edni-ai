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
                    <TopBar title="Knowledge Profile" />

                    <div style={styles.loadingContainer}>
                        <div style={styles.loadingGlow}>
                            <div style={styles.spinner}></div>
                        </div>

                        <div style={styles.loadingBadge}>
                            ✨ PERSONALIZED ANALYSIS
                        </div>

                        <h2 style={styles.loadingTitle}>
                            Loading Knowledge Profile
                        </h2>

                        <p style={styles.loadingText}>
                            Analyzing your learning profile...
                        </p>
                    </div>
                </div>
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
                    <TopBar title="Knowledge Profile" />

                    <div style={styles.errorContainer}>
                        <div style={styles.errorDecorativeCircle}></div>

                        <div style={styles.errorIcon}>!</div>

                        <div style={styles.errorBadge}>
                            PROFILE UNAVAILABLE
                        </div>

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
                            <span style={styles.buttonArrow}>→</span>
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

    const bloomData = BLOOM_LEVELS.map((level) => ({
        ...level,
        mastery: getBloomMastery(
            profile.bloom_summary,
            level.id,
            level.label
        ),
    }));

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
                <TopBar title="Knowledge Profile" />

                <div style={styles.content}>
                    {/* ==================================================
                        PAGE HEADER
                    ================================================== */}

                    <div style={styles.header}>
                        <div style={styles.headerLeft}>
                            <div style={styles.eyebrow}>
                                ✨ PERSONALIZED LEARNING PROFILE
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
                            <div style={styles.cycleGlow}></div>

                            <div style={styles.cycleIcon}>◈</div>

                            <div style={styles.cycleInfo}>
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
                    </div>

                    {/* ==================================================
                        HERO
                    ================================================== */}

                    <section style={styles.hero}>
                        <div style={styles.heroPatternOne}></div>
                        <div style={styles.heroPatternTwo}></div>

                        <div style={styles.heroLeft}>
                            <div style={styles.heroBadge}>
                                <span>🎯</span>
                                YOUR CURRENT PERFORMANCE
                            </div>

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
                                            }deg, #ddd6fe ${overallMastery * 3.6
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

                                <div style={styles.heroTextArea}>
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
                                                    `linear-gradient(90deg, ${getMasteryColor(
                                                        overallMastery
                                                    )}, #8B5CF6)`,
                                            }}
                                        />
                                    </div>

                                    <div style={styles.progressLabels}>
                                        <span>0%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.thetaCard}>
                            <div style={styles.thetaBackgroundCircle}></div>

                            <div style={styles.thetaIcon}>
                                θ
                            </div>

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
                            gradient="linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)"
                            color="#7C3AED"
                        />

                        <StatCard
                            icon="◉"
                            label="Questions"
                            value={String(profile.total_questions)}
                            description="Questions assessed"
                            gradient="linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%)"
                            color="#4F46E5"
                        />

                        <StatCard
                            icon="◷"
                            label="Diagnostic Time"
                            value={formatTime(
                                profile.diagnostic_time_sec
                            )}
                            description="Assessment duration"
                            gradient="linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)"
                            color="#8B5CF6"
                        />

                        <StatCard
                            icon="▦"
                            label="Learning Areas"
                            value={String(learningAreas.length)}
                            description="Areas evaluated"
                            gradient="linear-gradient(135deg, #E0E7FF 0%, #DBEAFE 100%)"
                            color="#6366F1"
                        />
                    </div>

                    {/* ==================================================
                        BLOOM TAXONOMY
                    ================================================== */}

                    <SectionHeader
                        eyebrow="🧠 COGNITIVE PERFORMANCE"
                        title="Bloom's Taxonomy"
                        description="Your mastery across different levels of thinking."
                    />

                    <div style={styles.bloomGrid}>
                        {bloomData.map((level, index) => {
                            const bloomGradients = [
                                "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
                                "linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%)",
                                "linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)",
                                "linear-gradient(135deg, #E0E7FF 0%, #DBEAFE 100%)",
                                "linear-gradient(135deg, #DDD6FE 0%, #E0E7FF 100%)",
                                "linear-gradient(135deg, #EDE9FE 0%, #BFDBFE 100%)",
                            ];

                            return (
                                <div
                                    key={level.id}
                                    style={styles.bloomCard}
                                >
                                    <div
                                        style={{
                                            ...styles.bloomAccent,
                                            background:
                                                bloomGradients[index],
                                        }}
                                    />

                                    <div style={styles.bloomTop}>
                                        <div
                                            style={{
                                                ...styles.bloomIcon,
                                                background:
                                                    bloomGradients[index],
                                            }}
                                        >
                                            {level.icon}
                                        </div>

                                        <div style={styles.bloomNumber}>
                                            0{level.id}
                                        </div>
                                    </div>

                                    <h3 style={styles.bloomTitle}>
                                        {level.label}
                                    </h3>

                                    <p style={styles.bloomDescription}>
                                        {level.description}
                                    </p>

                                    <div style={styles.bloomValueRow}>
                                        <div
                                            style={{
                                                ...styles.bloomValue,
                                                color: getMasteryColor(
                                                    level.mastery
                                                ),
                                            }}
                                        >
                                            {level.mastery.toFixed(0)}%
                                        </div>

                                        <div
                                            style={{
                                                ...styles.bloomStatusPill,
                                                color: getMasteryColor(
                                                    level.mastery
                                                ),
                                                background:
                                                    `${getMasteryColor(
                                                        level.mastery
                                                    )}12`,
                                            }}
                                        >
                                            {getMasteryLabel(
                                                level.mastery
                                            )}
                                        </div>
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
                                                    `linear-gradient(90deg, ${getMasteryColor(
                                                        level.mastery
                                                    )}, #8B5CF6)`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ==================================================
                        LEARNING AREAS
                    ================================================== */}

                    <SectionHeader
                        eyebrow="📚 SUBJECT PERFORMANCE"
                        title="Learning Area Performance"
                        description="See how you performed across each learning area."
                    />

                    {learningAreas.length === 0 ? (
                        <EmptyState text="No learning area data available." />
                    ) : (
                        <div style={styles.areaGrid}>
                            {learningAreas.map(([area, mastery], index) => {
                                const numericMastery =
                                    Number(mastery) || 0;

                                const areaGradients = [
                                    "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
                                    "linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%)",
                                    "linear-gradient(135deg, #F3E8FF 0%, #EDE9FE 100%)",
                                    "linear-gradient(135deg, #E0E7FF 0%, #DBEAFE 100%)",
                                ];

                                return (
                                    <div
                                        key={area}
                                        style={styles.areaCard}
                                    >
                                        <div
                                            style={{
                                                ...styles.areaTopStrip,
                                                background:
                                                    areaGradients[
                                                    index %
                                                    areaGradients.length
                                                    ],
                                            }}
                                        />

                                        <div
                                            style={
                                                styles.areaCardHeader
                                            }
                                        >
                                            <div
                                                style={{
                                                    ...styles.areaIcon,
                                                    background:
                                                        areaGradients[
                                                        index %
                                                        areaGradients.length
                                                        ],
                                                }}
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
                                                        `linear-gradient(90deg, ${getMasteryColor(
                                                            numericMastery
                                                        )}, #6366F1)`,
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
                        eyebrow="⚠️ ATTENTION REQUIRED"
                        title="Critical Knowledge Gaps"
                        description="Concepts that may require additional study or remediation."
                    />

                    {normalizedGaps.length === 0 ? (
                        <div style={styles.successCard}>
                            <div style={styles.successGlow}></div>

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
                        eyebrow="🔬 DETAILED ANALYSIS"
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
                                                    className="expand-icon"
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

                                                                            <strong
                                                                                style={{
                                                                                    color: getMasteryColor(
                                                                                        Number(
                                                                                            result.mastery ||
                                                                                            0
                                                                                        )
                                                                                    ),
                                                                                }}
                                                                            >
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
                                                                                        `linear-gradient(90deg, ${getMasteryColor(
                                                                                            Number(
                                                                                                result.mastery ||
                                                                                                0
                                                                                            )
                                                                                        )}, #8B5CF6)`,
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

                @media (max-width: 1200px) {
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 900px) {
                    .main-content {
                        margin-left: 0 !important;
                    }

                    .hero {
                        grid-template-columns: 1fr !important;
                    }

                    .bloom-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }

                    .area-grid {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 650px) {
                    .stats-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .bloom-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .heroMasteryRow {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }

                    .header {
                        flex-direction: column !important;
                    }

                    .cycleCard {
                        width: 100% !important;
                    }

                    .conceptSummary {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 16px !important;
                    }

                    .conceptRight {
                        width: 100% !important;
                        justify-content: space-between !important;
                    }

                    .detailGrid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }

                    .bloomResultGrid {
                        grid-template-columns: 1fr !important;
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
    gradient,
    color,
}: {
    icon: string;
    label: string;
    value: string;
    description: string;
    gradient: string;
    color: string;
}) {
    return (
        <div
            style={{
                ...styles.statCard,
                borderTop: `3px solid ${color}`,
            }}
        >
            <div
                style={{
                    ...styles.statIcon,
                    background: gradient,
                    color,
                }}
            >
                {icon}
            </div>

            <div style={styles.statContent}>
                <span style={styles.statLabel}>{label}</span>

                <strong style={styles.statValue}>{value}</strong>

                <span style={styles.statDescription}>
                    {description}
                </span>
            </div>

            <div
                style={{
                    ...styles.statDecoration,
                    background: gradient,
                }}
            />
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
            "linear-gradient(135deg, #F8F7FC 0%, #F5F7FF 50%, #FAF5FF 100%)",
        color: "#0f172a",
        overflowX: "hidden",
    },

    main: {
        marginLeft: "240px",
        minHeight: "100vh",
    },

    content: {
        maxWidth: "1500px",
        margin: "0 auto",
        padding: "30px 38px 60px",
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "24px",
        marginBottom: "24px",
    },

    headerLeft: {
        position: "relative",
    },

    eyebrow: {
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 12px",
        borderRadius: "999px",
        background:
            "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
        color: "#6D28D9",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "1.3px",
        marginBottom: "10px",
    },

    pageTitle: {
        margin: 0,
        fontSize: "34px",
        lineHeight: 1.1,
        fontWeight: 800,
        letterSpacing: "-1px",
        background:
            "linear-gradient(90deg, #4C1D95 0%, #6366F1 58%, #2563EB 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },

    subtitle: {
        margin: "9px 0 0",
        color: "#64748b",
        fontSize: "13px",
        maxWidth: "650px",
        lineHeight: 1.6,
    },

    cycleCard: {
        minWidth: "190px",
        position: "relative",
        overflow: "hidden",
        padding: "16px 18px",
        borderRadius: "18px",
        background:
            "linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 55%, #EFF6FF 100%)",
        border: "1px solid #DDD6FE",
        boxShadow: "0 10px 30px rgba(91, 33, 182, 0.08)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },

    cycleGlow: {
        position: "absolute",
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        right: "-35px",
        top: "-35px",
        background:
            "radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)",
    },

    cycleIcon: {
        width: "40px",
        height: "40px",
        minWidth: "40px",
        borderRadius: "12px",
        background:
            "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        fontWeight: 800,
        boxShadow: "0 7px 16px rgba(99,102,241,0.18)",
    },

    cycleInfo: {
        position: "relative",
        zIndex: 2,
    },

    cycleLabel: {
        fontSize: "9px",
        fontWeight: 800,
        color: "#94a3b8",
        letterSpacing: "1.2px",
    },

    cycleNumber: {
        marginTop: "3px",
        fontSize: "23px",
        fontWeight: 800,
        background:
            "linear-gradient(90deg, #6D28D9, #2563EB)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },

    cycleStatus: {
        marginTop: "2px",
        fontSize: "10px",
        color: "#64748b",
    },

    // ========================================================
    // HERO
    // ========================================================

    hero: {
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 280px",
        gap: "15px",
        marginBottom: "17px",
        overflow: "hidden",
    },

    heroPatternOne: {
        position: "absolute",
        width: "230px",
        height: "230px",
        borderRadius: "50%",
        right: "170px",
        top: "-130px",
        background:
            "radial-gradient(circle, rgba(139,92,246,0.09), transparent 70%)",
        pointerEvents: "none",
    },

    heroPatternTwo: {
        position: "absolute",
        width: "180px",
        height: "180px",
        borderRadius: "50%",
        left: "-80px",
        bottom: "-110px",
        background:
            "radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%)",
        pointerEvents: "none",
    },

    heroLeft: {
        position: "relative",
        overflow: "hidden",
        padding: "25px",
        borderRadius: "21px",
        background:
            "linear-gradient(135deg, #FFFFFF 0%, #FAF9FF 54%, #F7F9FF 100%)",
        border: "1px solid #E5E7EB",
        boxShadow: "0 12px 34px rgba(91,33,182,0.065)",
    },

    heroBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "5px 9px",
        borderRadius: "999px",
        background:
            "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
        color: "#6D28D9",
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "0.5px",
        marginBottom: "12px",
    },

    heroEyebrow: {
        fontSize: "10px",
        fontWeight: 800,
        color: "#64748b",
        letterSpacing: "1.4px",
        marginBottom: "17px",
    },

    heroMasteryRow: {
        display: "flex",
        alignItems: "center",
        gap: "24px",
    },

    masteryCircle: {
        width: "138px",
        height: "138px",
        minWidth: "138px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow:
            "0 12px 30px rgba(124,58,237,0.10)",
    },

    masteryCircleInner: {
        width: "112px",
        height: "112px",
        borderRadius: "50%",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        boxShadow:
            "inset 0 0 0 1px rgba(226,232,240,0.8)",
    },

    masteryNumber: {
        fontSize: "24px",
        fontWeight: 800,
        lineHeight: 1,
    },

    masteryCircleText: {
        marginTop: "6px",
        fontSize: "10px",
        color: "#94a3b8",
        fontWeight: 600,
    },

    heroTextArea: {
        flex: 1,
        minWidth: 0,
    },

    heroTitle: {
        margin: "0 0 6px",
        fontSize: "24px",
        fontWeight: 800,
        background:
            "linear-gradient(90deg, #4C1D95, #6366F1)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },

    heroDescription: {
        margin: 0,
        color: "#64748b",
        fontSize: "12.5px",
        lineHeight: 1.6,
        maxWidth: "500px",
    },

    heroProgress: {
        width: "100%",
        maxWidth: "440px",
        height: "8px",
        marginTop: "17px",
        borderRadius: "999px",
        background: "#EDE9FE",
        overflow: "hidden",
    },

    heroProgressFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 0.5s ease",
    },

    progressLabels: {
        width: "100%",
        maxWidth: "440px",
        display: "flex",
        justifyContent: "space-between",
        marginTop: "5px",
        color: "#94a3b8",
        fontSize: "9px",
        fontWeight: 600,
    },

    thetaCard: {
        position: "relative",
        overflow: "hidden",
        padding: "24px",
        borderRadius: "21px",
        background:
            "linear-gradient(145deg, #4C1D95 0%, #6D28D9 42%, #6366F1 76%, #2563EB 100%)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        boxShadow:
            "0 14px 35px rgba(91,33,182,0.20)",
    },

    thetaBackgroundCircle: {
        position: "absolute",
        width: "160px",
        height: "160px",
        borderRadius: "50%",
        right: "-80px",
        top: "-70px",
        background: "rgba(255,255,255,0.09)",
    },

    thetaIcon: {
        width: "55px",
        height: "55px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.13)",
        border:
            "1px solid rgba(255,255,255,0.16)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "27px",
        fontWeight: 700,
        position: "relative",
        zIndex: 2,
    },

    thetaLabel: {
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "1.3px",
        opacity: 0.72,
        position: "relative",
        zIndex: 2,
    },

    thetaValue: {
        fontSize: "32px",
        fontWeight: 800,
        marginTop: "3px",
        position: "relative",
        zIndex: 2,
    },

    thetaDescription: {
        fontSize: "10.5px",
        opacity: 0.76,
        marginTop: "2px",
        position: "relative",
        zIndex: 2,
    },

    // ========================================================
    // STATS
    // ========================================================

    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        marginBottom: "48px",
    },

    statCard: {
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "16px",
        background: "#FFFFFF",
        border:
            "1px solid #E7E5EE",
        borderRadius: "16px",
        boxShadow:
            "0 6px 20px rgba(17,24,39,0.04)",
    },

    statDecoration: {
        position: "absolute",
        width: "70px",
        height: "70px",
        borderRadius: "50%",
        right: "-30px",
        top: "-30px",
        opacity: 0.45,
    },

    statIcon: {
        width: "42px",
        height: "42px",
        minWidth: "42px",
        borderRadius: "13px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        fontWeight: 800,
        position: "relative",
        zIndex: 2,
    },

    statContent: {
        minWidth: 0,
        position: "relative",
        zIndex: 2,
    },

    statLabel: {
        display: "block",
        fontSize: "9px",
        fontWeight: 800,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.7px",
    },

    statValue: {
        display: "block",
        marginTop: "2px",
        fontSize: "21px",
        fontWeight: 800,
        color: "#0f172a",
    },

    statDescription: {
        display: "block",
        marginTop: "2px",
        fontSize: "9.5px",
        color: "#94a3b8",
    },

    // ========================================================
    // SECTION
    // ========================================================

    sectionHeader: {
        marginBottom: "16px",
    },

    sectionEyebrow: {
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "1.4px",
        color: "#6D28D9",
        marginBottom: "5px",
    },

    sectionTitle: {
        margin: 0,
        fontSize: "23px",
        fontWeight: 800,
        letterSpacing: "-0.4px",
        color: "#1E293B",
    },

    sectionDescription: {
        margin: "5px 0 0",
        fontSize: "12px",
        color: "#64748b",
    },

    // ========================================================
    // BLOOM
    // ========================================================

    bloomGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "13px",
        marginBottom: "48px",
    },

    bloomCard: {
        position: "relative",
        overflow: "hidden",
        padding: "18px",
        background: "#FFFFFF",
        border: "1px solid #E7E5EE",
        borderRadius: "17px",
        boxShadow:
            "0 6px 20px rgba(17,24,39,0.04)",
    },

    bloomAccent: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "4px",
    },

    bloomTop: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    bloomIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
    },

    bloomNumber: {
        fontSize: "10px",
        fontWeight: 800,
        color: "#CBD5E1",
    },

    bloomTitle: {
        margin: "14px 0 4px",
        fontSize: "15px",
        fontWeight: 800,
    },

    bloomDescription: {
        margin: 0,
        minHeight: "34px",
        color: "#64748b",
        fontSize: "10.5px",
        lineHeight: 1.5,
    },

    bloomValueRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        marginTop: "14px",
        marginBottom: "8px",
    },

    bloomValue: {
        fontSize: "23px",
        fontWeight: 800,
    },

    bloomStatusPill: {
        padding: "4px 7px",
        borderRadius: "999px",
        fontSize: "8.5px",
        fontWeight: 800,
    },

    progressTrack: {
        width: "100%",
        height: "6px",
        borderRadius: "999px",
        background: "#EDE9FE",
        overflow: "hidden",
    },

    progressFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 0.4s ease",
    },

    statusText: {
        marginTop: "7px",
        fontSize: "10px",
        fontWeight: 700,
    },

    // ========================================================
    // LEARNING AREAS
    // ========================================================

    areaGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "13px",
        marginBottom: "48px",
    },

    areaCard: {
        position: "relative",
        overflow: "hidden",
        padding: "18px",
        borderRadius: "17px",
        background: "#FFFFFF",
        border: "1px solid #E7E5EE",
        boxShadow:
            "0 6px 20px rgba(17,24,39,0.04)",
    },

    areaTopStrip: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "4px",
    },

    areaCardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "11px",
        marginBottom: "14px",
    },

    areaIcon: {
        width: "41px",
        height: "41px",
        minWidth: "41px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: "16px",
        color: "#5B21B6",
    },

    areaTitle: {
        margin: 0,
        fontSize: "14px",
        fontWeight: 800,
    },

    areaStatus: {
        display: "block",
        marginTop: "2px",
        color: "#94a3b8",
        fontSize: "9.5px",
    },

    areaValue: {
        fontSize: "19px",
        fontWeight: 800,
    },

    // ========================================================
    // GAPS
    // ========================================================

    gapList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        marginBottom: "48px",
    },

    gapCard: {
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: "13px",
        padding: "17px",
        background:
            "linear-gradient(135deg, #FFFFFF 0%, #FFF7F7 100%)",
        border: "1px solid #FECACA",
        borderLeft: "4px solid #EF4444",
        borderRadius: "15px",
        boxShadow:
            "0 5px 17px rgba(17,24,39,0.035)",
    },

    gapIcon: {
        width: "36px",
        height: "36px",
        minWidth: "36px",
        borderRadius: "11px",
        background:
            "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
        color: "#DC2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: "15px",
    },

    gapHeader: {
        display: "flex",
        alignItems: "center",
        gap: "9px",
        flexWrap: "wrap",
    },

    gapTitle: {
        margin: 0,
        fontSize: "14px",
        fontWeight: 800,
    },

    gapArea: {
        margin: "4px 0 0",
        color: "#64748b",
        fontSize: "10.5px",
    },

    gapMastery: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "8px",
        fontSize: "10.5px",
        color: "#64748b",
    },

    severityBadge: {
        display: "inline-flex",
        padding: "4px 7px",
        borderRadius: "999px",
        fontSize: "8.5px",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
    },

    successCard: {
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: "18px",
        marginBottom: "48px",
        borderRadius: "16px",
        background:
            "linear-gradient(135deg, #F0FDF4 0%, #EFF6FF 100%)",
        border: "1px solid #BBF7D0",
    },

    successGlow: {
        position: "absolute",
        width: "130px",
        height: "130px",
        borderRadius: "50%",
        right: "-65px",
        top: "-65px",
        background:
            "radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)",
    },

    successIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background:
            "linear-gradient(135deg, #DCFCE7 0%, #DBEAFE 100%)",
        color: "#16A34A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        position: "relative",
        zIndex: 2,
    },

    successTitle: {
        margin: 0,
        fontSize: "14px",
        fontWeight: 800,
        color: "#166534",
        position: "relative",
        zIndex: 2,
    },

    successText: {
        margin: "4px 0 0",
        fontSize: "10.5px",
        color: "#4D7C0F",
        position: "relative",
        zIndex: 2,
    },

    // ========================================================
    // CONCEPTS
    // ========================================================

    conceptList: {
        display: "flex",
        flexDirection: "column",
        gap: "9px",
        marginBottom: "45px",
    },

    conceptDetails: {
        background: "#FFFFFF",
        border: "1px solid #E7E5EE",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow:
            "0 5px 18px rgba(17,24,39,0.035)",
    },

    conceptSummary: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "17px 19px",
        cursor: "pointer",
    },

    conceptMain: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },

    conceptIndex: {
        width: "36px",
        height: "36px",
        minWidth: "36px",
        borderRadius: "11px",
        background:
            "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6D28D9",
        fontSize: "10px",
        fontWeight: 800,
    },

    conceptTitle: {
        margin: 0,
        fontSize: "13.5px",
        fontWeight: 800,
    },

    conceptArea: {
        margin: "3px 0 0",
        color: "#94a3b8",
        fontSize: "10px",
    },

    conceptRight: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },

    conceptMastery: {
        fontSize: "17px",
        fontWeight: 800,
    },

    expandIcon: {
        width: "27px",
        height: "27px",
        borderRadius: "8px",
        background:
            "linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6D28D9",
        fontSize: "17px",
        transition: "transform 0.2s ease",
    },

    conceptDetailsContent: {
        padding: "0 19px 20px",
        borderTop: "1px solid #F1F5F9",
    },

    detailGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "9px",
        paddingTop: "16px",
    },

    detailItem: {
        padding: "12px",
        borderRadius: "11px",
        background:
            "linear-gradient(135deg, #FAFAFC 0%, #F8FAFF 100%)",
        border: "1px solid #F1F5F9",
    },

    detailLabel: {
        display: "block",
        fontSize: "9px",
        color: "#94a3b8",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.4px",
    },

    detailValue: {
        display: "block",
        marginTop: "4px",
        fontSize: "11.5px",
        color: "#334155",
    },

    prerequisite: {
        display: "flex",
        alignItems: "center",
        gap: "7px",
        marginTop: "13px",
        padding: "10px 12px",
        borderRadius: "10px",
        background:
            "linear-gradient(135deg, #FFF7ED 0%, #FDF2F8 100%)",
        color: "#C2410C",
        fontSize: "10.5px",
        fontWeight: 600,
    },

    bloomResults: {
        marginTop: "18px",
    },

    bloomResultsTitle: {
        margin: "0 0 10px",
        fontSize: "12px",
        fontWeight: 800,
    },

    bloomResultGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "9px",
    },

    bloomResult: {
        padding: "12px",
        borderRadius: "11px",
        background:
            "linear-gradient(135deg, #FAFAFC 0%, #F8FAFF 100%)",
        border: "1px solid #F1F5F9",
    },

    bloomResultTop: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        marginBottom: "8px",
        fontSize: "10.5px",
        fontWeight: 700,
    },

    resultMeta: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "7px",
        fontSize: "9px",
        color: "#94a3b8",
    },

    // ========================================================
    // EMPTY
    // ========================================================

    emptyState: {
        padding: "40px 20px",
        textAlign: "center",
        background:
            "linear-gradient(135deg, #FFFFFF 0%, #F8F7FF 100%)",
        border: "1px dashed #C4B5FD",
        borderRadius: "17px",
        marginBottom: "48px",
        color: "#64748b",
    },

    emptyIcon: {
        width: "48px",
        height: "48px",
        margin: "0 auto 8px",
        borderRadius: "14px",
        background:
            "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
        color: "#7C3AED",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "25px",
    },

    // ========================================================
    // FOOTER
    // ========================================================

    footer: {
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        paddingTop: "20px",
        borderTop: "1px solid #E5E7EB",
        color: "#64748b",
        fontSize: "10.5px",
    },

    footerLabel: {
        marginRight: "7px",
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
        position: "relative",
    },

    loadingGlow: {
        width: "82px",
        height: "82px",
        borderRadius: "26px",
        background:
            "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
            "0 14px 35px rgba(99,102,241,0.12)",
    },

    spinner: {
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        border: "4px solid #DDD6FE",
        borderTopColor: "#6366F1",
        animation: "spin 0.8s linear infinite",
    },

    loadingBadge: {
        marginTop: "20px",
        padding: "5px 9px",
        borderRadius: "999px",
        background:
            "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
        color: "#6D28D9",
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "0.8px",
    },

    loadingTitle: {
        margin: "10px 0 5px",
        fontSize: "20px",
        fontWeight: 800,
    },

    loadingText: {
        margin: 0,
        color: "#64748b",
        fontSize: "12px",
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
        position: "relative",
        overflow: "hidden",
    },

    errorDecorativeCircle: {
        position: "absolute",
        width: "280px",
        height: "280px",
        borderRadius: "50%",
        background:
            "radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)",
        top: "15%",
        right: "18%",
        pointerEvents: "none",
    },

    errorIcon: {
        width: "64px",
        height: "64px",
        borderRadius: "20px",
        background:
            "linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)",
        color: "#DC2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "27px",
        fontWeight: 900,
        position: "relative",
        zIndex: 2,
    },

    errorBadge: {
        marginTop: "14px",
        padding: "5px 9px",
        borderRadius: "999px",
        background:
            "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)",
        color: "#6D28D9",
        fontSize: "9px",
        fontWeight: 800,
        letterSpacing: "0.7px",
        position: "relative",
        zIndex: 2,
    },

    errorTitle: {
        margin: "12px 0 6px",
        fontSize: "22px",
        fontWeight: 800,
        position: "relative",
        zIndex: 2,
    },

    errorText: {
        maxWidth: "500px",
        margin: "0 0 18px",
        color: "#64748b",
        fontSize: "12.5px",
        lineHeight: 1.6,
        position: "relative",
        zIndex: 2,
    },

    primaryButton: {
        border: "none",
        borderRadius: "11px",
        padding: "11px 16px",
        background:
            "linear-gradient(135deg, #7C3AED 0%, #6366F1 55%, #3B82F6 100%)",
        color: "#FFFFFF",
        fontSize: "11.5px",
        fontWeight: 800,
        cursor: "pointer",
        boxShadow:
            "0 9px 20px rgba(99,102,241,0.20)",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        position: "relative",
        zIndex: 2,
    },

    buttonArrow: {
        fontSize: "15px",
    },
};