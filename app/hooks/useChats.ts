"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "@ai-sdk/react";

export interface ChatSummary {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatData {
    id: string;
    title: string;
    messages: UIMessage[];
}

interface SaveChatPayload {
    projectId: string;
    chatId: string;
    messages: UIMessage[];
}

interface DeleteChatPayload {
    projectId: string;
    chatId: string;
}

async function fetchChats(projectId: string): Promise<ChatSummary[]> {
    const response = await fetch(`/api/projects/${projectId}/chats`);

    if (!response.ok) {
        throw new Error("Failed to fetch chats");
    }

    const data = await response.json();

    return data.chats ?? [];
}

async function fetchChat(projectId: string, chatId: string): Promise<ChatData> {
    const response = await fetch(`/api/projects/${projectId}/chats/${chatId}`);

    if (!response.ok) {
        throw new Error(`Failed to fetch chat ${chatId}`);
    }

    const data = await response.json();
    const chat = data.chat;
    const messages: UIMessage[] = Array.isArray(chat.messages)
        ? chat.messages
        : [];

    return { id: chat.id, title: chat.title, messages };
}

async function createChatRequest(projectId: string): Promise<ChatSummary> {
    const response = await fetch(`/api/projects/${projectId}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        throw new Error("Failed to create chat");
    }

    const data = await response.json();

    return data.chat;
}

async function saveChatRequest({
    projectId,
    chatId,
    messages,
}: SaveChatPayload): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
        throw new Error(`Failed to save chat ${chatId}`);
    }
}

async function deleteChatRequest({
    projectId,
    chatId,
}: DeleteChatPayload): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}/chats/${chatId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Failed to delete chat");
    }
}

export function useChats(projectId: string | null) {
    return useQuery<ChatSummary[]>({
        queryKey: ["chats", projectId],
        queryFn: () => fetchChats(projectId!),
        enabled: !!projectId,
    });
}

export function useChatMessages(
    projectId: string | null,
    chatId: string | null,
) {
    return useQuery<ChatData>({
        queryKey: ["chat", projectId, chatId],
        queryFn: () => fetchChat(projectId!, chatId!),
        enabled: !!projectId && !!chatId,
    });
}

export function useCreateChat(projectId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => createChatRequest(projectId!),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["chats", projectId],
            });
        },
    });
}

export function useSaveChat() {
    return useMutation({
        mutationFn: saveChatRequest,
    });
}

export function useDeleteChat(projectId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (chatId: string) =>
            deleteChatRequest({ projectId: projectId!, chatId }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["chats", projectId],
            });
        },
    });
}
