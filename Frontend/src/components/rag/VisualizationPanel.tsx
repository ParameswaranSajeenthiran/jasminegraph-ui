"use client";

import { useAppSelector } from "@/redux/hook";
import QueryGraph from "./QueryGraph";

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
    direction: string;
    id: string;
    type: string;
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
    results: ObjectiveResult[];
}

interface RagResult {
    answer: string;
    plan_type?: string;
    objectives?: Objective[];
}

/* =========================
   DECOMPOSED PLAN UI
========================= */

function DecomposedPlan({ objectives }: { objectives: Objective[] }) {
    if (!objectives || objectives.length === 0) {
        return (
            <div className="text-sm text-slate-500">
                No objectives available.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {objectives.map((obj) => {
                const allNodesMap = new Map<string, PathNode>();
                const allRelsMap = new Map<string, PathRel>();

                obj.results?.forEach((res) => {
                    res.pathObj?.pathNodes?.forEach((node) => {
                        allNodesMap.set(node.id, node);
                    });

                    res.pathObj?.pathRels?.forEach((rel) => {
                        allRelsMap.set(rel.id, rel);
                    });
                });

                const mergedNodes = Array.from(allNodesMap.values());
                const mergedRels = Array.from(allRelsMap.values());

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

                            <div className="text-sm text-slate-800 mt-1 font-medium">
                                {obj.query}
                            </div>

                            <div className="inline-block mt-2 text-xs font-medium px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {obj.search_type}
                            </div>
                        </div>

                        {/* Graph Container */}
                        <div className="rounded-lg p-4 border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
                            <QueryGraph
                                pathNodes={mergedNodes}
                                pathRels={mergedRels}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* =========================
   PLAN TYPE ROUTER
========================= */

function PlanRenderer({ ragResult }: { ragResult: RagResult }) {
    if (!ragResult.plan_type) {
        return (
            <div className="text-sm text-slate-500">
                No plan information available.
            </div>
        );
    }

    switch (ragResult.plan_type) {
        case "DECOMPOSED":
            return (
                <DecomposedPlan
                    objectives={ragResult.objectives || []}
                />
            );

        case "DIRECT":
            return (
                <div className="text-sm text-slate-600 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    Direct answer mode. No decomposition performed.
                </div>
            );

        default:
            return (
                <div className="text-sm text-slate-500">
                    Unsupported plan type: {ragResult.plan_type}
                </div>
            );
    }
}

/* =========================
   MAIN PANEL
========================= */

export default function VisualizationPanel() {

    const {loading, chatHistory, activeMessageId } = useAppSelector(        (state) => state.graphRagData);

    const activeMsg = chatHistory.find(m => m.id === activeMessageId);
    const ragResult = activeMsg?.ragResult;
    return (
        <div className="w-1/2 p-5 bg-gradient-to-b from-slate-50 to-white flex flex-col h-full border-l border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 tracking-tight">
                Visualization & Reasoning
            </h2>

            <div className="border border-slate-200 rounded-xl p-5 flex-1 overflow-y-auto bg-white shadow-sm">
                {loading && (
                    <div className="text-sm text-slate-500 animate-pulse">
                        Executing reasoning plan...
                    </div>
                )}

                {!loading && ragResult && (
                    <>
                        {/* Plan Type */}
                        <div className="mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                                Plan Type
                            </div>

                            <div className="font-semibold text-indigo-600">
                                {ragResult.plan_type}
                            </div>
                        </div>

                        <PlanRenderer ragResult={ragResult} />
                    </>
                )}

                {!loading && !ragResult && (
                    <p className="text-slate-500">
                        No visualization yet.
                    </p>
                )}
            </div>
        </div>
    );
}
