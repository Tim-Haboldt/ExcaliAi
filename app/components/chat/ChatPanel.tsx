"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import {
    type AiCanvasUpdate,
    type AiElement,
    convertAiToExcalidrawScene,
} from "@/lib/ai/excalidraw-ai-schema";

type Props = {
    className?: string;
    getExcalidrawScene?: () => Promise<string | null>;
    getExcalidrawPng?: () => Promise<string | null>;
    updateExcalidrawScene?: (json: string) => Promise<void>;
    updateExcalidrawElements?: (elements: AiElement[]) => Promise<void>;
    deleteExcalidrawElements?: (elementIds: string[]) => Promise<void>;
};

export function ChatPanel({
    className,
    getExcalidrawScene,
    getExcalidrawPng,
    updateExcalidrawScene,
    updateExcalidrawElements,
    deleteExcalidrawElements,
}: Props) {
    const getSceneRef = useRef(getExcalidrawScene);
    getSceneRef.current = getExcalidrawScene;

    const getPngRef = useRef(getExcalidrawPng);
    getPngRef.current = getExcalidrawPng;

    const updateSceneRef = useRef(updateExcalidrawScene);
    updateSceneRef.current = updateExcalidrawScene;

    const updateElementsRef = useRef(updateExcalidrawElements);
    updateElementsRef.current = updateExcalidrawElements;

    const deleteElementsRef = useRef(deleteExcalidrawElements);
    deleteElementsRef.current = deleteExcalidrawElements;

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: "/api/chat",
                prepareSendMessagesRequest: async ({
                    id,
                    messages,
                    body,
                }) => {
                    let scene: string | null = null;
                    let png: string | null = null;
                    try {
                        [scene, png] = await Promise.all([
                            getSceneRef.current?.() ?? null,
                            getPngRef.current?.() ?? null,
                        ]);
                    } catch (e) {
                        console.warn(
                            "Failed to get scene/png for context:",
                            e,
                        );
                    }
                    return {
                        body: { ...body, id, messages, scene, png },
                    };
                },
            }),
        [],
    );

    const { messages, sendMessage, status, error, clearError } = useChat({
        transport,
        onError(err) {
            console.error("Chat error:", err);
        },
    });

    const appliedToolCalls = useRef(new Set<string>());
    useEffect(() => {
        for (const msg of messages) {
            if (msg.role !== "assistant") continue;
            for (const part of msg.parts) {
                const p = part as Record<string, unknown>;
                if (
                    typeof p.type !== "string" ||
                    typeof p.toolCallId !== "string"
                )
                    continue;
                if (
                    p.state !== "input-available" &&
                    p.state !== "output-available"
                )
                    continue;
                if (appliedToolCalls.current.has(p.toolCallId)) continue;
                if (!p.input) continue;

                const input = p.input as Record<string, unknown>;

                if (p.type === "tool-updateCanvas") {
                    appliedToolCalls.current.add(p.toolCallId);
                    try {
                        const scene = convertAiToExcalidrawScene(
                            input as AiCanvasUpdate,
                        );
                        void updateSceneRef.current?.(JSON.stringify(scene));
                    } catch (e) {
                        console.error("Failed to apply canvas update:", e);
                    }
                }

                if (p.type === "tool-updateElements") {
                    appliedToolCalls.current.add(p.toolCallId);
                    try {
                        void updateElementsRef.current?.(
                            input.elements as AiElement[],
                        );
                    } catch (e) {
                        console.error("Failed to apply element update:", e);
                    }
                }

                if (p.type === "tool-deleteElements") {
                    appliedToolCalls.current.add(p.toolCallId);
                    try {
                        void deleteElementsRef.current?.(
                            input.elementIds as string[],
                        );
                    } catch (e) {
                        console.error("Failed to delete elements:", e);
                    }
                }
            }
        }
    }, [messages]);

    const handleSend = useCallback(
        async (content: string) => {
            const trimmed = content.trim();
            if (!trimmed) return;

            if (error) {
                clearError();
            }

            try {
                await sendMessage({ text: trimmed });
            } catch (e) {
                console.error("sendMessage failed:", e);
            }
        },
        [sendMessage, error, clearError],
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

            {error && (
                <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                    <div className="flex items-center justify-between">
                        <span>Error: {error.message}</span>
                        <button
                            type="button"
                            onClick={clearError}
                            className="ml-2 underline hover:no-underline"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <ChatComposer onSend={handleSend} disabled={isLoading} />
            </div>
        </aside>
    );
}
