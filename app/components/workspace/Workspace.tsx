"use client";

import { ChatPanel } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";
import { useExcalidrawOperations } from "./useExcalidrawOperations";

export function Workspace() {
    const {
        handleExcalidrawAPI,
        getScene,
        getPng,
        updateScene,
        updateElements,
        deleteElements,
    } = useExcalidrawOperations();

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
                    getExcalidrawScene={getScene}
                    getExcalidrawPng={getPng}
                    updateExcalidrawScene={updateScene}
                    updateExcalidrawElements={updateElements}
                    deleteExcalidrawElements={deleteElements}
                />
            </div>
        </div>
    );
}
