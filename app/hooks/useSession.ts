"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SessionUser {
    id: string;
    username: string;
}

interface SessionData {
    user: SessionUser | null;
}

async function fetchSession(): Promise<SessionData> {
    const response = await fetch("/api/auth/me");

    if (!response.ok) {
        throw new Error("Failed to fetch session");
    }

    const data = await response.json();

    return { user: data.user ?? null };
}

export function useSession() {
    return useQuery<SessionData>({
        queryKey: ["session"],
        queryFn: fetchSession,
        retry: false,
        staleTime: Infinity,
    });
}

async function logoutRequest(): Promise<void> {
    const response = await fetch("/api/auth/logout", { method: "POST" });

    if (!response.ok) {
        throw new Error("Failed to logout");
    }
}

export function useLogout() {
    const queryClient = useQueryClient();

    const { mutateAsync: logout, isPending: isLoggingOut } = useMutation({
        mutationFn: logoutRequest,
        onSuccess: () => {
            queryClient.setQueryData<SessionData>(["session"], { user: null });
        },
    });

    return { logout, isLoggingOut };
}
