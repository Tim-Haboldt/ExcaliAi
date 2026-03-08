"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { AuthForm } from "./components/auth/AuthForm";
import {
    Workspace,
    type WorkspaceHandle,
} from "./components/workspace/Workspace";
import {
    ProjectSidebar,
    type ProjectSummary,
} from "./components/sidebar/ProjectSidebar";
import { InviteDialog } from "./components/collaboration/InviteDialog";
import { SocketProvider } from "./components/collaboration/SocketProvider";
import { useSocket } from "./hooks/useSocket";
import type { PendingInvitation } from "./components/collaboration/InvitationList";

interface User {
    id: string;
    username: string;
}

interface ProjectData {
    id: string;
    chat: UIMessage[];
    canvas: ExcalidrawInitialDataState;
}

type AuthState =
    | { status: "loading" }
    | { status: "unauthenticated" }
    | { status: "authenticated"; user: User };

async function fetchProjects(): Promise<ProjectSummary[]> {
    const response = await fetch("/api/projects");
    const data = await response.json();

    return data.projects ?? [];
}

async function fetchProject(projectId: string): Promise<ProjectData> {
    const response = await fetch(`/api/projects/${projectId}`);
    const data = await response.json();
    const project = data.project;

    const chat = Array.isArray(project.chat) ? project.chat : [];
    const canvas =
        typeof project.canvas === "object" && project.canvas !== null
            ? project.canvas
            : {};

    return {
        id: project.id,
        chat,
        canvas: canvas as ExcalidrawInitialDataState,
    };
}

async function saveProject(
    projectId: string,
    state: { chat: UIMessage[]; canvas: string | null },
) {
    const canvasData = state.canvas ? JSON.parse(state.canvas) : {};

    await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat: state.chat, canvas: canvasData }),
    });
}

async function createProject(): Promise<string> {
    const response = await fetch("/api/projects", { method: "POST" });
    const data = await response.json();

    return data.id;
}

async function fetchInvitations(): Promise<PendingInvitation[]> {
    const response = await fetch("/api/invitations");
    const data = await response.json();

    return data.invitations ?? [];
}

export default function Home() {
    const [authState, setAuthState] = useState<AuthState>({
        status: "loading",
    });

    useEffect(() => {
        async function checkSession() {
            try {
                const response = await fetch("/api/auth/me");
                const data = await response.json();
                if (data.user) {
                    setAuthState({
                        status: "authenticated",
                        user: data.user,
                    });
                } else {
                    setAuthState({ status: "unauthenticated" });
                }
            } catch {
                setAuthState({ status: "unauthenticated" });
            }
        }

        checkSession();
    }, []);

    switch (authState.status) {
        case "loading":
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-foreground/50">Loading...</p>
                </div>
            );

        case "unauthenticated":
            return (
                <AuthForm
                    onAuthenticated={(user) =>
                        setAuthState({ status: "authenticated", user })
                    }
                />
            );

        case "authenticated":
            return (
                <SocketProvider>
                    <AuthenticatedApp
                        user={authState.user}
                        onLogout={() => {
                            setAuthState({ status: "unauthenticated" });
                        }}
                    />
                </SocketProvider>
            );
    }
}

interface AuthenticatedAppProps {
    user: User;
    onLogout: () => void;
}

