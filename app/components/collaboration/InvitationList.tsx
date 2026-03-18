"use client";

import { Check, X, Mail } from "lucide-react";
import { useRespondToInvitation } from "@/app/hooks/useInvitations";

export interface PendingInvitation {
    id: string;
    createdAt: string;
    project: { id: string; createdAt: string };
    inviter: { username: string };
}

interface InvitationListProps {
    invitations: PendingInvitation[];
}

export function InvitationList({ invitations }: InvitationListProps) {
    const respondMutation = useRespondToInvitation();

    function handleAction(invitationId: string, action: "accept" | "decline") {
        respondMutation.mutate({ invitationId, action });
    }

    if (invitations.length === 0) {
        return null;
    }

    return (
        <div className="border-b border-zinc-200 px-2 py-2 dark:border-zinc-800">
            <div className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium text-zinc-500">
                <Mail size={12} />
                Invitations ({invitations.length})
            </div>

            {invitations.map((invitation) => {
                const isProcessing =
                    respondMutation.isPending &&
                    respondMutation.variables?.invitationId === invitation.id;

                return (
                    <div
                        key={invitation.id}
                        className="mb-0.5 flex items-center rounded-md px-2 py-1.5 text-zinc-600 dark:text-zinc-400"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-xs">
                                From{" "}
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                    {invitation.inviter.username}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-0.5">
                            <button
                                type="button"
                                onClick={() =>
                                    handleAction(invitation.id, "accept")
                                }
                                disabled={isProcessing}
                                className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-950"
                                title="Accept"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleAction(invitation.id, "decline")
                                }
                                disabled={isProcessing}
                                className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                                title="Decline"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
