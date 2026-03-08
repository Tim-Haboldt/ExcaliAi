export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: number;
    /** Serialized Excalidraw scene JSON, attached as context when available. */
    excalidrawScene?: string;
};
