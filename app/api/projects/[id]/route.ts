import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

interface RouteContext {
    params: Promise<{ id: string }>;
}

async function findAccessibleProject(projectId: string, accountId: string) {
    const membership = await database.projectMember.findUnique({
        where: {
            projectId_accountId: { projectId, accountId },
        },
        include: {
            project: true,
        },
    });

    if (!membership || membership.deleted) {
        return { project: null, membership: null, error: "not_found" };
    }

    return { project: membership.project, membership, error: null };
}

export async function GET(_request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { project, error } = await findAccessibleProject(
        id,
        session.accountId,
    );

    if (error) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404 },
        );
    }

    return NextResponse.json({ project });
}

export async function PUT(request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const { error } = await findAccessibleProject(id, session.accountId);

    if (error) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404 },
        );
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
    const { membership, error } = await findAccessibleProject(
        id,
        session.accountId,
    );

    if (error || !membership) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404 },
        );
    }

    await database.projectMember.update({
        where: { id: membership.id },
        data: { deleted: true },
    });

    const remainingMembers = await database.projectMember.count({
        where: {
            projectId: id,
            deleted: false,
        },
    });

    if (remainingMembers === 0) {
        await database.project.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
}
