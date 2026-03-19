"use client";

import { useCallback, useRef, useState } from "react";
import { useClickOutside } from "@/app/hooks/useClickOutside";

interface AiQuickPromptProps {
    selectedElementIds: string[];
    onSubmit: (instruction: string, selectedElementIds: string[]) => void;
}

export function AiQuickPrompt({
    selectedElementIds,
    onSubmit,
}: AiQuickPromptProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [instruction, setInstruction] = useState("");
    const popoverRef = useRef<HTMLDivElement>(null);

    const hasSelection = selectedElementIds.length > 0;

    const handleDismiss = useCallback(() => {
        setIsOpen(false);
        setInstruction("");
    }, []);

    useClickOutside(popoverRef, handleDismiss, isOpen);

    const handleSubmit = useCallback(() => {
        const trimmed = instruction.trim();
        if (!trimmed) {
            return;
        }

        onSubmit(trimmed, selectedElementIds);
        setInstruction("");
        setIsOpen(false);
    }, [instruction, selectedElementIds, onSubmit]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit],
    );

    const handleToggle = useCallback(() => {
        setIsOpen((previous) => !previous);
        setInstruction("");
    }, []);

    return (
        <div className="relative" ref={popoverRef}>
            <button
                type="button"
                onClick={handleToggle}
                title={
                    hasSelection
                        ? `Ask AI about ${selectedElementIds.length} selected element(s)`
                        : "Select elements, then ask AI"
                }
                aria-label={
                    hasSelection
                        ? `Ask AI about ${selectedElementIds.length} selected element(s)`
                        : "Ask AI"
                }
                aria-expanded={isOpen}
                className={[
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    hasSelection
                        ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500"
                        : "bg-zinc-700/80 text-zinc-400 hover:bg-zinc-600/80 hover:text-zinc-300",
                ].join(" ")}
            >
                <AiSparkleIcon />
                Ask AI
                {hasSelection && (
                    <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] leading-none">
                        {selectedElementIds.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-xl">
                    {!hasSelection && (
                        <p className="mb-2 text-xs text-zinc-400">
                            No elements selected. Your instruction will apply to
                            the entire canvas.
                        </p>
                    )}
                    {hasSelection && (
                        <p className="mb-2 text-xs text-zinc-400">
                            {selectedElementIds.length} element(s) selected
                        </p>
                    )}

                    <textarea
                        autoFocus
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Make this more modern..."
                        rows={3}
                        className="w-full resize-none rounded-md border border-zinc-600 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />

                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500">
                            Enter to send · Esc to close
                        </span>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!instruction.trim()}
                            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function AiSparkleIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
        </svg>
    );
}
