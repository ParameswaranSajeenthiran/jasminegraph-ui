/**
 Copyright 2024 JasmineGraph Team
 Licensed under the Apache License, Version 2.0
 */
'use client';

import { Progress, Spin, Input } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { DataSet, Network } from 'vis-network/standalone';
import { LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import 'vis-network/styles/vis-network.css';
import { useAppSelector } from '@/redux/hook';

const QueryVisualization = () => {
    const [loading, setLoading] = useState(false);
    const [progressing, setProgressing] = useState(false);
    const [percent, setPercent] = useState(0);
    const [search, setSearch] = useState('');

    const networkContainerRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<any>(null);
    const edgesRef = useRef<any>(null);
    const networkRef = useRef<Network | null>(null);

    const { messagePool } = useAppSelector((state) => state.queryData);

    const PARTITION_COLORS = [
        '#6CB8E6', '#5FA8E6', '#4E9CD3', '#3A86B8',
        '#2C73A8', '#1F5A8A', '#123E6B', '#0B3C5D',
    ];

    /* -----------------------------------------
       Extract relations
    ------------------------------------------ */
    const extractRelations = (message: any): any[] => {
        const edges: any[] = [];
        if (message?.pathRels && message?.pathNodes) {
            const pathNodes = message.pathNodes;
            const pathRels = message.pathRels;
            for (let i = 0; i < pathRels.length; i++) {
                edges.push({
                    id: `${pathNodes[i].id}_${pathRels[i].type}_${pathNodes[i + 1].id}`,
                    from: pathNodes[i].id,
                    to: pathNodes[i + 1].id,
                    label: pathRels[i].type,
                    arrows: 'to',
                });
            }
        }
        return edges;
    };

    /* -----------------------------------------
       Build Graph
    ------------------------------------------ */
    const RefreshGraph = () => {
        const colorMap = new Map<number, string>();
        const existingNodes = new Set();
        const existingEdges = new Set();

        const dataNode: any[] = [];
        const dataEdge: any[] = [];

        setLoading(true);
        setProgressing(true);

        Object.values(messagePool).forEach((messages: any[]) => {
            messages.forEach((msg: any) => {
                const json = typeof msg === 'string' ? JSON.parse(msg) : msg;
                const pathNodes = json?.pathNodes || [];
                if (!pathNodes.length) return;

                const seedNode = pathNodes[0].id;

                pathNodes.forEach((n: any) => {
                    const p = n.partitionID ?? 0;
                    if (!colorMap.has(p)) {
                        colorMap.set(p, PARTITION_COLORS[p % PARTITION_COLORS.length]);
                    }

                    if (!existingNodes.has(n.id)) {
                        existingNodes.add(n.id);
                        dataNode.push({
                            id: n.id,
                            label: n.name || n.id,
                            color: n.id === seedNode ? '#FF5733' : colorMap.get(p),
                        });
                    }
                });

                extractRelations(json).forEach((e) => {
                    if (!existingEdges.has(e.id)) {
                        existingEdges.add(e.id);
                        dataEdge.push(e);
                    }
                });
            });
        });

        setLoading(false);
        setProgressing(false);
        setPercent(100);

        return { nodes: dataNode, edges: dataEdge };
    };

    /* -----------------------------------------
       Init Graph
    ------------------------------------------ */
    useEffect(() => {
        nodesRef.current = new DataSet([]);
        edgesRef.current = new DataSet([]);

        networkRef.current = new Network(
            networkContainerRef.current!,
            { nodes: nodesRef.current, edges: edgesRef.current },
            {
                physics: { enabled: true },
                nodes: { shape: 'dot', size: 25 },
                edges: { smooth: true },
            }
        );

        const { nodes, edges } = RefreshGraph();
        nodesRef.current.add(nodes);
        edgesRef.current.add(edges);
    }, []);

    /* -----------------------------------------
       🔍 Search & Highlight
    ------------------------------------------ */
    const onSearch = (value: string) => {
        setSearch(value);

        if (!value || !nodesRef.current) return;

        const allNodes = nodesRef.current.get();
        const match = allNodes.find((n: any) =>
            n.label.toLowerCase().includes(value.toLowerCase()) ||
            n.id.toLowerCase().includes(value.toLowerCase())
        );

        if (!match) return;

        // Fade others
        allNodes.forEach((n: any) => {
            nodesRef.current.update({
                id: n.id,
                color: n.id === match.id ? '#FFD700' : '#E0E0E0',
            });
        });

        // Zoom to node
        networkRef.current?.focus(match.id, {
            scale: 1.5,
            animation: true,
        });
    };

    return (
        <div>
            <Spin spinning={loading} indicator={<LoadingOutlined spin />} fullscreen />

            {/* 🔍 Search Bar */}
            <div style={{ marginBottom: 10, maxWidth: 400 }}>
                <Input
                    placeholder="Search node by name or ID..."
                    prefix={<SearchOutlined />}
                    onChange={(e) => onSearch(e.target.value)}
                    allowClear
                />
            </div>

            <div
                ref={networkContainerRef}
                style={{
                    width: '100%',
                    height: '80vh',
                    border: '1px solid #ddd',
                }}
            />

            {progressing && <Progress percent={percent} showInfo={false} />}
        </div>
    );
};

export default QueryVisualization;
