export interface Collaborator {
    socketId: string;
    accountId: string;
    username: string;
    pointer: { x: number; y: number } | null;
    button: "up" | "down";
}

export interface ServerToClientEvents {
    "canvas:remote-update": (payload: {
        elements: Record<string, unknown>[];
        senderId: string;
    }) => void;
    "cursor:update": (payload: {
        senderId: string;
        username: string;
        pointer: { x: number; y: number } | null;
        button: "up" | "down";
    }) => void;
    "chat:remote-message": (payload: {
        message: Record<string, unknown>;
        senderId: string;
    }) => void;
    "presence:update": (collaborators: Collaborator[]) => void;
}

export interface ClientToServerEvents {
    "project:join": (
        projectId: string,
        callback: (response: { success: boolean; error?: string }) => void,
    ) => void;
    "project:leave": () => void;
    "canvas:update": (payload: {
        elements: Record<string, unknown>[];
    }) => void;
    "cursor:move": (payload: {
        pointer: { x: number; y: number } | null;
        button: "up" | "down";
    }) => void;
    "chat:message": (payload: { message: Record<string, unknown> }) => void;
}

export interface SocketSessionData {
    accountId: string;
    username: string;
}
