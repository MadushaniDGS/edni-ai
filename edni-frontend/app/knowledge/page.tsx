"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeStatus = "mastered" | "in-progress" | "gap" | "locked" | "not-started";

interface KNode {
    id: string;
    label: string;
    x: number;
    y: number;
    status: NodeStatus;
    mastery: number;
    category: string;
    description: string;
    prereqs: string[];
    bloomLevel: number;
    estimatedHours: number;
}

interface KEdge {
    from: string;
    to: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<NodeStatus, { border: string; bg: string; text: string; label: string }> = {
    "mastered": { border: "#06B6D4", bg: "#ECFEFF", text: "#0E7490", label: "Mastered" },
    "in-progress": { border: "#8B5CF6", bg: "#F5F3FF", text: "#6D28D9", label: "In Progress" },
    "gap": { border: "#EF4444", bg: "#FEF2F2", text: "#991B1B", label: "Critical Gap" },
    "locked": { border: "#D1D5DB", bg: "#F9FAFB", text: "#9CA3AF", label: "Locked" },
    "not-started": { border: "#E5E7EB", bg: "#FAFAFA", text: "#6B7280", label: "Not Started" },
};

const STATUS_ICON: Record<NodeStatus, string> = {
    "mastered": "✓",
    "in-progress": "↗",
    "gap": "⚠",
    "locked": "🔒",
    "not-started": "○",
};

const NODES: KNode[] = [
    { id: "vars", label: "Variables & Types", x: 360, y: 60, status: "mastered", mastery: 98, category: "Foundations", description: "Primitive types and variable scoping.", prereqs: [], bloomLevel: 1, estimatedHours: 2 },
    { id: "loops", label: "Loops & Iteration", x: 200, y: 140, status: "mastered", mastery: 96, category: "Foundations", description: "For, while loops and iteration patterns.", prereqs: ["vars"], bloomLevel: 2, estimatedHours: 3 },
    { id: "functions", label: "Functions", x: 520, y: 140, status: "mastered", mastery: 92, category: "Foundations", description: "Function definition, parameters, and scope.", prereqs: ["vars"], bloomLevel: 2, estimatedHours: 3 },
    { id: "arrays", label: "Arrays & Strings", x: 130, y: 320, status: "mastered", mastery: 95, category: "Data Structures", description: "Array operations and string manipulation.", prereqs: ["loops"], bloomLevel: 2, estimatedHours: 4 },
    { id: "sorting", label: "Sorting Algorithms", x: 200, y: 540, status: "mastered", mastery: 90, category: "Algorithms", description: "Sorting and their complexities.", prereqs: ["arrays"], bloomLevel: 3, estimatedHours: 6 },
    { id: "graphs", label: "Graphs", x: 490, y: 440, status: "gap", mastery: 22, category: "Data Structures", description: "Graph representations and traversals.", prereqs: [], bloomLevel: 4, estimatedHours: 8 },
];

const EDGES: KEdge[] = [
    { from: "vars", to: "loops" },
    { from: "vars", to: "functions" },
    { from: "loops", to: "arrays" },
    { from: "arrays", to: "sorting" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }: { active: string; setActive: (id: string) => void }) {
    const NAV_ITEMS = [
        { id: "dashboard", icon: "⊞", label: "Dashboard" },
        { id: "knowledge", icon: "🗺️", label: "Knowledge Map" },
        { id: "profile", icon: "👤", label: "Profile" },
    ];

    return (
        <aside style={{
            width: 240, minHeight: "100vh", background: "white",
            borderRight: "1px solid #F0F0F0",
            display: "flex", flexDirection: "column",
            position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
        }}>
            <div style={{ padding: "22px 20px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "linear-gradient(135deg,#6C63FF,#4F46E5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, color: "white", fontWeight: 800,
                    }}>E</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#4F46E5" }}>Edni AI</div>
                </div>
            </div>
            <nav style={{ flex: 1, padding: "0 12px" }}>
                {NAV_ITEMS.map((item) => {
                    const on = active === item.id;
                    return (
                        <button key={item.id} onClick={() => setActive(item.id)} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 12px", borderRadius: 10, border: "none",
                            background: on ? "#EEF2FF" : "transparent",
                            color: on ? "#4F46E5" : "#6B7280",
                            fontSize: 13.5, fontWeight: on ? 700 : 500,
                            cursor: "pointer", width: "100%",
                            borderLeft: on ? "3px solid #4F46E5" : "3px solid transparent",
                        }}>
                            <span style={{ fontSize: 16 }}>{item.icon}</span>
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KnowledgePage() {
    const router = useRouter();
    const [active, setActive] = useState("knowledge");
    const [selectedNode, setSelectedNode] = useState<KNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [liveNodes, setLiveNodes] = useState<KNode[]>(NODES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem("edni_access");
        if (!token) {
            router.push("/login");
            return;
        }
        setLoading(false);
    }, [router]);

    // Filter nodes by search
    const visibleNodes = liveNodes.filter((n) =>
        search === "" || n.label.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: "#F7F8FC", minHeight: "100vh", display: "flex" }}>
            <Sidebar active={active} setActive={setActive} />

            <main style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>

                {/* Top bar */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "0 24px", height: 64, borderBottom: "1px solid #F0F0F0",
                    background: "white", flexShrink: 0,
                }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Knowledge Map</h1>

                    <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "0 14px", height: 38, maxWidth: 240,
                        background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 20, flex: 1, marginLeft: 20,
                    }}>
                        <span style={{ color: "#9CA3AF", fontSize: 14 }}>🔍</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search concepts..."
                            style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "#374151", outline: "none" }}
                        />
                    </div>

