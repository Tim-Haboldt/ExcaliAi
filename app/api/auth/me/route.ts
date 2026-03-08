import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/session";

export async function GET() {
    const session = await getAuthenticatedSession();
    if (!session) {
        return NextResponse.json({ user: null });
    }

    return NextResponse.json({
        user: {
            id: session.accountId,
            username: session.username,
        },
    });
}
