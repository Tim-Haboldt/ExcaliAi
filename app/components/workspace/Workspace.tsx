"use client";

import { useCallback, useState } from "react";
import { Group, Panel, type PanelSize } from "react-resizable-panels";
import { ChatPanel } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";
import { useExcalidrawOperations } from "./useExcalidrawOperations";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";

const CANVAS_DEFAULT_SIZE = "70%";
const CHAT_DEFAULT_SIZE = "30%";
const CANVAS_MIN_SIZE = "20%";
const CHAT_MIN_SIZE = "15%";
const COLLAPSED_SIZE = "0%";

const RESIZE_TARGET_MINIMUM_SIZE = {
    coarse: 44,
    fine: 16,
};

function isPanelCollapsed(panelSize: PanelSize): boolean {
    return panelSize.asPercentage < 1;
}

export function Workspace() {
    const {
        handleExcalidrawAPI,
        getScene,
        getPng,
        updateScene,
        updateElements,
        deleteElements,
    } = useExcalidrawOperations();

    const isDesktop = useMediaQuery("(min-width: 768px)");
    const orientation: "horizontal" | "vertical" = isDesktop
        ? "horizontal"
        : "vertical";

    const [isCanvasCollapsed, setIsCanvasCollapsed] = useState(false);
    const [isChatCollapsed, setIsChatCollapsed] = useState(false);

    const handleCanvasResize = useCallback((panelSize: PanelSize) => {
        setIsCanvasCollapsed(isPanelCollapsed(panelSize));
    }, []);

    const handleChatResize = useCallback((panelSize: PanelSize) => {
        setIsChatCollapsed(isPanelCollapsed(panelSize));
    }, []);

    return (
        <div className="h-dvh w-full bg-zinc-50 dark:bg-black">
            <Group
                orientation={orientation}
                id="workspace-layout"
                resizeTargetMinimumSize={RESIZE_TARGET_MINIMUM_SIZE}
            >
                <Panel
                    id="canvas"
                    defaultSize={CANVAS_DEFAULT_SIZE}
                    minSize={CANVAS_MIN_SIZE}
                    collapsible
                    collapsedSize={COLLAPSED_SIZE}
                    onResize={handleCanvasResize}
                >
                    <div className="h-full w-full overflow-hidden">
                        {!isCanvasCollapsed && (
                            <ExcalidrawCanvas
                                className="h-full w-full"
                                excalidrawAPI={handleExcalidrawAPI}
                            />
                        )}
                    </div>
                </Panel>

                <PanelResizeHandle orientation={orientation} />

                <Panel
                    id="chat"
                    defaultSize={CHAT_DEFAULT_SIZE}
                    minSize={CHAT_MIN_SIZE}
                    collapsible
                    collapsedSize={COLLAPSED_SIZE}
                    onResize={handleChatResize}
                >
                    <div className="h-full w-full overflow-hidden">
                        {!isChatCollapsed && (
                            <ChatPanel
                                className="h-full"
                                getExcalidrawScene={getScene}
                                getExcalidrawPng={getPng}
                                updateExcalidrawScene={updateScene}
                                updateExcalidrawElements={updateElements}
                                deleteExcalidrawElements={deleteElements}
                            />
                        )}
                    </div>
                </Panel>
            </Group>
        </div>
    );
}
