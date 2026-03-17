"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

interface SessionUser {
    id: string;
    username: string;
}

interface SessionData {
    user: SessionUser | null;
}

async function fetchSession(): Promise<SessionData> {
    const response = await fetch("/api/auth/me");
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

export function useLogout() {
    const queryClient = useQueryClient();

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        queryClient.setQueryData<SessionData>(["session"], { user: null });
    }

    return { logout };
}
