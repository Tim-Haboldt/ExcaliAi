"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { ChatSummary } from "@/app/hooks/useChats";

interface ChatSelectorProps {
    chats: ChatSummary[];
    activeChatId: string | null;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ChatSelector({
    chats,
    activeChatId,
    onChatSelect,
    onNewChat,
    onDeleteChat,
}: ChatSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeChat = chats.find((chat) => chat.id === activeChatId);

    const handleBlur = useCallback((event: React.FocusEvent) => {
        if (
            containerRef.current &&
            !containerRef.current.contains(event.relatedTarget as Node | null)
        ) {
            setIsOpen(false);
        }
    }, []);

    const handleSelect = useCallback(
        (chatId: string) => {
            onChatSelect(chatId);
            setIsOpen(false);
        },
        [onChatSelect],
    );

    const handleDelete = useCallback(
        (event: React.MouseEvent, chatId: string) => {
            event.stopPropagation();
            onDeleteChat(chatId);
        },
        [onDeleteChat],
    );

    return (
        <div
            ref={containerRef}
            className="relative flex items-center gap-2"
            onBlur={handleBlur}
        >
            <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {activeChat?.title ?? "Select chat"}
                    </div>
                    <div className="text-xs text-zinc-500">
                        AI-powered canvas assistant
                    </div>
                </div>
                <ChevronDown
                    size={14}
                    className={[
                        "flex-shrink-0 text-zinc-400 transition-transform",
                        isOpen ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            <button
                type="button"
                onClick={onNewChat}
                className="flex-shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                title="New chat"
                aria-label="New chat"
            >
                <Plus size={16} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[200px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                    <div role="listbox" className="max-h-64 overflow-y-auto py-1">
                        {chats.map((chat) => {
                            const isActive = chat.id === activeChatId;
                            const canDelete = chats.length > 1;

                            return (
                                <div
                                    key={chat.id}
                                    role="option"
                                    tabIndex={0}
                                    aria-selected={isActive}
                                    onClick={() => handleSelect(chat.id)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            handleSelect(chat.id);
                                        }
                                    }}
                                    className={[
                                        "group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors",
                                        isActive
                                            ? "bg-zinc-100 dark:bg-zinc-800"
                                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                                    ].join(" ")}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                                            {chat.title}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {formatDate(chat.updatedAt)}
                                        </div>
                                    </div>

                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={(event) =>
                                                handleDelete(event, chat.id)
                                            }
                                            className="flex-shrink-0 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-red-400"
                                            title="Delete chat"
                                            aria-label="Delete chat"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
