"use client";

import { useAppSelector } from "@/redux/hook";
import React, { useEffect, useRef } from "react";
import { DataSet, Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";

/* =========================
   Type Definitions
========================= */

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
    source?: string; // added for branching
    target?: string; // added for branching
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

/* =========================
   QUERY GRAPH COMPONENT
========================= */

const PARTITION_COLORS = [
    "#6CB8E6",
    "#5FA8E6",
    "#4E9CD3",
    "#3A86B8",
    "#2C73A8",
    "#1F5A8A",
    "#123E6B",
    "#0B3C5D",
];

interface QueryGraphProps {
    pathNodes: PathNode[];
    pathRels: PathRel[];
}

function QueryGraph({ pathNodes, pathRels }: QueryGraphProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const nodes = new DataSet<any>();
        const edges = new DataSet<any>();

        const existingNodeIds = new Set<string>();
        const existingEdgeIds = new Set<string>();

        const colorMap = new Map<string, string>();

        // Build Nodes
        pathNodes.forEach((node) => {
            const partition = node.partitionID ?? "0";
            if (!colorMap.has(partition)) {
                const color = PARTITION_COLORS[parseInt(partition) % PARTITION_COLORS.length];
                colorMap.set(partition, color);
            }
            if (!existingNodeIds.has(node.id)) {
                existingNodeIds.add(node.id);
                nodes.add({
                    id: node.id,
                    label: node.name || node.id,
                    group: node.label,
                    color: colorMap.get(partition),
                    title: `${node.label} (partition ${partition})`,
                });
            }
        });

        // Build Edges
        pathRels.forEach((rel) => {
            if (!rel.source || !rel.target) return;

            const edgeId = `${rel.source}_${rel.type}_${rel.target}`;
            if (!existingEdgeIds.has(edgeId)) {
                existingEdgeIds.add(edgeId);
                edges.add({
                    id: edgeId,
                    from: rel.source,
                    to: rel.target,
                    label: rel.type || "related_to",
                    arrows: "to",
                    smooth: { enabled: true, type: "dynamic" },
                });
            }
        });

        const options: any = {
            layout: { improvedLayout: true, hierarchical: false },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -3000,
                    springLength: 200,
                    springConstant: 0.05,
                    damping: 0.09,
                },
                stabilization: { iterations: 200 },
            },
            nodes: { shape: "dot", size: 30, font: { size: 14 } },
            edges: { smooth: { enabled: true, type: "dynamic" } },
        };

        const network = new Network(containerRef.current, { nodes, edges }, options);

        return () => network.destroy();
    }, [pathNodes, pathRels]);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "500px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
            }}
        />
    );
}

/* =========================
   DECOMPOSED PLAN COMPONENT
========================= */

function DecomposedPlan({ objectives }: { objectives: Objective[] }) {
    if (!objectives || objectives.length === 0) {
        return <div className="text-sm text-slate-500">No objectives available.</div>;
    }

    return (
        <div className="space-y-6">
            {objectives.map((obj) => {
                const allNodesMap = new Map<string, PathNode>();
                const transformedRels: PathRel[] = [];

                obj.retrieved_paths?.forEach((res) => {
                    const nodes = res.pathObj?.pathNodes || [];
                    const rels = res.pathObj?.pathRels || [];

                    // Collect nodes
                    nodes.forEach((node) => allNodesMap.set(node.id, node));

                    // Transform edges to include source/target for branching
                    rels.forEach((rel, idx) => {
                        const source = nodes[idx]?.id;
                        const target = nodes[idx + 1]?.id;

                        if (source && target) {
                            transformedRels.push({ ...rel, source, target });
                        }
                    });
                });

                const mergedNodes = Array.from(allNodesMap.values());

                return (
                    <div
                        key={obj.id}
                        className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                        {/* Objective Header */}
                        <div className="mb-4">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Objective {obj.id}
                            </div>
                            <div className="text-sm text-slate-800 mt-1 font-medium">{obj.query}</div>
                            <div className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {obj.search_type}
                            </div>
                        </div>

                        {/* Graph */}
                        <div className="rounded-lg p-4 border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
                            <QueryGraph pathNodes={mergedNodes} pathRels={transformedRels} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* =========================
   PLAN RENDERER
========================= */

function PlanRenderer({ ragResult }: { ragResult: RagResult }) {
    if (!ragResult.plan_type) {
        return <div className="text-sm text-slate-500">No plan information available.</div>;
    }

    switch (ragResult.plan_type) {
        case "DECOMPOSED":
            return <DecomposedPlan objectives={ragResult.objectives || []} />;

        case "DIRECT":
            return (
                <div className="text-sm text-slate-600 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    Direct answer mode. No decomposition performed.
                </div>
            );

        default:
            return <div className="text-sm text-slate-500">Unsupported plan type: {ragResult.plan_type}</div>;
    }
}

/* =========================
   MAIN VISUALIZATION PANEL
========================= */

export default function VisualizationPanel() {
    const { loading, chatHistory, activeMessageId } = useAppSelector(
        (state) => state.graphRagData
    );

    const activeMsg = chatHistory.find((m) => m.id === activeMessageId);
    const ragResult = activeMsg?.ragResult;

    return (
        <div className="w-1/2 p-5 bg-gradient-to-b from-slate-50 to-white flex flex-col h-full border-l border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 tracking-tight">
                Visualization & Reasoning
            </h2>

            <div className="border border-slate-200 rounded-xl p-5 flex-1 overflow-y-auto bg-white shadow-sm">
                {loading && (
                    <div className="text-sm text-slate-500 animate-pulse">Executing reasoning plan...</div>
                )}

                {!loading && ragResult && (
                    <>
                        {/* Plan Type */}
                        <div className="mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Plan Type</div>
                            <div className="font-semibold text-indigo-600">{ragResult.plan_type}</div>
                        </div>

                        <PlanRenderer ragResult={ragResult} />
                    </>
                )}

                {!loading && !ragResult && (
                    <p className="text-slate-500">No visualization yet.</p>
                )}
            </div>
        </div>
    );
}
