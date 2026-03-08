"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChatMessage } from "./types";

function id() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useLocalChat() {
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            id: id(),
            role: "assistant",
            content:
                "Chat is wired locally for now. Next step: connect this to your AI endpoint.",
            createdAt: Date.now(),
        },
    ]);

    const send = useCallback(async (content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = {
            id: id(),
            role: "user",
            content: trimmed,
            createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);

        // Placeholder “assistant” behavior to keep the UI flow working.
        const assistantMsg: ChatMessage = {
            id: id(),
            role: "assistant",
            content: `Received: ${trimmed}`,
            createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
    }, []);

    const api = useMemo(() => ({ messages, send }), [messages, send]);
    return api;
}
