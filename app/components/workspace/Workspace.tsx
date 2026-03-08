"use client";

import { useCallback, useRef } from "react";
import { ChatPanel } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";
import { excalidrawSceneSchema } from "../excalidraw/excalidrawSceneSchema";
import {
    type AiElement,
    convertAiElementToExcalidraw,
} from "@/lib/ai/excalidraw-ai-schema";
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

    const getExcalidrawPng = useCallback(async (): Promise<string | null> => {
        const api = excalidrawApiRef.current;
        if (!api) return null;

        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({
            elements: api.getSceneElements(),
            appState: {
                ...api.getAppState(),
                exportWithDarkMode: false,
                exportBackground: true,
            },
            files: api.getFiles(),
        });

        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
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

    const updateExcalidrawElements = useCallback(
        async (aiElements: AiElement[]) => {
            const api = excalidrawApiRef.current;
            if (!api) return;

            const { CaptureUpdateAction } = await import(
                "@excalidraw/excalidraw"
            );

            const currentElements = api.getSceneElements();
            const currentMap = new Map(
                currentElements.map((el) => [el.id, el]),
            );

            const convertedElements = aiElements.map(
                convertAiElementToExcalidraw,
            );
            for (const el of convertedElements) {
                currentMap.set(
                    el.id,
                    el as unknown as (typeof currentElements)[number],
                );
            }

            api.updateScene({
                elements: [...currentMap.values()],
                captureUpdate: CaptureUpdateAction.EVENTUALLY,
            });
        },
        [],
    );

    const deleteExcalidrawElements = useCallback(
        async (elementIds: string[]) => {
            const api = excalidrawApiRef.current;
            if (!api) return;

            const { CaptureUpdateAction } = await import(
                "@excalidraw/excalidraw"
            );

            const idsToDelete = new Set(elementIds);
            const remaining = api
                .getSceneElements()
                .filter((el) => !idsToDelete.has(el.id));

            api.updateScene({
                elements: remaining,
                captureUpdate: CaptureUpdateAction.EVENTUALLY,
            });
        },
        [],
    );

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
                    getExcalidrawPng={getExcalidrawPng}
                    updateExcalidrawScene={updateExcalidrawScene}
                    updateExcalidrawElements={updateExcalidrawElements}
                    deleteExcalidrawElements={deleteExcalidrawElements}
                />
            </div>
        </div>
    );
}
