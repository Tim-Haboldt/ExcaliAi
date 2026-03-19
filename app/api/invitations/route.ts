import { NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

const sendInvitationSchema = z.object({
    projectId: z.string().min(1, "projectId is required"),
    username: z
        .string()
        .min(1, "username is required")
        .max(32, "username must be at most 32 characters"),
});

export async function GET() {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitations = await database.invitation.findMany({
        where: {
            inviteeId: session.accountId,
            status: "pending",
        },
        include: {
            project: {
                select: { id: true, createdAt: true },
            },
            inviter: {
                select: { username: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = sendInvitationSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 },
        );
    }

    const { projectId, username } = parsed.data;

    if (username === session.username) {
        return NextResponse.json(
            { error: "You cannot invite yourself" },
            { status: 400 },
        );
    }

    const membership = await database.projectMember.findUnique({
        where: {
            projectId_accountId: {
                projectId,
                accountId: session.accountId,
            },
        },
    });

    if (!membership || membership.deleted) {
        return NextResponse.json(
            { error: "Project not found" },
            { status: 404 },
        );
    }

    const invitee = await database.account.findUnique({
        where: { username },
    });

    if (!invitee) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingMembership = await database.projectMember.findUnique({
        where: {
            projectId_accountId: {
                projectId,
                accountId: invitee.id,
            },
        },
    });

    if (existingMembership && !existingMembership.deleted) {
        return NextResponse.json(
            { error: "User is already a member of this project" },
            { status: 409 },
        );
    }

    const existingInvitation = await database.invitation.findUnique({
        where: {
            projectId_inviteeId: {
                projectId,
                inviteeId: invitee.id,
            },
        },
    });

    if (existingInvitation && existingInvitation.status === "pending") {
        return NextResponse.json(
            { error: "Invitation already pending" },
            { status: 409 },
        );
    }

    if (existingInvitation) {
        const updated = await database.invitation.update({
            where: { id: existingInvitation.id },
            data: { status: "pending", inviterId: session.accountId },
        });

        return NextResponse.json({ invitation: updated }, { status: 201 });
    }

    const invitation = await database.invitation.create({
        data: {
            projectId,
            inviterId: session.accountId,
            inviteeId: invitee.id,
        },
    });

    return NextResponse.json({ invitation }, { status: 201 });
}
