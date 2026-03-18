"use client";

import { useCallback, useEffect, useRef } from "react";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import type {
    ExcalidrawProps,
    UIAppState,
    Collaborator,
    SocketId,
    ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import { AiQuickPrompt } from "./AiQuickPrompt";

declare global {
    interface Window {
        __EXCALIDRAW_API__?: ExcalidrawImperativeAPI;
    }
}

type Props = Pick<
    ExcalidrawProps,
    "initialData" | "onChange" | "onPointerUpdate" | "theme" | "excalidrawAPI"
> & {
    onAiPrompt?: (instruction: string, selectedElementIds: string[]) => void;
    collaborators?: Map<SocketId, Collaborator>;
};

function extractSelectedIds(appState: UIAppState): string[] {
    if (!appState.selectedElementIds) {
        return [];
    }

    return Object.keys(appState.selectedElementIds);
}

export default function ExcalidrawInner({
    onAiPrompt,
    collaborators,
    ...props
}: Props) {
    const onAiPromptRef = useRef(onAiPrompt);
    onAiPromptRef.current = onAiPrompt;

    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
    const collaboratorsRef = useRef(collaborators);
    collaboratorsRef.current = collaborators;

    const handleExcalidrawApi = useCallback(
        (api: ExcalidrawImperativeAPI) => {
            excalidrawApiRef.current = api;
            window.__EXCALIDRAW_API__ = api;
            props.excalidrawAPI?.(api);
        },
        [props.excalidrawAPI],
    );

    useEffect(() => {
        const api = excalidrawApiRef.current;
        if (!api || !collaborators) {
            return;
        }

        api.updateScene({ collaborators });
    }, [collaborators]);

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
            excalidrawAPI={handleExcalidrawApi}
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
