import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    if (action !== "accept" && action !== "decline") {
        return NextResponse.json(
            { error: "action must be 'accept' or 'decline'" },
            { status: 400 },
        );
    }

    const invitation = await database.invitation.findUnique({
        where: { id },
    });

    if (!invitation) {
        return NextResponse.json(
            { error: "Invitation not found" },
            { status: 404 },
        );
    }

    if (invitation.inviteeId !== session.accountId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (invitation.status !== "pending") {
        return NextResponse.json(
            { error: "Invitation is no longer pending" },
            { status: 409 },
        );
    }

    if (action === "decline") {
        await database.invitation.update({
            where: { id },
            data: { status: "declined" },
        });

        return NextResponse.json({ success: true });
    }

    await database.$transaction(async (transaction) => {
        await transaction.invitation.update({
            where: { id },
            data: { status: "accepted" },
        });

        const existingMembership =
            await transaction.projectMember.findUnique({
                where: {
                    projectId_accountId: {
                        projectId: invitation.projectId,
                        accountId: session.accountId,
                    },
                },
            });

        if (existingMembership) {
            await transaction.projectMember.update({
                where: { id: existingMembership.id },
                data: { deleted: false, role: "member" },
            });
        } else {
            await transaction.projectMember.create({
                data: {
                    projectId: invitation.projectId,
                    accountId: session.accountId,
                    role: "member",
                },
            });
        }
    });

    return NextResponse.json({ success: true });
}
