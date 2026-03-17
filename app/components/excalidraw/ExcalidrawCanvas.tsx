"use client";

import dynamic from "next/dynamic";
import type {
    ExcalidrawProps,
    Collaborator,
    SocketId,
} from "@excalidraw/excalidraw/types";

const ExcalidrawInner = dynamic(() => import("./ExcalidrawInner"), {
    ssr: false,
});

type Props = Pick<
    ExcalidrawProps,
    "initialData" | "onChange" | "onPointerUpdate" | "theme" | "excalidrawAPI"
> & {
    className?: string;
    onAiPrompt?: (instruction: string, selectedElementIds: string[]) => void;
    collaborators?: Map<SocketId, Collaborator>;
};

export function ExcalidrawCanvas({ className, ...props }: Props) {
    return (
        <div className={className}>
            <ExcalidrawInner {...props} />
        </div>
    );
}
