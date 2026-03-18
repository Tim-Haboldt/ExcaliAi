"use client";

import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { Group, Panel, type PanelSize } from "react-resizable-panels";
import type { UIMessage } from "@ai-sdk/react";
import type {
    Collaborator as ExcalidrawCollaborator,
    SocketId,
} from "@excalidraw/excalidraw/types";
import { ChatPanel, type ChatPanelHandle } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";
import { useExcalidrawOperations } from "./useExcalidrawOperations";
import { ExcalidrawOperationsProvider } from "./ExcalidrawOperationsContext";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { useSocket } from "@/app/hooks/useSocket";
import { useCanvasCollaboration } from "@/app/hooks/useCanvasCollaboration";
import { useSaveProject } from "@/app/hooks/useProjects";
import { PresenceIndicator } from "../collaboration/PresenceIndicator";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { Collaborator } from "@/server/socket-events";

const CANVAS_DEFAULT_SIZE = "70%";
const CHAT_DEFAULT_SIZE = "30%";
const CANVAS_MIN_SIZE = "20%";
const CHAT_MIN_SIZE = "15%";
const COLLAPSED_SIZE = "0%";

const RESIZE_TARGET_MINIMUM_SIZE = {
    coarse: 44,
    fine: 16,
};

function isPanelCollapsed(panelSize: PanelSize): boolean {
    return panelSize.asPercentage < 1;
}

function buildExcalidrawCollaborators(
    collaborators: Collaborator[],
    ownAccountId: string | undefined,
): Map<SocketId, ExcalidrawCollaborator> {
    const collabMap = new Map<SocketId, ExcalidrawCollaborator>();

    for (const collaborator of collaborators) {
        if (collaborator.accountId === ownAccountId) {
            continue;
        }

        collabMap.set(collaborator.socketId as SocketId, {
            username: collaborator.username,
            pointer: collaborator.pointer
                ? {
                      x: collaborator.pointer.x,
                      y: collaborator.pointer.y,
                      tool: "pointer",
                  }
                : undefined,
            button: collaborator.button,
            isCurrentUser: false,
        });
    }

    return collabMap;
}

export interface WorkspaceHandle {
    getState: () => Promise<{ chat: UIMessage[]; canvas: string | null }>;
}

interface WorkspaceProps {
    projectId: string;
    currentUserId: string;
    initialChat?: UIMessage[];
    initialCanvas?: ExcalidrawInitialDataState;
    collaborators?: Collaborator[];
}

