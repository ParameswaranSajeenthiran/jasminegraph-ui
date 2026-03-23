'use client';

import { useAppSelector } from "@/redux/hook";
import React, { useEffect, useRef, useState } from "react";
import { DataSet, Network } from "vis-network/standalone";
import { Spin, Progress } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "vis-network/styles/vis-network.css";

/* ========================= Type Definitions ========================= */
interface PathNode {
    id: string;
    label: string;
    name: string;
    partitionID: string;
}
interface PathRel {
    id: string;
    type: string;
    direction: string;
    source?: string;
    target?: string;
}
interface ObjectiveResult {
    hop: number;
    pathObj: {
        pathNodes: PathNode[];
        pathRels: PathRel[];
    };
    score: number;
}
interface Objective {
    id: string;
    query: string;
    search_type: string;
    retrieved_paths: ObjectiveResult[];
}
interface RagResult {
    answer: string;
    plan_type?: string;
    objectives?: Objective[];
}

/* ========================= Partition Colors ========================= */
const PARTITION_COLORS = [
    "#6CB8E6","#5FA8E6","#4E9CD3","#3A86B8",
    "#2C73A8","#1F5A8A","#123E6B","#0B3C5D",
];

/* ========================= Query Graph ========================= */
interface QueryGraphProps {
    pathNodes: PathNode[];
    pathRels: PathRel[];
    seedNodeIds: Set<string>;
}

function QueryGraph({ pathNodes, pathRels, seedNodeIds }: QueryGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<any>(null);
    const edgesRef = useRef<any>(null);
    const networkRef = useRef<Network | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const [progressing, setProgressing] = useState(false);
    const [percent, setPercent] = useState(0);

    // ✅ NEW: search state
    const [searchTerm, setSearchTerm] = useState("");

    /* ✅ Extract relationships */
    const extractRelations = (rels: PathRel[]) => {
        return rels
            .filter((rel) => rel.source && rel.target)
            .map((rel) => ({
                id: `${rel.source}_${rel.type}_${rel.target}`,
                from: rel.source!,
                to: rel.target!,
                label: rel.type || "related_to",
                arrows: "to",
                smooth: { enabled: true, type: "dynamic" },
            }));
    };

    /* -------------------- Build Graph -------------------- */
    const RefreshGraph = () => {
        const dataNode: any[] = [];
        const dataEdge: any[] = [];
        const colorMap = new Map<number, string>();
        const existingNodes = new Set();
        const existingEdges = new Set();

        setProgressing(true);

        if (!pathNodes.length) return { nodes: [], edges: [] };

        pathNodes.forEach((n) => {
            const p = n.partitionID ?? 0;

            if (!colorMap.has(Number(p))) {
                colorMap.set(
                    Number(p),
                    PARTITION_COLORS[Number(p) % PARTITION_COLORS.length]
                );
            }

            if (!existingNodes.has(n.id)) {
                existingNodes.add(n.id);

                const isSeed = seedNodeIds.has(n.id);

                // ✅ NEW: match logic
                const isMatch =
                    searchTerm &&
                    (
                        n.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        n.id.toLowerCase().includes(searchTerm.toLowerCase())
                    );

                dataNode.push({
                    id: n.id,
                    label: n.name || n.id,
                    color: isMatch
                        ? "#FFD700" // highlight
                        : isSeed
                            ? "#FF5733"
                            : colorMap.get(Number(p)),
                    size: isMatch ? 40 : isSeed ? 35 : 25,
                });
            }
        });

        extractRelations(pathRels).forEach((e) => {
            if (!existingEdges.has(e.id)) {
                existingEdges.add(e.id);
                dataEdge.push(e);
            }
        });

        setProgressing(false);
        setPercent(100);


        return { nodes: dataNode, edges: dataEdge };
    };

    /* -------------------- Init Network -------------------- */
    useEffect(() => {
        if (!networkRef.current) {
            nodesRef.current = new DataSet([]);
            edgesRef.current = new DataSet([]);

            networkRef.current = new Network(
                containerRef.current!,
                { nodes: nodesRef.current, edges: edgesRef.current },
                {
                    layout: { improvedLayout: true },
                    physics: {
                        enabled: true,
                        solver: "forceAtlas2Based",
                        forceAtlas2Based: {
                            gravitationalConstant: -50,
                            centralGravity: 0.01,
                            springLength: 120,
                            springConstant: 0.08,
                        },
                        stabilization: { iterations: 150 },
                    },
                    nodes: {
                        shape: "dot",
                        font: { size: 14 },
                    },
                    edges: { smooth: true },
                    interaction: { hover: true },
                }
            );
        }

        // ✅ Clear & re-add on update
        nodesRef.current.clear();
        edgesRef.current.clear();

        const { nodes, edges } = RefreshGraph();
        nodesRef.current.add(nodes);
        edgesRef.current.add(edges);

        // ✅ Focus on first match
        if (searchTerm && networkRef.current) {
            const match = nodes.find((n: any) =>
                n.label.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (match) {
                networkRef.current.focus(match.id, {
                    scale: 1.5,
                    animation: true,
                });
            }
        }

    }, [pathNodes, pathRels, seedNodeIds, searchTerm]);

    return <div>
        <Spin spinning={progressing} indicator={<LoadingOutlined spin />} />

        {/* Search Bar */}
        <input
            type="text"
            placeholder="Search node..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
                width: "100%",
                padding: "8px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
            }}
        />

        {/* Graph Container */}
        <div
            style={{
                width: "100%",
                height: "500px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                position: "relative",
                overflow: "hidden",
            }}
        >


            {/* ✅ GRAPH */}
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: "100%",
                    opacity:  1,
                }}
            />


        </div>

        {progressing && <Progress percent={percent} showInfo={false} />}
    </div>
}

