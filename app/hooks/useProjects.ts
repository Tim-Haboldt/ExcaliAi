"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "@ai-sdk/react";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { ProjectSummary } from "../components/sidebar/ProjectSidebar";

interface ProjectData {
    id: string;
    chat: UIMessage[];
    canvas: ExcalidrawInitialDataState;
}

async function fetchProjects(): Promise<ProjectSummary[]> {
    const response = await fetch("/api/projects");
    const data = await response.json();

    return data.projects ?? [];
}

async function fetchProject(projectId: string): Promise<ProjectData> {
    const response = await fetch(`/api/projects/${projectId}`);
    const data = await response.json();
    const project = data.project;

    const chat: UIMessage[] = Array.isArray(project.chat) ? project.chat : [];
    const canvas =
        typeof project.canvas === "object" && project.canvas !== null
            ? (project.canvas as ExcalidrawInitialDataState)
            : ({} as ExcalidrawInitialDataState);

    return { id: project.id, chat, canvas };
}

interface SaveProjectPayload {
    projectId: string;
    chat: UIMessage[];
    canvas: string | null;
}

async function saveProjectRequest({
    projectId,
    chat,
    canvas,
}: SaveProjectPayload): Promise<void> {
    const canvasData = canvas ? JSON.parse(canvas) : {};

    await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat, canvas: canvasData }),
    });
}

async function createProjectRequest(): Promise<string> {
    const response = await fetch("/api/projects", { method: "POST" });
    const data = await response.json();

    return data.id;
}

async function deleteProjectRequest(projectId: string): Promise<void> {
    const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Failed to delete project");
    }
}

export function useProjects(enabled = true) {
    return useQuery<ProjectSummary[]>({
        queryKey: ["projects"],
        queryFn: fetchProjects,
        enabled,
    });
}

export function useProject(projectId: string | null) {
    return useQuery<ProjectData>({
        queryKey: ["project", projectId],
        queryFn: () => fetchProject(projectId!),
        enabled: !!projectId,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProjectRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
    });
}

export function useSaveProject() {
    return useMutation({
        mutationFn: saveProjectRequest,
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProjectRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
    });
}
