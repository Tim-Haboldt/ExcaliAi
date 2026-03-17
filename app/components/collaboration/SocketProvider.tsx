"use client";

import type { ReactNode } from "react";
import { SocketContext, useSocketConnection } from "@/app/hooks/useSocket";

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const socketConnection = useSocketConnection();

    return (
        <SocketContext.Provider value={socketConnection}>
            {children}
        </SocketContext.Provider>
    );
}
