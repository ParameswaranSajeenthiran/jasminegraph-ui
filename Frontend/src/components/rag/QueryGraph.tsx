"use client";

import React, { useEffect, useRef } from "react";
import { DataSet, Network } from "vis-network/standalone";
import "vis-network/styles/vis-network.css";

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

interface QueryGraphProps {
    pathNodes: PathNode[];
    pathRels: PathRel[];
}

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

export default function QueryGraph({
                                       pathNodes,
                                       pathRels,
                                   }: QueryGraphProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const nodes = new DataSet<any>();
        const edges = new DataSet<any>();

        const existingNodeIds = new Set<string>();
        const existingEdgeIds = new Set<string>();

        const seedNodeId = pathNodes?.[0]?.id;

        const colorMap = new Map<string, string>();

        // Build Nodes
        pathNodes?.forEach((node) => {
            const partition = node.partitionID ?? "0";

            if (!colorMap.has(partition)) {
                const color =
                    node.id === seedNodeId
                        ? "#6CB8E6"
                        : PARTITION_COLORS[
                        parseInt(partition) %
                        PARTITION_COLORS.length
                            ];
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
        for (let i = 0; i < pathRels?.length; i++) {
            const rel = pathRels[i];
            const source = pathNodes[i]?.id;
            const target = pathNodes[i + 1]?.id;

            if (!source || !target) continue;

            const edgeId = `${source}_${rel.type}_${target}`;

            if (!existingEdgeIds.has(edgeId)) {
                existingEdgeIds.add(edgeId);

                edges.add({
                    id: edgeId,
                    from: source,
                    to: target,
                    label: rel.type || "related_to",
                    arrows: "to",
                });
            }
        }

        const options: any = {
            layout: { improvedLayout: true },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -5000,
                    springLength: 120,
                },
            },
            nodes: {
                shape: "dot",
                size: 30,
                font: { size: 14 },
            },
            edges: {
                smooth: { enabled: true, type: "dynamic" },
            },
        };

        const network = new Network(
            containerRef.current,
            { nodes, edges },
            options
        );

        return () => {
            network.destroy();
        };
    }, [pathNodes, pathRels]);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "350px",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
            }}
        />
    );
}