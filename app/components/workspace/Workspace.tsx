"use client";

import { useCallback, useRef } from "react";
import { ChatPanel } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";
import { excalidrawSceneSchema } from "../excalidraw/excalidrawSceneSchema";
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
        const json = serializeAsJSON(
            api.getSceneElements(),
            api.getAppState(),
            api.getFiles(),
            "local",
        );

        const result = excalidrawSceneSchema.safeParse(JSON.parse(json));
        if (!result.success) {
            console.error(
                "Excalidraw scene schema mismatch on export:",
                result.error,
            );
            alert(
                "Excalidraw scene schema mismatch - the exported scene does not match the expected schema. " +
                    "Check the console for details and update excalidrawSceneSchema.ts.",
            );
        }

        return json;
    }, []);

    const updateExcalidrawScene = useCallback(async (json: string) => {
        const api = excalidrawApiRef.current;
        if (!api) return;

        const { restore, CaptureUpdateAction } = await import(
            "@excalidraw/excalidraw"
        );

        const data = excalidrawSceneSchema.parse(JSON.parse(json));
        const restored = restore(
            data as Parameters<typeof restore>[0],
            null,
            null,
        );

        api.updateScene({
            elements: restored.elements,
            appState: restored.appState,
            captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });

        if (data.files) {
            const fileArray = Object.values(data.files) as Parameters<
                typeof api.addFiles
            >[0];
            if (fileArray.length > 0) {
                api.addFiles(fileArray);
            }
        }
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
                    updateExcalidrawScene={updateExcalidrawScene}
                />
            </div>
        </div>
    );
}
