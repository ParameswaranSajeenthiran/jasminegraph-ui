"use client";

import { useState, useRef, useEffect } from "react";
import { queryGraphRAG } from "@/services/graph-service";
import { useAppDispatch, useAppSelector } from "@/redux/hook";
import {
    add_Chat_Message,
    set_Loading, attach_Rag_To_Message, set_Active_Message,
} from "@/redux/features/graphRagData";
import { set_Config_Collapsed } from "@/redux/features/graphRagData";

export default function ChatPanel() {
    const dispatch = useAppDispatch();
    const {
        chatHistory,
        selectedGraph,
        selectedModel,
        loading,
        selectedProvider,
        providerURL,
    } = useAppSelector((state) => state.graphRagData);

    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

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
                        className={`flex ${
                            msg.role === "user"
                                ? "justify-end"
                                : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-[65%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === "user"
                                    ? "bg-gray-900 text-white rounded-br-md"
                                    : "bg-gray-100 text-gray-800 rounded-bl-md"
                            }`}
                        >
                            {msg.content}
                        </div>
                        {msg.role != "user"  && (
                            <button
                                onClick={() => dispatch(set_Active_Message(msg.id))}
                                className="absolute -bottom-4 right-2 text-blue-500 hover:text-blue-700"
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
                            e.key === "Enter" && handleSend()
                        }
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                    />

                    <button
                        onClick={handleSend}
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