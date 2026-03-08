"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";

interface ProjectSummary {
    id: string;
    createdAt: string;
    updatedAt: string;
}

interface ProjectSidebarProps {
    username: string;
    projects: ProjectSummary[];
    activeProjectId: string | null;
    onProjectSelect: (projectId: string) => void;
    onProjectDelete: (projectId: string) => void;
    onNewProject: () => void;
    onLogout: () => void;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function ProjectSidebar({
    username,
    projects,
    activeProjectId,
    onProjectSelect,
    onProjectDelete,
    onNewProject,
    onLogout,
}: ProjectSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={[
                "flex h-full flex-col border-r border-zinc-200 bg-zinc-50 transition-[width] duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950",
                isCollapsed ? "w-12" : "w-56",
            ].join(" ")}
        >
            <div className="flex items-center border-b border-zinc-200 px-2 py-3 dark:border-zinc-800">
                {!isCollapsed && (
                    <div className="min-w-0 flex-1 px-2">
                        <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {username}
                        </div>
                        <button
                            type="button"
                            onClick={onLogout}
                            className="mt-1 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
                        >
                            Sign out
                        </button>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setIsCollapsed((previous) => !previous)}
                    className="flex-shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? (
                        <PanelLeftOpen size={18} />
                    ) : (
                        <PanelLeftClose size={18} />
                    )}
                </button>
            </div>

            {!isCollapsed && (
                <>
                    <div className="px-3 pt-3 pb-2">
                        <button
                            type="button"
                            onClick={onNewProject}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            + New Project
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-2 py-1">
                        {projects.length === 0 && (
                            <p className="px-2 py-4 text-center text-xs text-zinc-400">
                                No projects yet
                            </p>
                        )}

                        {projects.map((project) => {
                            const isActive = project.id === activeProjectId;

                            return (
                                <div
                                    key={project.id}
                                    className={[
                                        "group mb-0.5 flex items-center rounded-md transition-colors",
                                        isActive
                                            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/50",
                                    ].join(" ")}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onProjectSelect(project.id)}
                                        className="min-w-0 flex-1 px-3 py-2 text-left"
                                    >
                                        <div className="truncate text-sm">
                                            Project
                                        </div>
                                        <div className="text-xs opacity-60">
                                            {formatDate(project.updatedAt)}
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onProjectDelete(project.id);
                                        }}
                                        className="mr-1 flex-shrink-0 rounded p-1.5 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-500 dark:hover:text-red-400"
                                        title="Delete project"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </nav>
                </>
            )}
        </aside>
    );
}
