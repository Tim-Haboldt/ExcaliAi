"use client";

import { useCallback, useState } from "react";
import { UserPlus, X } from "lucide-react";

interface InviteDialogProps {
    projectId: string;
    onClose: () => void;
}

export function InviteDialog({ projectId, onClose }: InviteDialogProps) {
    const [username, setUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const handleSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();

            const trimmedUsername = username.trim();
            if (!trimmedUsername) {
                return;
            }

            setIsSubmitting(true);
            setFeedback(null);

            try {
                const response = await fetch("/api/invitations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        projectId,
                        username: trimmedUsername,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setFeedback({ type: "error", message: data.error });

                    return;
                }

                setFeedback({
                    type: "success",
                    message: `Invitation sent to ${trimmedUsername}`,
                });
                setUsername("");
            } catch {
                setFeedback({
                    type: "error",
                    message: "Failed to send invitation",
                });
            } finally {
                setIsSubmitting(false);
            }
        },
        [projectId, username],
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        <UserPlus size={16} />
                        Invite Collaborator
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
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
                        disabled={isSubmitting}
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
                            disabled={isSubmitting || !username.trim()}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? "Sending..." : "Send Invite"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
