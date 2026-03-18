"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AppSocket } from "./useSocket";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const CURSOR_THROTTLE_MS = 50;

export function useCanvasCollaboration(
    socket: AppSocket | null,
    excalidrawApiRef: React.RefObject<ExcalidrawImperativeAPI | null>,
) {
    const isApplyingRemoteUpdate = useRef(false);
    const lastCursorEmitTime = useRef(0);

    const emitElementChanges = useCallback(
        (
            elements: readonly {
                id: string;
                version: number;
                updated: number;
                [key: string]: unknown;
            }[],
        ) => {
            if (!socket || isApplyingRemoteUpdate.current) {
                return;
            }

            const changedElements = elements.filter(
                (element) => element.updated > Date.now() - 1000,
            );

            if (changedElements.length === 0) {
                return;
            }

            const serialized = changedElements.map((element) =>
                JSON.parse(JSON.stringify(element)),
            );

            socket.emit("canvas:update", { elements: serialized });
        },
        [socket],
    );

    const emitCursorPosition = useCallback(
        (payload: {
            pointer: { x: number; y: number };
            button: "up" | "down";
        }) => {
            if (!socket) {
                return;
            }

            const now = Date.now();
            if (now - lastCursorEmitTime.current < CURSOR_THROTTLE_MS) {
                return;
            }
            lastCursorEmitTime.current = now;

            socket.emit("cursor:move", {
                pointer: payload.pointer,
                button: payload.button,
            });
        },
        [socket],
    );

    useEffect(() => {
        if (!socket) {
            return;
        }

        const handleRemoteCanvasUpdate = (payload: {
            elements: Record<string, unknown>[];
            senderId: string;
        }) => {
            const api = excalidrawApiRef.current;
            if (!api) {
                return;
            }

            isApplyingRemoteUpdate.current = true;

            try {
                const currentElements = api.getSceneElements();
                const elementMap = new Map(
                    currentElements.map((element) => [element.id, element]),
                );

                for (const remoteElement of payload.elements) {
                    const elementId = remoteElement.id as string;
                    const remoteVersion =
                        (remoteElement.version as number) ?? 0;
                    const existingElement = elementMap.get(elementId);

                    if (
                        !existingElement ||
                        remoteVersion > existingElement.version
                    ) {
                        elementMap.set(elementId, remoteElement as never);
                    }
                }

                import("@excalidraw/excalidraw").then(
                    ({ CaptureUpdateAction }) => {
                        api.updateScene({
                            elements: Array.from(elementMap.values()),
                            captureUpdate: CaptureUpdateAction.EVENTUALLY,
                        });
                        isApplyingRemoteUpdate.current = false;
                    },
                );
            } catch {
                isApplyingRemoteUpdate.current = false;
            }
        };

        socket.on("canvas:remote-update", handleRemoteCanvasUpdate);

        return () => {
            socket.off("canvas:remote-update", handleRemoteCanvasUpdate);
        };
    }, [socket, excalidrawApiRef]);

    return {
        emitElementChanges,
        emitCursorPosition,
        isApplyingRemoteUpdate,
    };
}
