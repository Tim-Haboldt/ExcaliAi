"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";

type ChatMessageListProps = {
    messages: UIMessage[];
    className?: string;
    isLoading?: boolean;
};

export function ChatMessageList({
    messages,
    className,
    isLoading,
}: ChatMessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const lastMessage = messages[messages.length - 1];
    const showThinkingIndicator =
        isLoading && messages.length > 0 && lastMessage.role === "user";

    return (
        <div className={className}>
            <div className="space-y-3">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={[
                            "rounded-xl px-3 py-2 text-sm leading-6",
                            message.role === "user"
                                ? "ml-auto max-w-[85%] bg-zinc-900 text-zinc-50"
                                : "mr-auto max-w-[85%] bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50",
                        ].join(" ")}
                    >
                        <MessageContent message={message} />
                    </div>
                ))}

                {showThinkingIndicator && (
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
    "tool-getCanvas": [
        "Reading canvas…",
        "Canvas read",
        "Failed to read canvas",
    ],
    "tool-getCanvasPng": [
        "Taking screenshot…",
        "Screenshot taken",
        "Screenshot failed",
    ],
    "tool-updateCanvas": [
        "Updating canvas…",
        "Canvas updated",
        "Canvas update failed",
    ],
    "tool-updateElements": [
        "Updating elements…",
        "Elements updated",
        "Element update failed",
    ],
    "tool-deleteElements": [
        "Deleting elements…",
        "Elements deleted",
        "Element deletion failed",
    ],
};

function getToolLabel(
    toolType: string,
    isDone: boolean,
    isError: boolean,
): string {
    const labels = TOOL_LABELS[toolType];
    if (!labels) {
        const toolName = toolType.replace("tool-", "");

        if (isError) {
            return `${toolName} failed`;
        }

        return isDone ? `${toolName} done` : `${toolName}…`;
    }

    if (isError) {
        return labels[2];
    }

    return isDone ? labels[1] : labels[0];
}

type ToolUIPart = {
    type: string;
    state: string;
};

function isToolUIPart(part: unknown): part is ToolUIPart {
    if (typeof part !== "object" || part === null) {
        return false;
    }

    const hasFields = "type" in part && "state" in part;
    if (!hasFields) {
        return false;
    }

    return (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        typeof part.state === "string"
    );
}

function getToolStatusIcon(isDone: boolean, isError: boolean): string {
    if (isDone) {
        return "\u2713";
    }

    if (isError) {
        return "\u2717";
    }

    return "\u27F3";
}

function MessageContent({ message }: { message: UIMessage }) {
    if (!message.parts || message.parts.length === 0) {
        return null;
    }

    return (
        <>
            {message.parts.map((part, index) => {
                if (part.type === "text") {
                    if (!part.text) {
                        return null;
                    }

                    return (
                        <div key={index} className="whitespace-pre-wrap">
                            {part.text}
                        </div>
                    );
                }

                if (isToolUIPart(part)) {
                    const isDone = part.state === "output-available";
                    const isError = part.state === "output-error";
                    const label = getToolLabel(part.type, isDone, isError);
                    const icon = getToolStatusIcon(isDone, isError);

                    return (
                        <div
                            key={index}
                            className="my-1 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                            <span
                                className={
                                    isDone || isError ? "" : "animate-spin"
                                }
                            >
                                {icon}
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
