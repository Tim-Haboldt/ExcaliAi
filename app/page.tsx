"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import { AuthForm } from "./components/auth/AuthForm";
import { Workspace, type WorkspaceHandle } from "./components/workspace/Workspace";
import { ProjectSidebar } from "./components/sidebar/ProjectSidebar";

interface User {
    id: string;
    username: string;
}

interface ProjectSummary {
    id: string;
    createdAt: string;
    updatedAt: string;
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

export default function Home() {
    const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);

    const workspaceRef = useRef<WorkspaceHandle>(null);

    useEffect(() => {
        async function checkSession() {
            try {
                const response = await fetch("/api/auth/me");
                const data = await response.json();
                if (data.user) {
                    setAuthState({ status: "authenticated", user: data.user });
                } else {
                    setAuthState({ status: "unauthenticated" });
                }
            } catch {
                setAuthState({ status: "unauthenticated" });
            }
        }

        checkSession();
    }, []);

    useEffect(() => {
        if (authState.status !== "authenticated") {
            return;
        }

        async function loadProjects() {
            const projectList = await fetchProjects();
            setProjects(projectList);

            if (projectList.length > 0) {
                const projectData = await fetchProject(projectList[0].id);
                setCurrentProject(projectData);
            }
        }

        loadProjects();
    }, [authState]);

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
                        const nextProject = await fetchProject(updatedProjects[0].id);
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
        await fetch("/api/auth/logout", { method: "POST" });
        setAuthState({ status: "unauthenticated" });
        setProjects([]);
        setCurrentProject(null);
    }, [saveCurrentProject]);

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
                <div className="flex h-dvh">
                    <ProjectSidebar
                        username={authState.user.username}
                        projects={projects}
                        activeProjectId={currentProject?.id ?? null}
                        onProjectSelect={handleProjectSelect}
                        onProjectDelete={handleProjectDelete}
                        onNewProject={handleNewProject}
                        onLogout={handleLogout}
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
                                initialChat={currentProject.chat}
                                initialCanvas={currentProject.canvas}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <p className="text-foreground/50">No project selected</p>
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
                </div>
            );
    }
}
