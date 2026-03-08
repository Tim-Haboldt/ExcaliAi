"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChatMessage } from "./types";

function id() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Options = {
    getExcalidrawScene?: () => Promise<string | null>;
    updateExcalidrawScene?: (json: string) => Promise<void>;
};

export function useLocalChat({
    getExcalidrawScene,
    updateExcalidrawScene,
}: Options = {}) {
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            id: id(),
            role: "assistant",
            content:
                "Chat is wired locally for now. Next step: connect this to your AI endpoint.",
            createdAt: Date.now(),
        },
    ]);

    const send = useCallback(
        async (content: string) => {
            const trimmed = content.trim();
            if (!trimmed) return;

            const scene = await getExcalidrawScene?.();

            const userMsg: ChatMessage = {
                id: id(),
                role: "user",
                content: trimmed,
                createdAt: Date.now(),
                excalidrawScene: scene ?? undefined,
            };

            setMessages((prev) => [...prev, userMsg]);

            const assistantMsg: ChatMessage = {
                id: id(),
                role: "assistant",
                content: scene
                    ? `Received: ${trimmed}\n\n(Scene context attached — ${JSON.parse(scene).elements?.length ?? 0} element(s))`
                    : `Received: ${trimmed}`,
                createdAt: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        },
        [getExcalidrawScene],
    );

    const api = useMemo(
        () => ({ messages, send, updateExcalidrawScene }),
        [messages, send, updateExcalidrawScene],
    );
    return api;
}
