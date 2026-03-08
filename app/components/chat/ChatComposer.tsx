"use client";

import { useCallback, useState } from "react";

type Props = {
    onSend: (content: string) => void | Promise<void>;
    className?: string;
    disabled?: boolean;
};

export function ChatComposer({ onSend, className, disabled }: Props) {
    const [value, setValue] = useState("");

    const submit = useCallback(async () => {
        if (disabled) return;
        
        const content = value;

        setValue("");

        await onSend(content);
    }, [onSend, value, disabled]);

    return (
        <div className={className}>
            <div className="flex items-end gap-2">
                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void submit();
                        }
                    }}
                    placeholder="Type a message…"
                    rows={2}
                    disabled={disabled}
                    className="min-h-[44px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-700"
                />
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={disabled}
                    className="h-[44px] shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-zinc-50 hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    Send
                </button>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
                Enter to send, Shift+Enter for newline.
            </div>
        </div>
    );
}
