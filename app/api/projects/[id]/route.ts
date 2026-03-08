import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

interface RouteContext {
    params: Promise<{ id: string }>;
}

async function findOwnedProject(projectId: string, accountId: string) {
    const project = await database.project.findUnique({
        where: { id: projectId },
    });
    if (!project) {
        return { project: null, error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
    }

    if (project.accountId !== accountId) {
        return { project: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return { project, error: null };
}

export async function GET(_request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { project, error } = await findOwnedProject(id, session.accountId);
    if (error) {
        return error;
    }

    return NextResponse.json({ project });
}

export async function PUT(request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { error } = await findOwnedProject(id, session.accountId);
    if (error) {
        return error;
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.chat !== undefined) {
        updateData.chat = body.chat;
    }
    if (body.canvas !== undefined) {
        updateData.canvas = body.canvas;
    }

    const updatedProject = await database.project.update({
        where: { id },
        data: updateData,
    });

    return NextResponse.json({ project: updatedProject });
}

export async function DELETE(_request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { error } = await findOwnedProject(id, session.accountId);
    if (error) {
        return error;
    }

    await database.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
