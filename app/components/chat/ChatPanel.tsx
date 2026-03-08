"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import {
    type AiCanvasUpdate,
    convertAiToExcalidrawScene,
} from "@/lib/ai/excalidraw-ai-schema";

type Props = {
    className?: string;
    getExcalidrawScene?: () => Promise<string | null>;
    updateExcalidrawScene?: (json: string) => Promise<void>;
};

export function ChatPanel({
    className,
    getExcalidrawScene,
    updateExcalidrawScene,
}: Props) {
    const getSceneRef = useRef(getExcalidrawScene);
    getSceneRef.current = getExcalidrawScene;

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/chat",
                prepareSendMessagesRequest: async ({ messages, body }) => ({
                    body: { ...body, messages, scene: await getSceneRef.current?.() },
                }),
            }),
        [],
    );

    const { messages, sendMessage, status } = useChat({ transport });

    const appliedToolCalls = useRef(new Set<string>());
    useEffect(() => {
        for (const msg of messages) {
            if (msg.role !== "assistant") continue;
            for (const part of msg.parts) {
                const p = part as Record<string, unknown>;
                if (
                    typeof p.type === "string" &&
                    p.type === "tool-updateCanvas" &&
                    typeof p.toolCallId === "string" &&
                    (p.state === "input-available" ||
                        p.state === "output-available") &&
                    p.input &&
                    !appliedToolCalls.current.has(p.toolCallId)
                ) {
                    appliedToolCalls.current.add(p.toolCallId);
                    try {
                        const scene = convertAiToExcalidrawScene(
                            p.input as AiCanvasUpdate,
                        );
                        void updateExcalidrawScene?.(JSON.stringify(scene));
                    } catch (e) {
                        console.error("Failed to apply canvas update:", e);
                    }
                }
            }
        }
    }, [messages, updateExcalidrawScene]);

    const handleSend = useCallback(
        async (content: string) => {
            const trimmed = content.trim();
            if (!trimmed) return;
            await sendMessage({ text: trimmed });
        },
        [sendMessage],
    );

    const isLoading = status === "streaming" || status === "submitted";

    return (
        <aside
            className={[
                "flex h-full flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black",
                className,
            ].join(" ")}
        >
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Chat
                </div>
                <div className="text-xs text-zinc-500">
                    AI-powered canvas assistant
                </div>
            </div>

            <ChatMessageList
                messages={messages}
                className="flex-1 overflow-auto px-4 py-4"
                isLoading={isLoading}
            />

            <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <ChatComposer onSend={handleSend} disabled={isLoading} />
            </div>
        </aside>
    );
}
