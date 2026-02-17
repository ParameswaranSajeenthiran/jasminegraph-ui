"use client";

import { useState, useRef, useEffect } from "react";
import { queryGraphRAG } from "@/services/graph-service";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import {
    add_Chat_Message,
    set_Loading, attach_Rag_To_Message, set_Active_Message, IRagResult,
} from "@/redux/features/graphRagData";
import { set_Config_Collapsed } from "@/redux/features/graphRagData";
import useWebSocket, {ReadyState} from "react-use-websocket";
import {add_semantic_result} from "@/redux/features/queryData";
import {theme} from "antd";
const WS_URL = "ws://localhost:8080";

export default function ChatPanel() {
    const dispatch = useAppDispatch();
    const {
        chatHistory,
        selectedGraph,
        selectedModel,
        // loading,
        selectedProvider,
        providerURL,
    } = useAppSelector((state) => state.graphRagData);
    const {
        token: { colorPrimary }
    } = theme.useToken();

    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(WS_URL, { shouldReconnect: (closeEvent) => true });
    const [loading, setLoading] = useState<boolean>(false);
    const [clientId, setClientID] = useState<string>('')

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    const onQuerySubmit = async () => {
        try {

            if (!selectedGraph || !selectedModel || !selectedProvider) {
                alert("Please select graph, provider and model first.");
                return;
            }

            const userMessage = input;
            const messageId = crypto.randomUUID();

            // 1️⃣ Add user message

            dispatch(add_Chat_Message({  id : messageId, role: "user", content: userMessage }));
            dispatch(set_Loading(true));
            setLoading(true)
            setInput("");
            dispatch(set_Config_Collapsed(true));

            if (readyState === ReadyState.OPEN) {

                sendJsonMessage({
                    type: "GRAPHRAG",
                    messageId, // ✅ important
                    graphId: selectedGraph,
                    clientId: clientId,
                    clusterId: localStorage.getItem("selectedCluster"),
                    query: userMessage,
                    llmRunnerString: providerURL,
                    inferenceEngine: selectedProvider,
                    model: selectedModel
                });
            }

        } catch (err) {
            console.log("ERROR::", err);
        }
    };


    useEffect(() => {
        const message = lastJsonMessage as any;
        if (!message) return;

        const { type, messageId, data, error } = message;

        // 1️⃣ Connection established
        if (type === "CONNECTED") {
            setClientID(message.clientId || "");
            return;
        }

        // 2️⃣ Streaming intermediate data
        // if (type === "GRAPHRAG_STREAM") {
        //     dispatch(attach_Rag_To_Message({
        //         id: messageId,
        //         ragResult: { answer: data?.message || "" } // attach partial streaming as answer
        //     }));
        //
        //     // Optionally append streaming content to the chatHistory message
        //     dispatch(add_Chat_Message({
        //         id: messageId,
        //         role: "assistant",
        //         content: data?.message || ""
        //     }));
        //     return;
        // }

        // 3️⃣ Final structured result
        if (type === "GRAPHRAG_RESULT") {
            console.log(data)
            if(data == "done"){
                return;
            }
            const ragResult: IRagResult = typeof data === "string"
                ? { answer: data }
                : data;

            // Attach final RAG result
            dispatch(attach_Rag_To_Message({
                id: messageId,
                ragResult
            }));

            // Replace content in assistant message
            const answerText = ragResult.answer || JSON.stringify(ragResult, null, 2);
            dispatch(add_Chat_Message({
                id: messageId,
                role: "assistant",
                content: answerText
            }));
            dispatch(set_Active_Message(messageId));

            return;
        }

        // 4️⃣ Stream completed
        if (type === "GRAPHRAG_DONE") {
            dispatch(set_Loading(false));
            // dispatch(set_Active_Message(messageId));
            setLoading(false);

            return;
        }

        // 5️⃣ Error
        if (type === "GRAPHRAG_ERROR") {
            dispatch(add_Chat_Message({
                id: messageId,
                role: "assistant",
                content: `❌ ${error}`
            }));
            setLoading(false);
            dispatch(set_Loading(false));
            return;
        }

    }, [lastJsonMessage]);

    const handleSend = async () => {
        if (!input.trim()) return;

        if (!selectedGraph || !selectedModel || !selectedProvider) {
            alert("Please select graph, provider and model first.");
            return;
        }
        const messageId = crypto.randomUUID();

        const userMessage = input;

        dispatch(add_Chat_Message({  id : messageId, role: "user", content: userMessage }));
        dispatch(set_Loading(true));
        setInput("");
        dispatch(set_Config_Collapsed(true));


        try {
            const response = await queryGraphRAG(
                selectedGraph,
                userMessage,
                providerURL,
                selectedProvider,
                selectedModel
            );

            if (response.status !== 200) {
                throw new Error(response.message);
            }

            const data = response.data;


            dispatch(add_Chat_Message({
                id: messageId,
                role: "assistant",
                content: data.answer,
            }));

            dispatch(attach_Rag_To_Message({
                id: messageId,
                ragResult: data,
            }));

            dispatch(set_Active_Message(messageId));
        } catch (err: any) {
            dispatch(
                add_Chat_Message({
                    id: messageId,

                    role: "assistant",
                    content: `⚠️ ${err.message || "GraphRAG failed"}`,
                })
            );
        } finally {
            dispatch(set_Loading(false));
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white">
                {chatHistory.map((msg, index) => (
                    <div
                        key={index}
                        className={`relative flex ${
                            msg.role === "user"
                                ? "justify-end"
                                : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-[65%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === "user"
                                    ? "text-white rounded-br-md"
                                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                            }`}
                            style={
                                msg.role === "user"
                                    ? { backgroundColor: colorPrimary }
                                    : undefined
                            }
                        >

                        {msg.content}
                        </div>
                        {msg.role === "user" && (
                            <button
                                onClick={() => dispatch(set_Active_Message(msg.id))}
                                className="
            absolute
            -bottom-6
            right-3
            text-gray-400
            hover:text-gray-600
            transition-colors
            duration-150
            text-sm
        "
                            >
                                ⓘ
                            </button>
                        )}

                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-md text-sm animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && onQuerySubmit()
                        }
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                    />

                    <button
                        onClick={onQuerySubmit}
                        disabled={loading}
                        className="bg-gray-900 hover:bg-black text-white text-sm px-4 py-1.5 rounded-full transition disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}