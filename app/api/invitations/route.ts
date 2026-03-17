import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

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

    const body = await request.json();
    const { projectId, username } = body;

    if (!projectId || !username) {
        return NextResponse.json(
            { error: "projectId and username are required" },
            { status: 400 },
        );
    }

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
        return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
        );
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
