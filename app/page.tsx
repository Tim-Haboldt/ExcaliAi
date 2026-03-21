"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { AuthForm } from "./components/auth/AuthForm";
import {
    Workspace,
    type WorkspaceHandle,
} from "./components/workspace/Workspace";
import { ProjectSidebar } from "./components/sidebar/ProjectSidebar";
import { InviteDialog } from "./components/collaboration/InviteDialog";
import { SocketProvider } from "./components/collaboration/SocketProvider";
import { useSocket } from "./hooks/useSocket";
import { useSession, useLogout } from "./hooks/useSession";
import {
    useProjects,
    useProject,
    useCreateProject,
    useSaveProject,
    useDeleteProject,
} from "./hooks/useProjects";
import { useInvitations } from "./hooks/useInvitations";

export default function Home() {
    const { data: session, isLoading: isSessionLoading } = useSession();

    if (isSessionLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-foreground/50">Loading...</p>
            </div>
        );
    }

    if (!session?.user) {
        return <AuthForm />;
    }

    return (
        <SocketProvider>
            <AuthenticatedApp user={session.user} />
        </SocketProvider>
    );
}

interface AuthenticatedAppProps {
    user: { id: string; username: string };
}

function ErrorToast({
    message,
    onDismiss,
}: {
    message: string;
    onDismiss: () => void;
}) {
    return (
        <div
            role="alert"
            className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
            <span>{message}</span>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss error"
                className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200"
            >
                &times;
            </button>
        </div>
    );
}

function AuthenticatedApp({ user }: AuthenticatedAppProps) {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        null,
    );
    const [isSwitching, setIsSwitching] = useState(false);
    const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const showError = useCallback((message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    }, []);

    const workspaceRef = useRef<WorkspaceHandle>(null);
    const { socket, joinProject, leaveProject, collaborators } = useSocket();

    const { logout } = useLogout();
    const { data: projects = [] } = useProjects();
    const { data: invitations = [] } = useInvitations();

    const activeProjectId = useMemo(
        () =>
            selectedProjectId ?? (projects.length > 0 ? projects[0].id : null),
        [selectedProjectId, projects],
    );

    const { data: currentProject, isLoading: isProjectLoading } =
        useProject(activeProjectId);

    const createProjectMutation = useCreateProject();
    const saveProjectMutation = useSaveProject();
    const deleteProjectMutation = useDeleteProject();

    useEffect(() => {
        if (!activeProjectId || !socket) {
            return;
        }

        joinProject(activeProjectId).catch((joinError) => {
            console.error("Failed to join project room:", joinError);
            showError(
                "Failed to join project room. Real-time collaboration may not work.",
            );
        });

        return () => {
            leaveProject();
        };
    }, [activeProjectId, socket, joinProject, leaveProject, showError]);

    const saveCurrentProject = useCallback(async () => {
        if (!activeProjectId || !workspaceRef.current) {
            return;
        }

        try {
            const state = await workspaceRef.current.getState();
            await saveProjectMutation.mutateAsync({
                projectId: activeProjectId,
                canvas: state.canvas,
            });
        } catch (saveError) {
            console.error("Failed to save project:", saveError);
            showError("Failed to save project.");
        }
    }, [activeProjectId, saveProjectMutation, showError]);

    const handleProjectSelect = useCallback(
        async (projectId: string) => {
            if (activeProjectId === projectId) {
                return;
            }

            setIsSwitching(true);

            try {
                await saveCurrentProject();
                setSelectedProjectId(projectId);
            } catch (switchError) {
                console.error("Failed to switch project:", switchError);
                showError("Failed to switch project.");
            } finally {
                setIsSwitching(false);
            }
        },
        [activeProjectId, saveCurrentProject],
    );

    const handleNewProject = useCallback(async () => {
        await saveCurrentProject();
        setIsSwitching(true);

        try {
            const newProjectId = await createProjectMutation.mutateAsync();
            setSelectedProjectId(newProjectId);
        } catch (createError) {
            console.error("Failed to create project:", createError);
            showError("Failed to create project.");
        } finally {
            setIsSwitching(false);
        }
    }, [saveCurrentProject, createProjectMutation]);

    const handleProjectDelete = useCallback(
        async (projectId: string) => {
            try {
                await deleteProjectMutation.mutateAsync(projectId);

                if (activeProjectId === projectId) {
                    setSelectedProjectId(null);
                }
            } catch (deleteError) {
                console.error("Failed to delete project:", deleteError);
                showError("Failed to delete project.");
            }
        },
        [activeProjectId, deleteProjectMutation],
    );

    const handleLogout = useCallback(async () => {
        await saveCurrentProject();
        leaveProject();
        await logout();
    }, [saveCurrentProject, leaveProject, logout]);

    return (
        <div className="flex h-dvh">
            <ProjectSidebar
                username={user.username}
                projects={projects}
                activeProjectId={activeProjectId}
                invitations={invitations}
                onProjectSelect={handleProjectSelect}
                onProjectDelete={handleProjectDelete}
                onNewProject={handleNewProject}
                onLogout={handleLogout}
                onInvite={setInviteProjectId}
            />

            <div className="flex-1">
                {isSwitching || isProjectLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
                            <p className="text-sm text-foreground/50">
                                Loading project...
                            </p>
                        </div>
                    </div>
                ) : currentProject ? (
                    <Workspace
                        key={currentProject.id}
                        ref={workspaceRef}
                        projectId={currentProject.id}
                        currentUserId={user.id}
                        initialCanvas={currentProject.canvas}
                        collaborators={collaborators}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <p className="text-foreground/50">
                                No project selected
                            </p>
                            <button
                                type="button"
                                onClick={handleNewProject}
                                className="mt-3 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                            >
                                Create your first project
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {inviteProjectId && (
                <InviteDialog
                    projectId={inviteProjectId}
                    onClose={() => setInviteProjectId(null)}
                />
            )}

            {errorMessage && (
                <ErrorToast
                    message={errorMessage}
                    onDismiss={() => setErrorMessage(null)}
                />
            )}
        </div>
    );
}
