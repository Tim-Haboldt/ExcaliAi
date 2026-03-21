import { NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

const MAX_CHAT_DATA_SIZE = 5 * 1024 * 1024; // 5 MB

const updateChatSchema = z
    .object({
        messages: z.unknown(),
    })
    .refine((data) => JSON.stringify(data).length <= MAX_CHAT_DATA_SIZE, {
        message: "Chat data exceeds maximum allowed size",
    });

interface RouteContext {
    params: Promise<{ id: string; chatId: string }>;
}

async function findAccessibleChat(
    projectId: string,
    chatId: string,
    accountId: string,
) {
    const membership = await database.projectMember.findUnique({
        where: {
            projectId_accountId: { projectId, accountId },
        },
    });

    if (!membership || membership.deleted) {
        return null;
    }

    const chat = await database.chat.findUnique({
        where: { id: chatId, projectId },
    });

    return chat;
}

export async function GET(_request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, chatId } = await context.params;
    const chat = await findAccessibleChat(projectId, chatId, session.accountId);

    if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({ chat });
}

export async function PUT(request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, chatId } = await context.params;
    const chat = await findAccessibleChat(projectId, chatId, session.accountId);

    if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateChatSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 },
        );
    }

    const updatedChat = await database.chat.update({
        where: { id: chatId },
        data: { messages: parsed.data.messages as object },
    });

    return NextResponse.json({ chat: updatedChat });
}

export async function DELETE(_request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, chatId } = await context.params;
    const chat = await findAccessibleChat(projectId, chatId, session.accountId);

    if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await database.chat.delete({ where: { id: chatId } });

    return NextResponse.json({ success: true });
}
