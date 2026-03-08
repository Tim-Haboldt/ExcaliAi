"use client";

import { Separator } from "react-resizable-panels";

type PanelResizeHandleProps = {
    orientation: "horizontal" | "vertical";
};

function GripDots({ orientation }: { orientation: "horizontal" | "vertical" }) {
    if (orientation === "horizontal") {
        return (
            <svg
                width="8"
                height="32"
                viewBox="0 0 8 32"
                fill="currentColor"
                aria-hidden="true"
            >
                <circle cx="2" cy="4" r="1.5" />
                <circle cx="2" cy="10" r="1.5" />
                <circle cx="2" cy="16" r="1.5" />
                <circle cx="2" cy="22" r="1.5" />
                <circle cx="2" cy="28" r="1.5" />
                <circle cx="6" cy="4" r="1.5" />
                <circle cx="6" cy="10" r="1.5" />
                <circle cx="6" cy="16" r="1.5" />
                <circle cx="6" cy="22" r="1.5" />
                <circle cx="6" cy="28" r="1.5" />
            </svg>
        );
    }

    return (
        <svg
            width="32"
            height="8"
            viewBox="0 0 32 8"
            fill="currentColor"
            aria-hidden="true"
        >
            <circle cx="4" cy="2" r="1.5" />
            <circle cx="10" cy="2" r="1.5" />
            <circle cx="16" cy="2" r="1.5" />
            <circle cx="22" cy="2" r="1.5" />
            <circle cx="28" cy="2" r="1.5" />
            <circle cx="4" cy="6" r="1.5" />
            <circle cx="10" cy="6" r="1.5" />
            <circle cx="16" cy="6" r="1.5" />
            <circle cx="22" cy="6" r="1.5" />
            <circle cx="28" cy="6" r="1.5" />
        </svg>
    );
}

export function PanelResizeHandle({ orientation }: PanelResizeHandleProps) {
    const isHorizontal = orientation === "horizontal";

    return (
        <Separator
            className={[
                "panel-resize-handle group flex items-center justify-center",
                isHorizontal ? "w-4" : "h-4",
            ].join(" ")}
        >
            <div className="text-zinc-400 transition-colors group-hover:text-zinc-500 group-active:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-400 dark:group-active:text-zinc-300">
                <GripDots orientation={orientation} />
            </div>
        </Separator>
    );
}
