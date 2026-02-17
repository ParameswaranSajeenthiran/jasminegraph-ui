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
    id: string;
    type: string;
    source: string;
    target: string;
    direction: string;
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

export default function QueryGraph({ pathNodes, pathRels }: QueryGraphProps) {
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

        // Build Edges (branching supported)
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
            layout: {
                improvedLayout: true,
                hierarchical: false, // set true if you want a tree-like layout
            },
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
            nodes: {
                shape: "dot",
                size: 30,
                font: { size: 14 },
            },
            edges: {
                smooth: { enabled: true, type: "dynamic" },
            },
        };

        const network = new Network(containerRef.current, { nodes, edges }, options);

        return () => {
            network.destroy();
        };
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
