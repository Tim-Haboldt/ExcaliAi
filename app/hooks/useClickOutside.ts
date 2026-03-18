"use client";

import { useEffect, type RefObject } from "react";

export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    onClickOutside: () => void,
    enabled = true,
) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClickOutside();
            }
        }

        function handleMouseDown(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClickOutside();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handleMouseDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [ref, onClickOutside, enabled]);
}
