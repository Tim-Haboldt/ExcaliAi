"use client";

import type { ChatMessage } from "./types";

type Props = {
    messages: ChatMessage[];
    className?: string;
};

export function ChatMessageList({ messages, className }: Props) {
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
                        <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
