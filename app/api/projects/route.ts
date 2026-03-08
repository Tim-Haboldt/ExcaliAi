import { NextResponse } from "next/server";
import { database } from "@/lib/database";
import { getAuthenticatedSession } from "@/lib/session";

export async function GET() {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await database.projectMember.findMany({
        where: {
            accountId: session.accountId,
            deleted: false,
        },
        include: {
            project: {
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
        orderBy: {
            project: { updatedAt: "desc" },
        },
    });

    const projects = memberships.map((membership) => ({
        ...membership.project,
        role: membership.role,
        isShared: false,
    }));

    const projectIds = projects.map((project) => project.id);
    const memberCounts = await database.projectMember.groupBy({
        by: ["projectId"],
        where: {
            projectId: { in: projectIds },
            deleted: false,
        },
        _count: { id: true },
    });

    const countByProject = new Map(
        memberCounts.map((count) => [count.projectId, count._count.id]),
    );

    const enrichedProjects = projects.map((project) => ({
        ...project,
        isShared: (countByProject.get(project.id) ?? 1) > 1,
    }));

    return NextResponse.json({ projects: enrichedProjects });
}

export async function POST() {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await database.project.create({
        data: {
            members: {
                create: {
                    accountId: session.accountId,
                    role: "owner",
                },
            },
        },
    });

    return NextResponse.json({ id: project.id }, { status: 201 });
}
