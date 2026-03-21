"use client";

import { useCallback, useRef } from "react";
import { excalidrawSceneSchema } from "../excalidraw/excalidrawSceneSchema";
import {
    type AiElement,
    convertAiElementToExcalidraw,
    resolveArrowBindings,
} from "@/lib/ai/excalidraw-ai-schema";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export function useExcalidrawOperations() {
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);

    const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
        excalidrawApiRef.current = api;
    }, []);

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

        const { restore, CaptureUpdateAction } =
            await import("@excalidraw/excalidraw");

        // Validate structure, then pass raw parsed data to restore() so we
        // avoid type assertions bridging Zod types to Excalidraw internals.
        const parsedScene = JSON.parse(json);
        excalidrawSceneSchema.parse(parsedScene);

        const restored = restore(parsedScene, null, null);

        const hasExplicitAppState =
            parsedScene.appState !== undefined &&
            parsedScene.appState !== null &&
            Object.keys(parsedScene.appState).length > 0;

        api.updateScene({
            elements: restored.elements,
            ...(hasExplicitAppState && { appState: restored.appState }),
            captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });

        const fileArray = Object.values(restored.files);
        if (fileArray.length > 0) {
            api.addFiles(fileArray);
        }
    }, []);

    const updateElements = useCallback(async (aiElements: AiElement[]) => {
        const api = excalidrawApiRef.current;
        if (!api) {
            return;
        }

        const { restore, CaptureUpdateAction } =
            await import("@excalidraw/excalidraw");

        const currentElements = api.getSceneElements();
        const updatedIds = new Set(aiElements.map((element) => element.id));
        const unchangedElements = currentElements.filter(
            (element) => !updatedIds.has(element.id),
        );

        const convertedElements = aiElements.map(convertAiElementToExcalidraw);
        const withBindings = resolveArrowBindings(convertedElements as never[]);
        const rawConverted = JSON.parse(JSON.stringify(withBindings));
        const { elements: normalizedElements } = restore(
            { elements: rawConverted },
            null,
            null,
        );

        api.updateScene({
            elements: [...unchangedElements, ...normalizedElements],
            captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });
    }, []);

    const deleteElements = useCallback(async (elementIds: string[]) => {
        const api = excalidrawApiRef.current;
        if (!api) {
            return;
        }

        const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");

        const idsToDelete = new Set(elementIds);
        const remaining = api
            .getSceneElements()
            .filter((element) => !idsToDelete.has(element.id));

        api.updateScene({
            elements: remaining,
            captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });
    }, []);

    const renderMermaid = useCallback(async (mermaidSyntax: string) => {
        const api = excalidrawApiRef.current;
        if (!api) {
            return;
        }

        const { parseMermaidToExcalidraw } =
            await import("@excalidraw/mermaid-to-excalidraw");
        const { convertToExcalidrawElements, CaptureUpdateAction } =
            await import("@excalidraw/excalidraw");

        const { elements: skeletonElements, files } =
            await parseMermaidToExcalidraw(mermaidSyntax);
        const excalidrawElements =
            convertToExcalidrawElements(skeletonElements);

        api.updateScene({
            elements: excalidrawElements,
            captureUpdate: CaptureUpdateAction.EVENTUALLY,
        });

        if (files) {
            api.addFiles(Object.values(files));
        }
    }, []);

    return {
        handleExcalidrawAPI,
        excalidrawApiRef,
        getScene,
        getPng,
        updateScene,
        updateElements,
        deleteElements,
        renderMermaid,
    };
}