/* ========================= Decomposed Plan ========================= */
function DecomposedPlan({ objectives }: { objectives: Objective[] }) {
    if (!objectives || objectives.length === 0) {
        return <div>No objectives available.</div>;
    }

    return (
        <div className="space-y-6"
            >
            {objectives.map((obj) => {
                const allNodesMap = new Map<string, PathNode>();
                const transformedRels: PathRel[] = [];
                const seedNodeIds = new Set<string>();

                obj.retrieved_paths?.forEach((res) => {
                    const nodes = res.pathObj?.pathNodes || [];
                    const rels = res.pathObj?.pathRels || [];

                    if (nodes.length > 0) {
                        seedNodeIds.add(nodes[0].id);
                    }

                    nodes.forEach((node) => {
                        allNodesMap.set(node.id, node);
                    });

                    rels.forEach((rel, idx) => {
                        const source = nodes[idx]?.id;
                        const target = nodes[idx + 1]?.id;

                        if (source && target) {
                            transformedRels.push({
                                ...rel,
                                source,
                                target,
                            });
                        }
                    });
                });

                const mergedNodes = Array.from(allNodesMap.values());

                return (
                    <div
                        key={obj.id}
                        className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm"
                        style={{
                            backgroundImage:
                                "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
                        }}
                    >
                        <div className="mb-4">
                            <div className="text-xs text-slate-500 uppercase">
                                Objective {obj.id}
                            </div>
                            <div className="text-sm font-medium">
                                {obj.query}l
                            </div>
                        </div>

                        <QueryGraph
                            pathNodes={mergedNodes}
                            pathRels={transformedRels}
                            seedNodeIds={seedNodeIds}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/* ========================= Renderer ========================= */
function PlanRenderer({ ragResult }: { ragResult: RagResult }) {
    if (!ragResult.plan_type) return <div>No plan info</div>;

    if (ragResult.plan_type === "DECOMPOSED") {
        return <DecomposedPlan objectives={ragResult.objectives || []} />;
    }

    return <div>Direct mode</div>;
}
function BFSLoader() {
    return (
        <div className="bfs-container">
            {/* LEVEL 0 */}
            <div className="node level0 n0"></div>

            {/* LEVEL 1 */}
            <div className="node level1 n1"></div>
            <div className="node level1 n2"></div>

            {/* LEVEL 2 */}
            <div className="node level2 n3"></div>
            <div className="node level2 n4"></div>
            <div className="node level2 n5"></div>

            {/* EDGES */}
            <div className="edge e0"></div>
            <div className="edge e1"></div>
            <div className="edge e2"></div>
            <div className="edge e3"></div>
            <div className="edge e4"></div>

            {/* TEXT */}
            <div className="label">
                <div>🔍 Running BFS traversal...</div>
                <span>Expanding graph layer by layer</span>
            </div>

            <style jsx>{`
                .bfs-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #f8fafc, #eef2f7);
                    overflow: hidden;
                }

                /* GRID */
                .bfs-container::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(#e2e8f0 1px, transparent 1px),
                        linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
                    background-size: 40px 40px;
                    opacity: 0.3;
                }

                .node {
                    position: absolute;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #cbd5f5;
                    transform: scale(0.8);
                    opacity: 0.4;
                }

                /* LEVEL POSITIONS */
                .n0 { top: 30%; left: 50%; }
                .n1 { top: 50%; left: 35%; }
                .n2 { top: 50%; left: 65%; }
                .n3 { top: 70%; left: 25%; }
                .n4 { top: 70%; left: 50%; }
                .n5 { top: 70%; left: 75%; }

                /* BFS ACTIVATION */
                .level0 {
                    animation: bfs 3s infinite;
                }
                .level1 {
                    animation: bfs 3s infinite;
                    animation-delay: 0.5s;
                }
                .level2 {
                    animation: bfs 3s infinite;
                    animation-delay: 1s;
                }

                @keyframes bfs {
                    0% {
                        background: #cbd5f5;
                        transform: scale(0.8);
                        opacity: 0.4;
                    }
                    40% {
                        background: #3b82f6;
                        transform: scale(1.6);
                        opacity: 1;
                    }
                    80% {
                        background: #cbd5f5;
                        transform: scale(1);
                        opacity: 0.5;
                    }
                    100% {
                        opacity: 0.3;
                    }
                }

                /* EDGES */
                .edge {
                    position: absolute;
                    height: 2px;
                    background: #cbd5f5;
                    opacity: 0.4;
                }

                .e0 {
                    top: 36%;
                    left: 50%;
                    width: 80px;
                    transform: rotate(140deg);
                }

                .e1 {
                    top: 36%;
                    left: 50%;
                    width: 80px;
                    transform: rotate(40deg);
                }

                .e2 {
                    top: 56%;
                    left: 35%;
                    width: 100px;
                    transform: rotate(160deg);
                }

                .e3 {
                    top: 56%;
                    left: 50%;
                    width: 80px;
                    transform: rotate(90deg);
                }

                .e4 {
                    top: 56%;
                    left: 65%;
                    width: 100px;
                    transform: rotate(20deg);
                }

                /* EDGE FLOW */
                .edge {
                    animation: edgeFlow 3s infinite;
                }

                @keyframes edgeFlow {
                    0% { opacity: 0.2; }
                    50% { opacity: 1; background: #3b82f6; }
                    100% { opacity: 0.2; }
                }

                .label {
                    position: absolute;
                    bottom: 20px;
                    width: 100%;
                    text-align: center;
                    font-weight: 500;
                    color: #374151;
                }

                .label span {
                    font-size: 12px;
                    color: #6b7280;
                }
            `}</style>
        </div>
    );
}
/* ========================= Main Panel ========================= */
export default function VisualizationPanel() {
    const { loading, chatHistory, activeMessageId } = useAppSelector(
        (state) => state.graphRagData
    );

    const activeMsg = chatHistory.find((m) => m.id === activeMessageId);
    const ragResult = activeMsg?.ragResult;

    return (
        <div className="w-2/3 p-5 bg-white flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-4">
                Visualization & Reasoning
            </h2>

            <div className="flex-1 overflow-y-auto">
                {loading && <div>Loading...</div>}

                {/* ✅ Loading */}
                {/*{loading && (*/}
                {/*    <BFSLoader />*/}
                {/*)}*/}

                {/* ✅ Show Plan */}
                {!loading && ragResult && (
                    <PlanRenderer ragResult={ragResult} />
                )}

                {/* ✅ BEAUTIFUL EMPTY PANEL */}
                {(loading || !ragResult )&& (
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            overflow: "hidden",
                            background:
                                "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
                        }}
                    >
                        {/* GRID BACKGROUND */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                backgroundImage:
                                    "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)",
                                backgroundSize: "40px 40px",
                                opacity: 0.4,
                            }}
                        />

                        {/* CENTER CONTENT */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                padding: "20px",
                            }}
                        >
                            <div style={{ fontSize: "42px", marginBottom: "12px" }}>
                                🧠
                            </div>

                            <div
                                style={{
                                    fontSize: "18px",
                                    fontWeight: 600,
                                    marginBottom: "8px",
                                    color: "#1f2937",
                                }}
                            >
                                No Visualization Yet
                            </div>

                            <div
                                style={{
                                    fontSize: "14px",
                                    color: "#6b7280",
                                    maxWidth: "400px",
                                    lineHeight: "1.5",
                                }}
                            >
                                Run a query to generate a reasoning plan and explore
                                relationships between entities. The graph will appear
                                here with interactive nodes and connections.
                            </div>

                            {/* Optional hint */}
                            <div
                                style={{
                                    marginTop: "16px",
                                    fontSize: "12px",
                                    color: "#9ca3af",
                                }}
                            >
                                💡 Try asking a multi-hop question
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}