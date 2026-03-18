"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PendingInvitation } from "../components/collaboration/InvitationList";

async function fetchInvitations(): Promise<PendingInvitation[]> {
    const response = await fetch("/api/invitations");

    if (!response.ok) {
        throw new Error("Failed to fetch invitations");
    }

    const data = await response.json();

    return data.invitations ?? [];
}

interface RespondToInvitationPayload {
    invitationId: string;
    action: "accept" | "decline";
}

async function respondToInvitationRequest({
    invitationId,
    action,
}: RespondToInvitationPayload): Promise<"accept" | "decline"> {
    const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
    });

    if (!response.ok) {
        throw new Error("Failed to process invitation");
    }

    return action;
}

interface SendInvitationPayload {
    projectId: string;
    username: string;
}

interface SendInvitationResult {
    ok: boolean;
    error?: string;
}

async function sendInvitationRequest({
    projectId,
    username,
}: SendInvitationPayload): Promise<SendInvitationResult> {
    const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, username }),
    });

    const data = await response.json();

    if (!response.ok) {
        return { ok: false, error: data.error };
    }

    return { ok: true };
}

export function useInvitations(enabled = true) {
    return useQuery<PendingInvitation[]>({
        queryKey: ["invitations"],
        queryFn: fetchInvitations,
        enabled,
    });
}

export function useRespondToInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: respondToInvitationRequest,
        onSuccess: (action) => {
            queryClient.invalidateQueries({ queryKey: ["invitations"] });

            if (action === "accept") {
                queryClient.invalidateQueries({ queryKey: ["projects"] });
            }
        },
    });
}

export function useSendInvitation() {
    return useMutation({
        mutationFn: sendInvitationRequest,
    });
}
