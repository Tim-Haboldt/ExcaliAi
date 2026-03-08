import { NextResponse } from "next/server";
import { z } from "zod";
import { database } from "@/lib/database";
import { getSession } from "@/lib/session";

const registerSchema = z.object({
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(32, "Username must be at most 32 characters")
        .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
});

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { username } = parsed.data;

    const existingAccount = await database.account.findUnique({
        where: { username },
    });
    if (existingAccount) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const account = await database.account.create({
        data: { username },
    });

    const session = await getSession();
    session.accountId = account.id;
    session.username = account.username;
    await session.save();

    return NextResponse.json({ id: account.id, username: account.username });
}
