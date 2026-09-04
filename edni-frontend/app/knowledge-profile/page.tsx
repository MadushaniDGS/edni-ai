"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000/api/v1";

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

type KnowledgeProfile = {
    id: string;
    student_id: string;
    diagnostic_id: string;
    feedback_cycle: number;

    overall_theta: number;
    overall_mastery: number;

    bloom_summary: Record<string, any>;
    learning_area_summary: Record<string, number>;

    critical_gaps: string[];

    concept_profiles: ConceptProfile[];

    total_questions: number;
    correct_answers: number;
    diagnostic_time_sec: number;

    created_at?: string;
};

const BLOOM_LEVELS = [
    { id: "1", label: "Remember" },
    { id: "2", label: "Understand" },
    { id: "3", label: "Apply" },
    { id: "4", label: "Analyze" },
    { id: "5", label: "Evaluate" },
    { id: "6", label: "Create" },
];

function getMasteryColor(value: number) {
    if (value >= 80) return "#16a34a";
    if (value >= 60) return "#ca8a04";
    if (value >= 40) return "#ea580c";
    return "#dc2626";
}

function getSeverityColor(severity?: string) {
    if (!severity) return "#64748b";

    const value = severity.toLowerCase();

    if (value.includes("critical")) return "#dc2626";
    if (value.includes("high")) return "#ea580c";
    if (value.includes("medium")) return "#ca8a04";
    if (value.includes("low")) return "#16a34a";

    return "#64748b";
}

function formatTime(seconds?: number) {
    if (!seconds) return "0 sec";

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60);

    if (minutes === 0) {
        return `${remaining} sec`;
    }

    return `${minutes}m ${remaining}s`;
}

