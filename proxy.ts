import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";

const COOKIE_NAME = "excali-ai-session";

const PROTECTED_API_PREFIXES = [
    "/api/chat",
    "/api/projects",
    "/api/invitations",
];

function isProtectedRoute(pathname: string): boolean {
    return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
    if (!isProtectedRoute(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 },
        );
    }

    const sealedSession = request.cookies.get(COOKIE_NAME)?.value;
    if (!sealedSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const session = await unsealData<{
            accountId?: string;
            username?: string;
        }>(sealedSession, { password: sessionSecret });

        if (!session.accountId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        return NextResponse.next();
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export const config = {
    matcher: [
        "/api/chat/:path*",
        "/api/projects/:path*",
        "/api/invitations/:path*",
    ],
};
