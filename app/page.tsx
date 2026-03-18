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

function AuthenticatedApp({ user }: AuthenticatedAppProps) {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
        null,
    );
    const [isSwitching, setIsSwitching] = useState(false);
    const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);

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

    const { data: currentProject } = useProject(activeProjectId);

    const createProjectMutation = useCreateProject();
    const saveProjectMutation = useSaveProject();
    const deleteProjectMutation = useDeleteProject();

    useEffect(() => {
        if (!activeProjectId || !socket) {
            return;
        }

        joinProject(activeProjectId).catch((joinError) => {
            console.error("Failed to join project room:", joinError);
        });

        return () => {
            leaveProject();
        };
    }, [activeProjectId, socket, joinProject, leaveProject]);

    const saveCurrentProject = useCallback(async () => {
        if (!activeProjectId || !workspaceRef.current) {
            return;
        }

        try {
            const state = await workspaceRef.current.getState();
            await saveProjectMutation.mutateAsync({
                projectId: activeProjectId,
                chat: state.chat,
                canvas: state.canvas,
            });
        } catch (saveError) {
            console.error("Failed to save project:", saveError);
        }
    }, [activeProjectId, saveProjectMutation]);

    const handleProjectSelect = useCallback(
        async (projectId: string) => {
            if (activeProjectId === projectId) {
                return;
            }

            await saveCurrentProject();
            setIsSwitching(true);
            setSelectedProjectId(projectId);
            setIsSwitching(false);
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
                {isSwitching ? (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-foreground/50">Loading project...</p>
                    </div>
                ) : currentProject ? (
                    <Workspace
                        key={currentProject.id}
                        ref={workspaceRef}
                        projectId={currentProject.id}
                        currentUserId={user.id}
                        initialChat={currentProject.chat}
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
        </div>
    );
}
