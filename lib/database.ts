import { env } from "./environment";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
    const adapter = new PrismaPg({
        connectionString: env.DATABASE_URL,
    });

    return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const database = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = database;
}