export default function KnowledgeProfilePage() {
    const router = useRouter();

    const [profile, setProfile] =
        useState<KnowledgeProfile | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

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
            console.error(
                "Knowledge profile error:",
                err
            );

            if (err.response?.status === 401) {
                localStorage.removeItem("edni_access");
                router.push("/login");
                return;
            }

            if (err.response?.status === 404) {
                setError(
                    "No knowledge profile found. Please complete the diagnostic assessment first."
                );
            } else {
                setError(
                    err.response?.data?.detail ||
                    "Failed to load knowledge profile."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.pageWrapper}>
                <Sidebar />
                <TopBar />
                <div style={styles.mainContent}>
                    <div style={styles.loading}>
                        <div style={styles.spinner} />
                        <p>Loading your knowledge profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.pageWrapper}>
                <Sidebar />
                <TopBar />
                <div style={styles.mainContent}>
                    <div style={styles.emptyCard}>
                        <div style={styles.emptyIcon}>📊</div>

                        <h2 style={styles.emptyTitle}>
                            Knowledge Profile
                        </h2>

                        <p style={styles.emptyText}>
                            {error}
                        </p>

                        <button
                            style={styles.primaryButton}
                            onClick={() =>
                                router.push("/diagnostic")
                            }
                        >
                            Take Diagnostic Assessment
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    const accuracy =
        profile.total_questions > 0
            ? (profile.correct_answers /
                profile.total_questions) *
            100
            : 0;

    return (
        <div style={styles.pageWrapper}>
            <Sidebar />
            <TopBar />

            <div style={styles.mainContent}>
                <div style={styles.container}>

                    {/* HEADER */}
                    <div style={styles.header}>
                        <div>
                            <h1 style={styles.title}>
                                Knowledge Profile
                            </h1>

                            <p style={styles.subtitle}>
                                Your diagnostic-based learning profile
                                across Bloom's Taxonomy.
                            </p>
                        </div>

                        <div style={styles.cycleBadge}>
                            Diagnostic Cycle {profile.feedback_cycle}
                        </div>
                    </div>

                    {/* OVERVIEW CARDS */}
                    <div style={styles.statsGrid}>

                        <StatCard
                            label="Overall Mastery"
                            value={`${Number(
                                profile.overall_mastery || 0
                            ).toFixed(1)}%`}
                            icon="🎯"
                            description="Overall knowledge mastery"
                        />

                        <StatCard
                            label="IRT Ability"
                            value={Number(
                                profile.overall_theta || 0
                            ).toFixed(2)}
                            icon="📈"
                            description="Estimated ability (θ)"
                        />

                        <StatCard
                            label="Accuracy"
                            value={`${accuracy.toFixed(1)}%`}
                            icon="✓"
                            description={`${profile.correct_answers} / ${profile.total_questions} correct`}
                        />

                        <StatCard
                            label="Diagnostic Time"
                            value={formatTime(
                                profile.diagnostic_time_sec
                            )}
                            icon="⏱"
                            description="Assessment completion time"
                        />

                    </div>

                    {/* OVERALL MASTERY */}
                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Overall Mastery
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Your overall estimated mastery from
                                    the diagnostic assessment.
                                </p>
                            </div>

                            <strong
                                style={{
                                    ...styles.largeScore,
                                    color: getMasteryColor(
                                        Number(
                                            profile.overall_mastery || 0
                                        )
                                    ),
                                }}
                            >
                                {Number(
                                    profile.overall_mastery || 0
                                ).toFixed(1)}
                                %
                            </strong>
                        </div>

                        <div style={styles.progressTrack}>
                            <div
                                style={{
                                    ...styles.progressFill,
                                    width: `${Math.min(
                                        100,
                                        Math.max(
                                            0,
                                            Number(
                                                profile.overall_mastery || 0
                                            )
                                        )
                                    )}%`,
                                    background:
                                        getMasteryColor(
                                            Number(
                                                profile.overall_mastery || 0
                                            )
                                        ),
                                }}
                            />
                        </div>
                    </section>

                    {/* BLOOM SUMMARY */}
                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Bloom's Taxonomy
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Performance across the six cognitive
                                    levels.
                                </p>
                            </div>
                        </div>

                        <div style={styles.bloomGrid}>
                            {BLOOM_LEVELS.map((level) => {
                                const data =
                                    profile.bloom_summary[
                                    level.id
                                    ] ??
                                    profile.bloom_summary[
                                    level.label
                                    ];

                                const mastery =
                                    typeof data === "number"
                                        ? data
                                        : Number(
                                            data?.mastery ??
                                            data?.overall_mastery ??
                                            0
                                        );

                                return (
                                    <div
                                        key={level.id}
                                        style={styles.bloomCard}
                                    >
                                        <div style={styles.bloomNumber}>
                                            {level.id}
                                        </div>

                                        <div style={styles.bloomContent}>
                                            <div style={styles.bloomTitle}>
                                                {level.label}
                                            </div>

                                            <div
                                                style={{
                                                    ...styles.bloomScore,
                                                    color:
                                                        getMasteryColor(
                                                            mastery
                                                        ),
                                                }}
                                            >
                                                {mastery.toFixed(1)}%
                                            </div>

                                            <div
                                                style={styles.smallTrack}
                                            >
                                                <div
                                                    style={{
                                                        ...styles.smallFill,
                                                        width: `${Math.min(
                                                            100,
                                                            Math.max(
                                                                0,
                                                                mastery
                                                            )
                                                        )}%`,
                                                        background:
                                                            getMasteryColor(
                                                                mastery
                                                            ),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* LEARNING AREAS */}
                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Learning Area Performance
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Mastery by subject and learning area.
                                </p>
                            </div>
                        </div>

                        <div style={styles.areaList}>
                            {Object.entries(
                                profile.learning_area_summary || {}
                            ).map(([area, mastery]) => (
                                <div
                                    key={area}
                                    style={styles.areaRow}
                                >
                                    <div style={styles.areaInfo}>
                                        <span style={styles.areaName}>
                                            {area}
                                        </span>

                                        <span
                                            style={{
                                                color:
                                                    getMasteryColor(
                                                        Number(mastery)
                                                    ),
                                                fontWeight: 700,
                                            }}
                                        >
                                            {Number(mastery).toFixed(1)}%
                                        </span>
                                    </div>

                                    <div
                                        style={styles.progressTrack}
                                    >
                                        <div
                                            style={{
                                                ...styles.progressFill,
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        Number(mastery)
                                                    )
                                                )}%`,
                                                background:
                                                    getMasteryColor(
                                                        Number(mastery)
                                                    ),
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* CRITICAL GAPS */}
                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Critical Knowledge Gaps
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Areas that require the highest
                                    remediation priority.
                                </p>
                            </div>

                            <span style={styles.gapCount}>
                                {profile.critical_gaps.length} gaps
                            </span>
                        </div>

                        {profile.critical_gaps.length === 0 ? (
                            <div style={styles.successBox}>
                                ✓ No critical knowledge gaps detected.
                            </div>
                        ) : (
                            <div style={styles.gapList}>
                                {profile.critical_gaps.map(
                                    (gap, index) => (
                                        <div
                                            key={index}
                                            style={styles.gapItem}
                                        >
                                            <span style={styles.gapIcon}>
                                                !
                                            </span>

                                            <span>{gap}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </section>

                    {/* CONCEPT PROFILES */}
                    <section style={styles.section}>
                        <div style={styles.sectionHeader}>
                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Concept-Level Analysis
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Detailed mastery and Bloom-level
                                    performance for each concept.
                                </p>
                            </div>
                        </div>

                        <div style={styles.conceptList}>
                            {profile.concept_profiles.map(
                                (concept, index) => (
                                    <ConceptCard
                                        key={`${concept.concept}-${index}`}
                                        concept={concept}
                                    />
                                )
                            )}
                        </div>
                    </section>

                    {/* FOOTER INFO */}
                    <div style={styles.footerInfo}>
                        <span>
                            Diagnostic ID: {profile.diagnostic_id}
                        </span>

                        {profile.created_at && (
                            <span>
                                Completed:{" "}
                                {new Date(
                                    profile.created_at
                                ).toLocaleString()}
                            </span>
                        )}
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    description,
}: {
    label: string;
    value: string;
    icon: string;
    description: string;
}) {
    return (
        <div style={styles.statCard}>
            <div style={styles.statTop}>
                <div style={styles.statIcon}>
                    {icon}
                </div>

                <span style={styles.statLabel}>
                    {label}
                </span>
            </div>

            <div style={styles.statValue}>
                {value}
            </div>

            <div style={styles.statDescription}>
                {description}
            </div>
        </div>
    );
}

function ConceptCard({
    concept,
}: {
    concept: ConceptProfile;
}) {
    return (
        <details style={styles.conceptCard}>
            <summary style={styles.conceptSummary}>
                <div style={styles.conceptMain}>
                    <strong style={styles.conceptName}>
                        {concept.concept}
                    </strong>

                    <span style={styles.conceptArea}>
                        {concept.learning_area}
                    </span>
                </div>

                <div style={styles.conceptRight}>
                    <strong
                        style={{
                            color: getMasteryColor(
                                Number(
                                    concept.overall_mastery || 0
                                )
                            ),
                        }}
                    >
                        {Number(
                            concept.overall_mastery || 0
                        ).toFixed(1)}
                        %
                    </strong>

                    {concept.highest_gap_severity && (
                        <span
                            style={{
                                ...styles.severityBadge,
                                color: getSeverityColor(
                                    concept.highest_gap_severity
                                ),
                            }}
                        >
                            {concept.highest_gap_severity}
                        </span>
                    )}
                </div>
            </summary>

            <div style={styles.conceptDetails}>

                <div style={styles.detailGrid}>
                    <div>
                        <span style={styles.detailLabel}>
                            Overall Mastery
                        </span>

                        <strong>
                            {Number(
                                concept.overall_mastery || 0
                            ).toFixed(1)}
                            %
                        </strong>
                    </div>

                    <div>
                        <span style={styles.detailLabel}>
                            Gap Level
                        </span>

                        <strong>
                            {concept.highest_gap_level ??
                                "None"}
                        </strong>
                    </div>

                    <div>
                        <span style={styles.detailLabel}>
                            Remediation Priority
                        </span>

                        <strong>
                            {concept.remediation_priority ??
                                "—"}
                        </strong>
                    </div>

                    <div>
                        <span style={styles.detailLabel}>
                            Prerequisite Gap
                        </span>

                        <strong>
                            {concept.prerequisite_gap
                                ? "Yes"
                                : "No"}
                        </strong>
                    </div>
                </div>

                <h4 style={styles.subHeading}>
                    Bloom-Level Results
                </h4>

                <div style={styles.conceptBloomGrid}>
                    {Object.entries(
                        concept.bloom_results || {}
                    ).map(([level, result]) => (
                        <div
                            key={level}
                            style={styles.conceptBloom}
                        >
                            <div
                                style={styles.conceptBloomHeader}
                            >
                                <span>
                                    {result.bloom_label ||
                                        `Level ${level}`}
                                </span>

                                <strong
                                    style={{
                                        color:
                                            getMasteryColor(
                                                Number(
                                                    result.mastery || 0
                                                )
                                            ),
                                    }}
                                >
                                    {Number(
                                        result.mastery || 0
                                    ).toFixed(1)}
                                    %
                                </strong>
                            </div>

                            <div
                                style={styles.smallTrack}
                            >
                                <div
                                    style={{
                                        ...styles.smallFill,
                                        width: `${Math.min(
                                            100,
                                            Math.max(
                                                0,
                                                Number(
                                                    result.mastery || 0
                                                )
                                            )
                                        )}%`,
                                        background:
                                            getMasteryColor(
                                                Number(
                                                    result.mastery || 0
                                                )
                                            ),
                                    }}
                                />
                            </div>

                            <div style={styles.resultMeta}>
                                <span>
                                    θ:{" "}
                                    {Number(
                                        result.theta || 0
                                    ).toFixed(2)}
                                </span>

                                <span>
                                    {result.correct ?? 0}/
                                    {result.questions_seen ??
                                        0}{" "}
                                    correct
                                </span>

                                {result.gap_severity && (
                                    <span
                                        style={{
                                            color:
                                                getSeverityColor(
                                                    result.gap_severity
                                                ),
                                        }}
                                    >
                                        {result.gap_severity}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </details>
    );
}

const styles: Record<
    string,
    React.CSSProperties
> = {
    pageWrapper: {
        minHeight: "100vh",
        backgroundColor: "#FAFBFC",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },

    mainContent: {
        marginLeft: "240px",
        paddingTop: "64px",
        minHeight: "100vh",
    },

    container: {
        maxWidth: "1250px",
        margin: "0 auto",
        padding: "40px 32px",
    },

    loading: {
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
    },

    spinner: {
        width: "40px",
        height: "40px",
        border: "3px solid #E5E7EB",
        borderTopColor: "#6366F1",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        marginBottom: "40px",
    },

    title: {
        margin: 0,
        fontSize: "32px",
        fontWeight: 700,
        color: "#111827",
    },

    subtitle: {
        margin: "8px 0 0",
        color: "#6B7280",
        fontSize: "15px",
    },

    cycleBadge: {
        background: "#F3F4F6",
        color: "#6366F1",
        padding: "10px 16px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 600,
        whiteSpace: "nowrap",
        border: "1px solid #E5E7EB",
    },

    statsGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        marginBottom: "32px",
    },

    statCard: {
        background: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px",
        transition: "all 0.2s ease",
        cursor: "pointer",
    },

    statTop: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "14px",
    },

    statIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "8px",
        background: "#F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
    },

    statLabel: {
        color: "#6B7280",
        fontSize: "13px",
        fontWeight: 600,
    },

    statValue: {
        fontSize: "24px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "6px",
    },

    statDescription: {
        color: "#9CA3AF",
        fontSize: "12px",
    },

    section: {
        background: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        marginBottom: "24px",
    },

    sectionTitle: {
        margin: 0,
        fontSize: "18px",
        fontWeight: 700,
        color: "#111827",
    },

    sectionDescription: {
        margin: "6px 0 0",
        color: "#6B7280",
        fontSize: "14px",
    },

    largeScore: {
        fontSize: "28px",
        fontWeight: 700,
    },

    progressTrack: {
        height: "8px",
        background: "#E5E7EB",
        borderRadius: "999px",
        overflow: "hidden",
    },

    progressFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 0.5s ease",
    },

    bloomGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "14px",
    },

    bloomCard: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "16px",
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        backgroundColor: "#F9FAFB",
        transition: "all 0.2s ease",
    },

    bloomNumber: {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: "#F3F4F6",
        color: "#6366F1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "16px",
    },

    bloomContent: {
        flex: 1,
    },

    bloomTitle: {
        fontSize: "13px",
        fontWeight: 600,
        color: "#111827",
    },

    bloomScore: {
        fontSize: "18px",
        fontWeight: 700,
        margin: "6px 0 8px",
    },

    smallTrack: {
        height: "6px",
        background: "#E5E7EB",
        borderRadius: "999px",
        overflow: "hidden",
    },

    smallFill: {
        height: "100%",
        borderRadius: "999px",
    },

    areaList: {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
    },

    areaRow: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },

    areaInfo: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "14px",
        fontWeight: 500,
    },

    areaName: {
        color: "#111827",
    },

    gapCount: {
        background: "#FEE2E2",
        color: "#DC2626",
        padding: "6px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 600,
    },

    gapList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },

    gapItem: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        background: "#FEF2F2",
        border: "1px solid #FEE2E2",
        borderRadius: "10px",
        color: "#7F1D1D",
        fontSize: "14px",
    },

    gapIcon: {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: "#DC2626",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "14px",
        flexShrink: 0,
    },

    successBox: {
        padding: "14px 16px",
        background: "#F0FDF4",
        border: "1px solid #BBFDE2",
        color: "#166534",
        borderRadius: "10px",
        fontSize: "14px",
    },

    conceptList: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },

    conceptCard: {
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#F9FAFB",
    },

    conceptSummary: {
        listStyle: "none",
        cursor: "pointer",
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "15px",
        transition: "all 0.2s ease",
    },

    conceptMain: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },

    conceptName: {
        fontSize: "14px",
        color: "#111827",
    },

    conceptArea: {
        color: "#6B7280",
        fontSize: "12px",
    },

    conceptRight: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },

    severityBadge: {
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
    },

    conceptDetails: {
        borderTop: "1px solid #E5E7EB",
        padding: "16px",
        background: "#FFFFFF",
    },

    detailGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "14px",
        marginBottom: "20px",
    },

    detailLabel: {
        display: "block",
        color: "#6B7280",
        fontSize: "12px",
        marginBottom: "4px",
        fontWeight: 500,
    },

    subHeading: {
        margin: "0 0 12px",
        fontSize: "13px",
        fontWeight: 600,
        color: "#111827",
    },

    conceptBloomGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "12px",
    },

    conceptBloom: {
        background: "#F9FAFB",
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        padding: "12px",
    },

    conceptBloomHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
        fontSize: "12px",
        fontWeight: 600,
        color: "#111827",
    },

    resultMeta: {
        display: "flex",
        justifyContent: "space-between",
        gap: "8px",
        marginTop: "8px",
        color: "#6B7280",
        fontSize: "11px",
    },

    footerInfo: {
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        color: "#9CA3AF",
        fontSize: "12px",
        padding: "16px",
        backgroundColor: "#F9FAFB",
        borderRadius: "10px",
        border: "1px solid #E5E7EB",
    },

    emptyCard: {
        maxWidth: "500px",
        margin: "80px auto",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "40px",
        textAlign: "center",
        border: "1px solid #E5E7EB",
    },

    emptyIcon: {
        fontSize: "48px",
        marginBottom: "16px",
    },

    emptyTitle: {
        margin: 0,
        fontSize: "22px",
        fontWeight: 700,
        color: "#111827",
    },

    emptyText: {
        color: "#6B7280",
        lineHeight: 1.6,
        margin: "12px 0 24px",
        fontSize: "14px",
    },

    primaryButton: {
        border: "none",
        background: "#6366F1",
        color: "#ffffff",
        padding: "10px 20px",
        borderRadius: "8px",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: "14px",
        transition: "all 0.2s ease",
    },
};