"use client";

import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { useLocalChat } from "./useLocalChat";

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
    const chat = useLocalChat({ getExcalidrawScene, updateExcalidrawScene });

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
                    Placeholder UI (local echo). Wire to AI next.
                </div>
            </div>

            <ChatMessageList
                messages={chat.messages}
                className="flex-1 overflow-auto px-4 py-4"
            />

            <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <ChatComposer onSend={chat.send} />
            </div>
        </aside>
    );
}
