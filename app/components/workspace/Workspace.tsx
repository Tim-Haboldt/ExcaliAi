"use client";

import { useCallback, useRef } from "react";
import { ChatPanel } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export function Workspace() {
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);

    const handleExcalidrawAPI = useCallback(
        (api: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = api;
        },
        [],
    );

    const getExcalidrawScene = useCallback(async () => {
        const api = excalidrawApiRef.current;
        if (!api) return null;

        const { serializeAsJSON } = await import("@excalidraw/excalidraw");
        return serializeAsJSON(
            api.getSceneElements(),
            api.getAppState(),
            api.getFiles(),
            "local",
        );
    }, []);

    return (
        <div className="flex h-dvh w-full flex-col bg-zinc-50 dark:bg-black md:flex-row">
            <div className="min-h-0 min-w-0 flex-1">
                <ExcalidrawCanvas
                    className="h-full w-full"
                    excalidrawAPI={handleExcalidrawAPI}
                />
            </div>

            <div className="h-[40dvh] w-full md:h-full md:w-[420px]">
                <ChatPanel
                    className="h-full"
                    getExcalidrawScene={getExcalidrawScene}
                />
            </div>
        </div>
    );
}
