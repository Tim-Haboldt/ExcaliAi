"use client";

import { useCallback, useRef } from "react";
import { excalidrawSceneSchema } from "../excalidraw/excalidrawSceneSchema";
import {
    type AiElement,
    convertAiElementToExcalidraw,
} from "@/lib/ai/excalidraw-ai-schema";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export function useExcalidrawOperations() {
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);

    const handleExcalidrawAPI = useCallback(
        (api: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = api;
        },
        [],
    );

    const getScene = useCallback(async (): Promise<string | null> => {
        const api = excalidrawApiRef.current;
        if (!api) {
            return null;
        }

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

    const getPng = useCallback(async (): Promise<string | null> => {
        const api = excalidrawApiRef.current;
        if (!api) {
            return null;
        }

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

    const updateScene = useCallback(async (json: string) => {
        const api = excalidrawApiRef.current;
        if (!api) {
            return;
        }

        const { restore, CaptureUpdateAction } = await import(
            "@excalidraw/excalidraw"
        );

        // Validate structure, then pass raw parsed data to restore() so we
        // avoid type assertions bridging Zod types to Excalidraw internals.
        const parsedScene = JSON.parse(json);
        excalidrawSceneSchema.parse(parsedScene);

        const restored = restore(parsedScene, null, null);
        api.updateScene({
            elements: restored.elements,
            appState: restored.appState,
            captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });

        const fileArray = Object.values(restored.files);
        if (fileArray.length > 0) {
            api.addFiles(fileArray);
        }
    }, []);

    const updateElements = useCallback(
        async (aiElements: AiElement[]) => {
            const api = excalidrawApiRef.current;
            if (!api) {
                return;
            }

            const { restore, CaptureUpdateAction } = await import(
                "@excalidraw/excalidraw"
            );

            const currentElements = api.getSceneElements();
            const updatedIds = new Set(
                aiElements.map((element) => element.id),
            );
            const unchangedElements = currentElements.filter(
                (element) => !updatedIds.has(element.id),
            );

            // Round-trip through JSON so restore() receives untyped data,
            // avoiding type assertions between our schema and Excalidraw's.
            const convertedElements = aiElements.map(
                convertAiElementToExcalidraw,
            );
            const rawConverted = JSON.parse(
                JSON.stringify(convertedElements),
            );
            const { elements: normalizedElements } = restore(
                { elements: rawConverted },
                null,
                null,
            );

            api.updateScene({
                elements: [...unchangedElements, ...normalizedElements],
                captureUpdate: CaptureUpdateAction.EVENTUALLY,
            });
        },
        [],
    );

    const deleteElements = useCallback(
        async (elementIds: string[]) => {
            const api = excalidrawApiRef.current;
            if (!api) {
                return;
            }

            const { CaptureUpdateAction } = await import(
                "@excalidraw/excalidraw"
            );

            const idsToDelete = new Set(elementIds);
            const remaining = api
                .getSceneElements()
                .filter((element) => !idsToDelete.has(element.id));

            api.updateScene({
                elements: remaining,
                captureUpdate: CaptureUpdateAction.EVENTUALLY,
            });
        },
        [],
    );

    return {
        handleExcalidrawAPI,
        getScene,
        getPng,
        updateScene,
        updateElements,
        deleteElements,
    };
}
