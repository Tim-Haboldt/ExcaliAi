import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { env } from "./environment";

interface SessionData {
    accountId: string;
    username: string;
}

const SESSION_OPTIONS = {
    password: env.SESSION_SECRET,
    cookieName: "excali-ai-session",
    cookieOptions: {
        secure: env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax" as const,
    },
};

export async function getSession() {
    const cookieStore = await cookies();

    return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function getAuthenticatedSession() {
    const session = await getSession();
    if (!session.accountId) {
        return null;
    }

    return session;
}
