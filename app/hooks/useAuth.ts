"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AuthPayload {
    mode: "login" | "register";
    username: string;
}

interface AuthResult {
    id: string;
    username: string;
}

interface AuthErrorResult {
    error: string;
}

async function authenticateRequest({
    mode,
    username,
}: AuthPayload): Promise<AuthResult> {
    const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorData = data as AuthErrorResult;
        throw new Error(errorData.error ?? "Something went wrong");
    }

    return data as AuthResult;
}

export function useAuthenticate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: authenticateRequest,
        onSuccess: (userData) => {
            queryClient.setQueryData(["session"], { user: userData });
        },
    });
}
