"use client";

import { createContext, useContext } from "react";
import type { AiElement } from "@/lib/ai/excalidraw-ai-schema";

export interface ExcalidrawOperations {
    getScene: () => Promise<string | null>;
    getPng: () => Promise<string | null>;
    updateScene: (json: string) => Promise<void>;
    updateElements: (elements: AiElement[]) => Promise<void>;
    deleteElements: (elementIds: string[]) => Promise<void>;
}

const noop = async () => {};
const noopNull = async () => null;

const ExcalidrawOperationsContext = createContext<ExcalidrawOperations>({
    getScene: noopNull,
    getPng: noopNull,
    updateScene: noop,
    updateElements: noop,
    deleteElements: noop,
});

export const ExcalidrawOperationsProvider =
    ExcalidrawOperationsContext.Provider;

export function useExcalidrawOps(): ExcalidrawOperations {
    return useContext(ExcalidrawOperationsContext);
}
