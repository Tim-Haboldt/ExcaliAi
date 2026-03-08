"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

type Props = {
    messages: UIMessage[];
    className?: string;
    isLoading?: boolean;
};

export function ChatMessageList({ messages, className, isLoading }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    return (
        <div className={className}>
            <div className="space-y-3">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={[
                            "rounded-xl px-3 py-2 text-sm leading-6",
                            m.role === "user"
                                ? "ml-auto max-w-[85%] bg-zinc-900 text-zinc-50"
                                : "mr-auto max-w-[85%] bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50",
                        ].join(" ")}
                    >
                        <MessageContent message={m} />
                    </div>
                ))}

                {isLoading &&
                    messages.length > 0 &&
                    messages[messages.length - 1].role === "user" && (
                        <div className="mr-auto max-w-[85%] animate-pulse rounded-xl bg-zinc-100 px-3 py-2 text-sm leading-6 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                            Thinking…
                        </div>
                    )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

const TOOL_LABELS: Record<string, [string, string, string]> = {
    "tool-getCanvas": ["Reading canvas\u2026", "Canvas read", "Failed to read canvas"],
    "tool-getCanvasPng": ["Taking screenshot\u2026", "Screenshot taken", "Screenshot failed"],
    "tool-updateCanvas": ["Updating canvas\u2026", "Canvas updated", "Canvas update failed"],
    "tool-updateElements": ["Updating elements\u2026", "Elements updated", "Element update failed"],
    "tool-deleteElements": ["Deleting elements\u2026", "Elements deleted", "Element deletion failed"],
};

function getToolLabel(toolType: string, isDone: boolean, isError: boolean): string {
    const labels = TOOL_LABELS[toolType];
    if (!labels) {
        const name = toolType.replace("tool-", "");
        if (isError) return `${name} failed`;
        return isDone ? `${name} done` : `${name}\u2026`;
    }
    if (isError) return labels[2];
    return isDone ? labels[1] : labels[0];
}

function MessageContent({ message }: { message: UIMessage }) {
    if (!message.parts || message.parts.length === 0) return null;

    return (
        <>
            {message.parts.map((part, i) => {
                if (part.type === "text") {
                    if (!part.text) return null;
                    return (
                        <div key={i} className="whitespace-pre-wrap">
                            {part.text}
                        </div>
                    );
                }

                const p = part as Record<string, unknown>;
                if (
                    typeof p.type === "string" &&
                    p.type.startsWith("tool-")
                ) {
                    const state = p.state as string;
                    const isDone = state === "output-available";
                    const isError = state === "output-error";
                    const label = getToolLabel(
                        p.type,
                        isDone,
                        isError,
                    );
                    return (
                        <div
                            key={i}
                            className="my-1 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                            <span
                                className={
                                    isDone || isError ? "" : "animate-spin"
                                }
                            >
                                {isDone
                                    ? "\u2713"
                                    : isError
                                      ? "\u2717"
                                      : "\u27F3"}
                            </span>
                            <span>{label}</span>
                        </div>
                    );
                }

                return null;
            })}
        </>
    );
}
