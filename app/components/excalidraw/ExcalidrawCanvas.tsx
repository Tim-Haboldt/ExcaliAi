"use client";

import dynamic from "next/dynamic";
import type { ExcalidrawProps } from "@excalidraw/excalidraw/types";

const Excalidraw = dynamic(
    async () => (await import("@excalidraw/excalidraw")).Excalidraw,
    { ssr: false },
);

type Props = Pick<
    ExcalidrawProps,
    "initialData" | "onChange" | "onPointerUpdate" | "theme" | "excalidrawAPI"
> & {
    className?: string;
};

export function ExcalidrawCanvas({ className, ...props }: Props) {
    return (
        <div className={className}>
            <Excalidraw {...props} />
        </div>
    );
}
