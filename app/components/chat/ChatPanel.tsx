"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    type MutableRefObject,
} from "react";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSelector } from "./ChatSelector";
import {
    type AiCanvasUpdate,
    type AiElement,
    type AiLabeledShape,
    convertAiToExcalidrawScene,
    expandLabeledShapesToElements,
} from "@/lib/ai/excalidraw-ai-schema";
import { useSocket } from "@/app/hooks/useSocket";
import { useExcalidrawOps } from "../workspace/ExcalidrawOperationsContext";
import type { ChatSummary } from "@/app/hooks/useChats";

type ChatPanelProps = {
    className?: string;
    projectId: string;
    chatId: string;
    chats: ChatSummary[];
    initialMessages?: UIMessage[];
    messagesRef?: MutableRefObject<UIMessage[]>;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
};

export interface ChatPanelHandle {
    sendMessage: (text: string) => Promise<void>;
}

export const ChatPanel = forwardRef<ChatPanelHandle, ChatPanelProps>(
    function ChatPanel(
        {
            className,
            projectId,
            chatId,
            chats,
            initialMessages,
            messagesRef,
            onChatSelect,
            onNewChat,
            onDeleteChat,
        },
        ref,
    ) {
        const {
            getScene,
            getPng,
            updateScene,
            updateElements,
            deleteElements,
            renderMermaid,
        } = useExcalidrawOps();

        const getSceneRef = useRef(getScene);
        getSceneRef.current = getScene;

        const getPngRef = useRef(getPng);
        getPngRef.current = getPng;

        const updateSceneRef = useRef(updateScene);
        updateSceneRef.current = updateScene;

        const updateElementsRef = useRef(updateElements);
        updateElementsRef.current = updateElements;

        const deleteElementsRef = useRef(deleteElements);
        deleteElementsRef.current = deleteElements;

        const renderMermaidRef = useRef(renderMermaid);
        renderMermaidRef.current = renderMermaid;

        const { socket } = useSocket();
        const socketRef = useRef(socket);
        socketRef.current = socket;

        const chatIdRef = useRef(chatId);
        chatIdRef.current = chatId;

        const transport = useMemo(
            () =>
                new DefaultChatTransport({
                    api: "/api/chat",
                    prepareSendMessagesRequest: async ({
                        id,
                        messages: requestMessages,
                        body,
                    }) => {
                        let scene: string | null = null;
                        let png: string | null = null;

                        try {
                            [scene, png] = await Promise.all([
                                getSceneRef.current?.() ?? null,
                                getPngRef.current?.() ?? null,
                            ]);
                        } catch (fetchError) {
                            console.warn(
                                "Failed to get scene/png for context:",
                                fetchError,
                            );
                        }

                        return {
                            body: {
                                ...body,
                                id,
                                messages: requestMessages,
                                scene,
                                png,
                            },
                        };
                    },
                }),
            [],
        );

        const {
            messages,
            setMessages,
            sendMessage,
            status,
            error,
            clearError,
        } = useChat({
            messages: initialMessages,
            transport,
            onToolCall({ toolCall }) {
                const input = toolCall.input as Record<string, unknown>;

                switch (toolCall.toolName) {
                    case "updateCanvas": {
                        try {
                            const scene = convertAiToExcalidrawScene(
                                input as unknown as AiCanvasUpdate,
                            );
                            void updateSceneRef.current?.(
                                JSON.stringify(scene),
                            );
                        } catch (conversionError) {
                            console.error(
                                "Failed to apply canvas update:",
                                conversionError,
                            );
                        }
                        break;
                    }
                    case "updateElements": {
                        try {
                            void updateElementsRef.current?.(
                                input.elements as AiElement[],
                            );
                        } catch (updateError) {
                            console.error(
                                "Failed to apply element update:",
                                updateError,
                            );
                        }
                        break;
                    }
                    case "deleteElements": {
                        try {
                            void deleteElementsRef.current?.(
                                input.elementIds as string[],
                            );
                        } catch (deleteError) {
                            console.error(
                                "Failed to delete elements:",
                                deleteError,
                            );
                        }
                        break;
                    }
                    case "createLabeledShapes": {
                        try {
                            const expanded = expandLabeledShapesToElements(
                                input.shapes as AiLabeledShape[],
                            );
                            void updateElementsRef.current?.(expanded);
                        } catch (labelError) {
                            console.error(
                                "Failed to create labeled shapes:",
                                labelError,
                            );
                        }
                        break;
                    }
                    case "renderMermaid": {
                        try {
                            void renderMermaidRef.current?.(
                                input.mermaidSyntax as string,
                            );
                        } catch (mermaidError) {
                            console.error(
                                "Failed to render Mermaid diagram:",
                                mermaidError,
                            );
                        }
                        break;
                    }
                }
            },
            onFinish({ message }) {
                const currentSocket = socketRef.current;
                if (!currentSocket) {
                    return;
                }

                currentSocket.emit("chat:message", {
                    chatId: chatIdRef.current,
                    message: message as unknown as Record<string, unknown>,
                });
            },
            onError(chatError) {
                console.error("Chat error:", chatError);
            },
        });

        const broadcastedUserMessageIds = useRef(new Set<string>());
        const remoteMessageIds = useRef(new Set<string>());

        useEffect(() => {
            broadcastedUserMessageIds.current.clear();
            remoteMessageIds.current.clear();
        }, [projectId, chatId]);

        useEffect(() => {
            if (!socket) {
                return;
            }

            for (const message of messages) {
                if (message.role !== "user") {
                    continue;
                }

                if (broadcastedUserMessageIds.current.has(message.id)) {
                    continue;
                }

                if (remoteMessageIds.current.has(message.id)) {
                    continue;
                }

                broadcastedUserMessageIds.current.add(message.id);
                socket.emit("chat:message", {
                    chatId,
                    message: message as unknown as Record<string, unknown>,
                });
            }
        }, [messages, socket, chatId]);

        useEffect(() => {
            if (!socket) {
                return;
            }

            const handleRemoteMessage = (payload: {
                chatId: string;
                message: Record<string, unknown>;
                senderId: string;
            }) => {
                if (payload.chatId !== chatIdRef.current) {
                    return;
                }

                const remoteMessage = payload.message as unknown as UIMessage;
                remoteMessageIds.current.add(remoteMessage.id);

                setMessages((previousMessages) => {
                    const existingIds = new Set(
                        previousMessages.map((message) => message.id),
                    );

                    if (existingIds.has(remoteMessage.id)) {
                        return previousMessages;
                    }

                    return [...previousMessages, remoteMessage];
                });
            };

            socket.on("chat:remote-message", handleRemoteMessage);

            return () => {
                socket.off("chat:remote-message", handleRemoteMessage);
            };
        }, [socket, setMessages]);

        useImperativeHandle(ref, () => ({
            async sendMessage(text: string) {
                const trimmed = text.trim();
                if (!trimmed) {
                    return;
                }

                try {
                    await sendMessage({ text: trimmed });
                } catch (sendError) {
                    console.error(
                        "sendMessage (imperative) failed:",
                        sendError,
                    );
                }
            },
        }));

        if (messagesRef) {
            messagesRef.current = messages;
        }

        const handleSend = useCallback(
            async (content: string) => {
                const trimmed = content.trim();
                if (!trimmed) {
                    return;
                }

                if (error) {
                    clearError();
                }

                try {
                    await sendMessage({ text: trimmed });
                } catch (sendError) {
                    console.error("sendMessage failed:", sendError);
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
                <div className="border-b border-zinc-200 px-2 py-2 dark:border-zinc-800">
                    <ChatSelector
                        chats={chats}
                        activeChatId={chatId}
                        onChatSelect={onChatSelect}
                        onNewChat={onNewChat}
                        onDeleteChat={onDeleteChat}
                    />
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
    },
);
