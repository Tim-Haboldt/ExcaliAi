import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

export async function GET() {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await database.project.findMany({
        where: { accountId: session.accountId },
        select: {
            id: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
}

export async function POST() {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await database.project.create({
        data: { accountId: session.accountId },
    });

    return NextResponse.json({ id: project.id }, { status: 201 });
}
