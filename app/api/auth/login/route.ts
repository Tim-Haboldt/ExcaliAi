import { NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import { getSession } from "@/lib/session";

const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
});

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { username } = parsed.data;

    const account = await database.account.findUnique({
        where: { username },
    });
    if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const session = await getSession();
    session.accountId = account.id;
    session.username = account.username;
    await session.save();

    return NextResponse.json({ id: account.id, username: account.username });
}
