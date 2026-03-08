"use client";

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
} from "react";
import { io, type Socket } from "socket.io-client";
import type {
    ServerToClientEvents,
    ClientToServerEvents,
    Collaborator,
} from "@/server/socket-events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
    socket: AppSocket | null;
    isConnected: boolean;
    collaborators: Collaborator[];
    joinProject: (projectId: string) => Promise<void>;
    leaveProject: () => void;
}

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
    collaborators: [],
    joinProject: async () => {},
    leaveProject: () => {},
});

export function useSocket() {
    return useContext(SocketContext);
}

export function useSocketConnection() {
    const [socket, setSocket] = useState<AppSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const socketRef = useRef<AppSocket | null>(null);

    useEffect(() => {
        const newSocket: AppSocket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on("connect", () => {
            setIsConnected(true);
        });

        newSocket.on("disconnect", () => {
            setIsConnected(false);
            setCollaborators([]);
        });

        newSocket.on("presence:update", (updatedCollaborators) => {
            setCollaborators(updatedCollaborators);
        });

        return () => {
            newSocket.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
            setCollaborators([]);
        };
    }, []);

    const joinProject = useCallback(async (projectId: string) => {
        const currentSocket = socketRef.current;
        if (!currentSocket) {
            return;
        }

        return new Promise<void>((resolve, reject) => {
            currentSocket.emit("project:join", projectId, (response) => {
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error ?? "Failed to join"));
                }
            });
        });
    }, []);

    const leaveProject = useCallback(() => {
        socketRef.current?.emit("project:leave");
        setCollaborators([]);
    }, []);

    return {
        socket,
        isConnected,
        collaborators,
        joinProject,
        leaveProject,
    };
}
