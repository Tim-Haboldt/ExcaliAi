"use client";

import type { Collaborator } from "@/server/socket-events";

interface PresenceIndicatorProps {
    collaborators: Collaborator[];
    currentUserId: string;
}

const AVATAR_COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
];

function getColorForUsername(username: string): string {
    let hash = 0;
    for (let charIndex = 0; charIndex < username.length; charIndex++) {
        hash = username.charCodeAt(charIndex) + ((hash << 5) - hash);
    }

    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function PresenceIndicator({
    collaborators,
    currentUserId,
}: PresenceIndicatorProps) {
    const otherUsers = collaborators.filter(
        (collaborator) => collaborator.accountId !== currentUserId,
    );

    if (otherUsers.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1">
            {otherUsers.map((collaborator) => (
                <div
                    key={collaborator.socketId}
                    className={[
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white",
                        getColorForUsername(collaborator.username),
                    ].join(" ")}
                    title={collaborator.username}
                >
                    {collaborator.username.charAt(0).toUpperCase()}
                </div>
            ))}
            <span className="ml-1 text-xs text-zinc-500">
                {otherUsers.length === 1
                    ? `${otherUsers[0].username} is here`
                    : `${otherUsers.length} collaborators`}
            </span>
        </div>
    );
}