                    <div style={{ marginLeft: "auto" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6C63FF,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800 }}>
                            A
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                    {/* Canvas */}
                    <div
                        ref={containerRef}
                        style={{
                            flex: 1, overflow: "auto", position: "relative",
                            background: "linear-gradient(135deg, #F0F4FF 0%, #F7F8FC 100%)",
                            padding: "40px",
                        }}
                    >
                        {error && (
                            <div style={{ padding: "12px 16px", marginBottom: 20, borderRadius: 10, background: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", fontSize: 13 }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                            {visibleNodes.map((node) => {
                                const s = STATUS_STYLE[node.status];
                                const isHov = hoveredNode === node.id;
                                const isSel = selectedNode?.id === node.id;

                                return (
                                    <div
                                        key={node.id}
                                        onMouseEnter={() => setHoveredNode(node.id)}
                                        onMouseLeave={() => setHoveredNode(null)}
                                        onClick={() => setSelectedNode(isSel ? null : node)}
                                        style={{
                                            padding: "16px",
                                            borderRadius: 12,
                                            background: s.bg,
                                            border: `2px solid ${isSel ? "#4F46E5" : s.border}`,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: isHov || isSel ? "0 8px 24px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.06)",
                                            transform: isHov ? "scale(1.05)" : isSel ? "scale(1.03)" : "scale(1)",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                                            <span style={{ fontSize: 24 }}>{STATUS_ICON[node.status]}</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: s.text, padding: "2px 8px", background: "white", borderRadius: 20, border: `1px solid ${s.border}` }}>
                                                {s.label}
                                            </span>
                                        </div>

                                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: "0 0 6px 0" }}>{node.label}</h3>
                                        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px 0", lineHeight: 1.4 }}>{node.description}</p>

                                        {node.status !== "locked" && (
                                            <div style={{ marginBottom: 10 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Mastery</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: s.text }}>{node.mastery}%</span>
                                                </div>
                                                <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                                                    <div style={{
                                                        height: "100%",
                                                        width: `${node.mastery}%`,
                                                        background: node.mastery >= 80 ? "#06B6D4" : node.mastery >= 50 ? "#8B5CF6" : "#EF4444",
                                                        borderRadius: 3,
                                                    }} />
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                                            <div>
                                                <span style={{ color: "#9CA3AF" }}>Category</span>
                                                <div style={{ color: "#374151", fontWeight: 600 }}>{node.category}</div>
                                            </div>
                                            <div>
                                                <span style={{ color: "#9CA3AF" }}>Time</span>
                                                <div style={{ color: "#374151", fontWeight: 600 }}>{node.estimatedHours}h</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Detail Panel */}
                    {selectedNode && (
                        <div style={{
                            width: 300, borderLeft: "1px solid #F0F0F0", background: "white",
                            display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto",
                            padding: "20px",
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{selectedNode.label}</h2>
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    style={{
                                        width: 28, height: 28, borderRadius: 8, border: "1.5px solid #E5E7EB",
                                        background: "white", fontSize: 16, cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >✕</button>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase" }}>Description</div>
                                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>{selectedNode.description}</p>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase" }}>Mastery Level</div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: "#374151" }}>Progress</span>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: "#4F46E5" }}>{selectedNode.mastery}%</span>
                                </div>
                                <div style={{ height: 8, background: "#F0F0F0", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%", width: `${selectedNode.mastery}%`,
                                        background: "linear-gradient(90deg,#6C63FF,#4F46E5)",
                                    }} />
                                </div>
                            </div>

                            <button
                                style={{
                                    padding: "11px", borderRadius: 10, border: "none",
                                    background: selectedNode.status === "locked" ? "#E5E7EB" : "linear-gradient(135deg,#6C63FF,#4F46E5)",
                                    color: selectedNode.status === "locked" ? "#9CA3AF" : "white",
                                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                                    boxShadow: selectedNode.status === "locked" ? "none" : "0 3px 10px rgba(108,99,255,0.28)",
                                }}
                            >
                                {selectedNode.status === "mastered" ? "Review Topic" : selectedNode.status === "locked" ? "🔒 Locked" : "Start Learning →"}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            <style>{`* { box-sizing: border-box; }`}</style>
        </div>
    );
}