function AuthenticatedApp({ user, onLogout }: AuthenticatedAppProps) {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [currentProject, setCurrentProject] = useState<ProjectData | null>(
        null,
    );
    const [isSwitching, setIsSwitching] = useState(false);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);

    const workspaceRef = useRef<WorkspaceHandle>(null);
    const { socket, joinProject, leaveProject, collaborators } = useSocket();

    useEffect(() => {
        async function loadProjects() {
            const [projectList, invitationList] = await Promise.all([
                fetchProjects(),
                fetchInvitations(),
            ]);
            setProjects(projectList);
            setInvitations(invitationList);

            if (projectList.length > 0) {
                const projectData = await fetchProject(projectList[0].id);
                setCurrentProject(projectData);
            }
        }

        loadProjects();
    }, []);

    useEffect(() => {
        if (!currentProject || !socket) {
            return;
        }

        joinProject(currentProject.id).catch((joinError) => {
            console.error("Failed to join project room:", joinError);
        });

        return () => {
            leaveProject();
        };
    }, [currentProject?.id, socket, joinProject, leaveProject]);

    const saveCurrentProject = useCallback(async () => {
        if (!currentProject || !workspaceRef.current) {
            return;
        }

        try {
            const state = await workspaceRef.current.getState();
            await saveProject(currentProject.id, state);
        } catch (saveError) {
            console.error("Failed to save project:", saveError);
        }
    }, [currentProject]);

    const handleProjectSelect = useCallback(
        async (projectId: string) => {
            if (currentProject?.id === projectId) {
                return;
            }

            await saveCurrentProject();
            setIsSwitching(true);

            try {
                const projectData = await fetchProject(projectId);
                setCurrentProject(projectData);
            } catch (loadError) {
                console.error("Failed to switch project:", loadError);
            } finally {
                setIsSwitching(false);
            }
        },
        [currentProject, saveCurrentProject],
    );

    const handleNewProject = useCallback(async () => {
        await saveCurrentProject();
        setIsSwitching(true);

        try {
            const newProjectId = await createProject();
            const updatedProjects = await fetchProjects();
            setProjects(updatedProjects);
            setCurrentProject({
                id: newProjectId,
                chat: [],
                canvas: {} as ExcalidrawInitialDataState,
            });
        } catch (createError) {
            console.error("Failed to create project:", createError);
        } finally {
            setIsSwitching(false);
        }
    }, [saveCurrentProject]);

    const handleProjectDelete = useCallback(
        async (projectId: string) => {
            try {
                const response = await fetch(`/api/projects/${projectId}`, {
                    method: "DELETE",
                });
                if (!response.ok) {
                    console.error("Failed to delete project");

                    return;
                }

                const updatedProjects = projects.filter(
                    (project) => project.id !== projectId,
                );
                setProjects(updatedProjects);

                if (currentProject?.id === projectId) {
                    if (updatedProjects.length > 0) {
                        const nextProject = await fetchProject(
                            updatedProjects[0].id,
                        );
                        setCurrentProject(nextProject);
                    } else {
                        setCurrentProject(null);
                    }
                }
            } catch (deleteError) {
                console.error("Failed to delete project:", deleteError);
            }
        },
        [projects, currentProject],
    );

    const handleLogout = useCallback(async () => {
        await saveCurrentProject();
        leaveProject();
        await fetch("/api/auth/logout", { method: "POST" });
        onLogout();
    }, [saveCurrentProject, leaveProject, onLogout]);

    const handleInvitationAccept = useCallback(
        async (invitationId: string) => {
            setInvitations((previous) =>
                previous.filter(
                    (invitation) => invitation.id !== invitationId,
                ),
            );

            const updatedProjects = await fetchProjects();
            setProjects(updatedProjects);
        },
        [],
    );

    const handleInvitationDecline = useCallback((invitationId: string) => {
        setInvitations((previous) =>
            previous.filter((invitation) => invitation.id !== invitationId),
        );
    }, []);

    return (
        <div className="flex h-dvh">
            <ProjectSidebar
                username={user.username}
                projects={projects}
                activeProjectId={currentProject?.id ?? null}
                invitations={invitations}
                onProjectSelect={handleProjectSelect}
                onProjectDelete={handleProjectDelete}
                onNewProject={handleNewProject}
                onLogout={handleLogout}
                onInvite={setInviteProjectId}
                onInvitationAccept={handleInvitationAccept}
                onInvitationDecline={handleInvitationDecline}
            />

            <div className="flex-1">
                {isSwitching ? (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-foreground/50">
                            Loading project...
                        </p>
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
