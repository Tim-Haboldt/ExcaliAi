"use client";

import { useCallback, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useSendInvitation } from "@/app/hooks/useInvitations";

interface InviteDialogProps {
    projectId: string;
    onClose: () => void;
}

export function InviteDialog({ projectId, onClose }: InviteDialogProps) {
    const [username, setUsername] = useState("");
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const sendInvitationMutation = useSendInvitation();

    const handleSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();

            const trimmedUsername = username.trim();
            if (!trimmedUsername) {
                return;
            }

            setFeedback(null);

            const result = await sendInvitationMutation.mutateAsync({
                projectId,
                username: trimmedUsername,
            });

            if (!result.ok) {
                setFeedback({
                    type: "error",
                    message: result.error ?? "Failed to send invitation",
                });

                return;
            }

            setFeedback({
                type: "success",
                message: `Invitation sent to ${trimmedUsername}`,
            });
            setUsername("");
        },
        [projectId, username, sendInvitationMutation],
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        },
        [onClose],
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-dialog-title"
            onKeyDown={handleKeyDown}
        >
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                    <h2
                        id="invite-dialog-title"
                        className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                    >
                        <UserPlus size={16} />
                        Invite Collaborator
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Dismiss"
                        className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="Enter username..."
                        className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        disabled={sendInvitationMutation.isPending}
                        autoFocus
                    />

                    {feedback && (
                        <p
                            className={[
                                "mt-2 text-xs",
                                feedback.type === "success"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400",
                            ].join(" ")}
                        >
                            {feedback.message}
                        </p>
                    )}

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            disabled={
                                sendInvitationMutation.isPending ||
                                !username.trim()
                            }
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {sendInvitationMutation.isPending
                                ? "Sending..."
                                : "Send Invite"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
