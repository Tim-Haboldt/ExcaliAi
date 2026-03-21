import { NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

const createChatSchema = z.object({
    title: z.string().min(1).max(200).optional(),
});

interface RouteContext {
    params: Promise<{ id: string }>;
}

async function verifyProjectAccess(projectId: string, accountId: string) {
    const membership = await database.projectMember.findUnique({
        where: {
            projectId_accountId: { projectId, accountId },
        },
    });

    return membership && !membership.deleted;
}

export async function GET(_request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const hasAccess = await verifyProjectAccess(projectId, session.accountId);

    if (!hasAccess) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404 },
        );
    }

    const chats = await database.chat.findMany({
        where: { projectId },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ chats });
}

export async function POST(request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await context.params;
    const hasAccess = await verifyProjectAccess(projectId, session.accountId);

    if (!hasAccess) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404 },
        );
    }

    let body: unknown = {};
    try {
        body = await request.json();
    } catch {
        // Empty body is fine — title is optional
    }

    const parsed = createChatSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 },
        );
    }

    const chat = await database.chat.create({
        data: {
            projectId,
            createdById: session.accountId,
            ...(parsed.data.title ? { title: parsed.data.title } : {}),
        },
        select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return NextResponse.json({ chat }, { status: 201 });
}