export const Workspace = forwardRef<WorkspaceHandle, WorkspaceProps>(
    function Workspace(
        {
            projectId,
            currentUserId,
            initialChat,
            initialCanvas,
            collaborators = [],
        },
        ref,
    ) {
        const {
            handleExcalidrawAPI,
            excalidrawApiRef,
            getScene,
            getPng,
            updateScene,
            updateElements,
            deleteElements,
        } = useExcalidrawOperations();

        const chatMessagesRef = useRef<UIMessage[]>(initialChat ?? []);
        const chatRef = useRef<ChatPanelHandle>(null);

        const { socket } = useSocket();
        const { emitElementChanges, emitCursorPosition } =
            useCanvasCollaboration(socket, excalidrawApiRef);

        const saveProjectMutation = useSaveProject();
        const AUTO_SAVE_INTERVAL_MS = 30_000;

        useEffect(() => {
            const interval = setInterval(async () => {
                const canvas = await getScene();
                if (!canvas) {
                    return;
                }

                try {
                    await saveProjectMutation.mutateAsync({
                        projectId,
                        chat: chatMessagesRef.current,
                        canvas,
                    });
                } catch (autoSaveError) {
                    console.error("Auto-save failed:", autoSaveError);
                }
            }, AUTO_SAVE_INTERVAL_MS);

            return () => clearInterval(interval);
        }, [projectId, getScene]);

        useImperativeHandle(ref, () => ({
            async getState() {
                const canvas = await getScene();

                return {
                    chat: chatMessagesRef.current,
                    canvas,
                };
            },
        }));

        const handleAiPrompt = useCallback(
            (instruction: string, selectedElementIds: string[]) => {
                const prefix =
                    selectedElementIds.length > 0
                        ? `[Regarding selected elements: ${selectedElementIds.join(", ")}]\n`
                        : "";
                const fullMessage = `${prefix}${instruction}`;

                void chatRef.current?.sendMessage(fullMessage);
            },
            [],
        );

        const handleCanvasChange = useCallback(
            (
                elements: readonly {
                    id: string;
                    version: number;
                    updated: number;
                    [key: string]: unknown;
                }[],
            ) => {
                emitElementChanges(elements);
            },
            [emitElementChanges],
        );

        const handlePointerUpdate = useCallback(
            (payload: {
                pointer: { x: number; y: number; tool: "pointer" | "laser" };
                button: "up" | "down";
            }) => {
                emitCursorPosition({
                    pointer: {
                        x: payload.pointer.x,
                        y: payload.pointer.y,
                    },
                    button: payload.button,
                });
            },
            [emitCursorPosition],
        );

        const excalidrawCollaborators = useMemo(
            () => buildExcalidrawCollaborators(collaborators, currentUserId),
            [collaborators, currentUserId],
        );

        const isDesktop = useMediaQuery("(min-width: 768px)");
        const orientation: "horizontal" | "vertical" = isDesktop
            ? "horizontal"
            : "vertical";

        const [isCanvasCollapsed, setIsCanvasCollapsed] = useState(false);
        const [isChatCollapsed, setIsChatCollapsed] = useState(false);

        const handleCanvasResize = useCallback((panelSize: PanelSize) => {
            setIsCanvasCollapsed(isPanelCollapsed(panelSize));
        }, []);

        const handleChatResize = useCallback((panelSize: PanelSize) => {
            setIsChatCollapsed(isPanelCollapsed(panelSize));
        }, []);

        const hasOtherCollaborators = collaborators.some(
            (collaborator) => collaborator.accountId !== currentUserId,
        );

        const excalidrawOps = useMemo(
            () => ({
                getScene,
                getPng,
                updateScene,
                updateElements,
                deleteElements,
            }),
            [getScene, getPng, updateScene, updateElements, deleteElements],
        );

        return (
            <ExcalidrawOperationsProvider value={excalidrawOps}>
                <div className="flex h-dvh w-full flex-col bg-zinc-50 dark:bg-black">
                    {hasOtherCollaborators && (
                        <div className="flex items-center border-b border-zinc-200 px-4 py-1.5 dark:border-zinc-800">
                            <PresenceIndicator
                                collaborators={collaborators}
                                currentUserId={currentUserId}
                            />
                        </div>
                    )}

                    <Group
                        orientation={orientation}
                        id="workspace-layout"
                        resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
                    >
                        <Panel
                            id="canvas"
                            defaultSize={CANVAS_DEFAULT_SIZE}
                            minSize={CANVAS_MIN_SIZE}
                            collapsible
                            collapsedSize={COLLAPSED_SIZE}
                            onResize={handleCanvasResize}
                        >
                            <div
                                className="h-full w-full overflow-hidden"
                                hidden={isCanvasCollapsed}
                            >
                                <ExcalidrawCanvas
                                    className="h-full w-full"
                                    excalidrawAPI={handleExcalidrawAPI}
                                    initialData={initialCanvas}
                                    theme="dark"
                                    onAiPrompt={handleAiPrompt}
                                    onChange={handleCanvasChange}
                                    onPointerUpdate={handlePointerUpdate}
                                    collaborators={excalidrawCollaborators}
                                />
                            </div>
                        </Panel>

                        <PanelResizeHandle orientation={orientation} />

                        <Panel
                            id="chat"
                            defaultSize={CHAT_DEFAULT_SIZE}
                            minSize={CHAT_MIN_SIZE}
                            collapsible
                            collapsedSize={COLLAPSED_SIZE}
                            onResize={handleChatResize}
                        >
                            <div
                                className="h-full w-full overflow-hidden"
                                hidden={isChatCollapsed}
                            >
                                <ChatPanel
                                    ref={chatRef}
                                    className="h-full"
                                    projectId={projectId}
                                    initialMessages={initialChat}
                                    messagesRef={chatMessagesRef}
                                />
                            </div>
                        </Panel>
                    </Group>
                </div>
            </ExcalidrawOperationsProvider>
        );
    },
);
