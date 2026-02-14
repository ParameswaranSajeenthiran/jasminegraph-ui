"use client";

import React, { useState, useEffect } from "react";
import { Select, Button, Input, message, Spin, Divider } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import {
    set_Selected_Graph,
    set_Selected_Model,
    set_Selected_Provider,
    set_Provider_URL, set_Config_Collapsed,
} from "@/redux/features/graphRagData";
import { getGraphList } from "@/services/graph-service";
import { IOption } from "@/types/options-types";

/* ---------- Fetch models ---------- */
async function fetchModels(provider: string, baseURL: string): Promise<string[]> {
    try {
        let endpoint = "";

        if (provider === "openai") endpoint = `${baseURL}/v1/models`;
        if (provider === "vllm") endpoint = `${baseURL}/v1/models`;
        if (provider === "ollama") endpoint = `${baseURL}/api/tags`;

        const res = await fetch(endpoint);
        const data = await res.json();

        if (provider === "ollama") {
            return data.models?.map((m: any) => m.name) ?? [];
        }

        return data.data?.map((m: any) => m.id) ?? [];
    } catch (err) {
        console.error("Model fetch failed:", err);
        return [];
    }
}

export default function ConfigPanel() {
    const dispatch = useAppDispatch();

    const {
        selectedGraph,
        selectedModel,
        selectedProvider,
        providerURL,
    } = useAppSelector((state) => state.graphRagData);

    // const [collapsed, setCollapsed] = useState(false);
    const [models, setModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [graphs, setGraphs] = useState<IOption[]>([]);
    const [loadingGraphs, setLoadingGraphs] = useState(false);
    const { configCollapsed } = useAppSelector(
        (state) => state.graphRagData
    );
    /* ---------- Load Graphs ---------- */
    const getGraphsData = async () => {
        try {
            setLoadingGraphs(true);
            const res = await getGraphList();

            if (res.data) {
                const filteredData: IOption[] = res.data.map((graph: any) => ({
                    value: graph.idgraph,
                    label: graph.idgraph + " | " + graph.name,
                }));

                setGraphs(filteredData);
            }
        } catch (err) {
            message.error("Failed to fetch graphs");
        } finally {
            setLoadingGraphs(false);
        }
    };

    useEffect(() => {
        getGraphsData();
    }, []);

    /* ---------- Manual Fetch Models ---------- */
    const handleFetchModels = async () => {
        if (!selectedProvider || !providerURL) {
            message.warning("Please select provider and enter endpoint URL");
            return;
        }

        setLoadingModels(true);
        dispatch(set_Selected_Model("llama3"));
        setModels([]);

        const fetched = await fetchModels(selectedProvider, providerURL);

        if (fetched.length === 0) {
            message.error("No models found or connection failed");
        } else {
            message.success("Models fetched successfully");
            setModels(fetched);
        }

        setLoadingModels(false);
    };

    return (
        <div
            className={`relative transition-all duration-300 ease-in-out 
            ${configCollapsed ? "w-12" : "w-1/5"} 
            border-r bg-white shadow-sm flex flex-col`}
        >
            {/* Toggle */}
            <div className="flex justify-end p-2">
                <Button
                    type="text"
                    icon={configCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() =>         dispatch(set_Config_Collapsed(!configCollapsed))
                    }
                />
            </div>

            {!configCollapsed && (
                <div className="p-4 flex-1 overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4">
                        Configuration
                    </h2>

                    {/* 🔹 GRAPH CONFIGURATION */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                            Graph Configuration
                        </h3>

                        <Select
                            style={{ width: "100%" }}
                            loading={loadingGraphs}
                            value={selectedGraph ?? undefined}
                            placeholder="Select Graph"
                            onChange={(value) =>
                                dispatch(set_Selected_Graph(value))
                            }
                            disabled={loadingGraphs || graphs.length === 0}

                            options={graphs}
                        />
                    </div>

                    <Divider />

                    {/* 🔹 INFERENCE ENGINE */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">
                            Inference Engine
                        </h3>

                        <Select
                            style={{ width: "100%", marginBottom: 12 }}
                            value={selectedProvider ?? undefined}
                            placeholder="Select Provider"
                            onChange={(value) => {
                                dispatch(set_Selected_Provider(value));
                                setModels([]);
                            }}
                            options={[
                                { label: "OpenAI", value: "openai" },
                                { label: "vLLM Server", value: "vllm" },
                                { label: "Ollama (Local)", value: "ollama" },
                            ]}
                        />

                        {selectedProvider && (
                            <>
                                <Input
                                    style={{ marginBottom: 12 }}
                                    placeholder={
                                        selectedProvider === "openai"
                                            ? "https://api.openai.com"
                                            : selectedProvider === "vllm"
                                                ? "http://localhost:8000"
                                                : "http://localhost:11434"
                                    }
                                    value={providerURL ?? ""}
                                    onChange={(e) =>
                                        dispatch(set_Provider_URL(e.target.value))
                                    }
                                />

                                <Button
                                    type="primary"
                                    block
                                    loading={loadingModels}
                                    onClick={handleFetchModels}
                                    disabled={!providerURL}
                                >
                                    Fetch Models
                                </Button>
                            </>
                        )}
                    </div>

                    <Divider />

                    {/* 🔹 MODEL SELECTION */}
                    {models.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-2">
                                Model Selection
                            </h3>

                            <Select
                                style={{ width: "100%" }}
                                value={selectedModel ?? undefined}
                                placeholder="Select Model"
                                onChange={(value) =>
                                    dispatch(set_Selected_Model(value))
                                }
                                options={models.map((m) => ({
                                    label: m,
                                    value: m,
                                }))}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
