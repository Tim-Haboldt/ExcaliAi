"use client";

import { useCallback, useRef } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import type { ExcalidrawProps, UIAppState } from "@excalidraw/excalidraw/types";
import { AiQuickPrompt } from "./AiQuickPrompt";

type Props = Pick<
    ExcalidrawProps,
    "initialData" | "onChange" | "onPointerUpdate" | "theme" | "excalidrawAPI"
> & {
    onAiPrompt?: (instruction: string, selectedElementIds: string[]) => void;
};

function extractSelectedIds(appState: UIAppState): string[] {
    if (!appState.selectedElementIds) {
        return [];
    }

    return Object.keys(appState.selectedElementIds);
}

export default function ExcalidrawInner({ onAiPrompt, ...props }: Props) {
    const onAiPromptRef = useRef(onAiPrompt);
    onAiPromptRef.current = onAiPrompt;

    const stableOnSubmit = useCallback(
        (instruction: string, selectedIds: string[]) => {
            onAiPromptRef.current?.(instruction, selectedIds);
        },
        [],
    );

    const renderTopRightUI = useCallback(
        (_isMobile: boolean, appState: UIAppState) => {
            return (
                <AiQuickPrompt
                    selectedElementIds={extractSelectedIds(appState)}
                    onSubmit={stableOnSubmit}
                />
            );
        },
        [stableOnSubmit],
    );

    return (
        <Excalidraw
            {...props}
            renderTopRightUI={onAiPrompt ? renderTopRightUI : undefined}
        >
            <MainMenu>
                <MainMenu.DefaultItems.SaveAsImage />
                <MainMenu.DefaultItems.Export />
                <MainMenu.DefaultItems.ClearCanvas />
                <MainMenu.DefaultItems.ToggleTheme />
                <MainMenu.DefaultItems.Help />
            </MainMenu>
        </Excalidraw>
    );
}
