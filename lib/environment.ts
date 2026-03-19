import { z } from "zod";

const aiProviderSchema = z.enum(["openai", "anthropic", "google"]);

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production"]),
        DATABASE_URL: z.string(),
        SESSION_SECRET: z.string().min(32),
        AI_PROVIDER: aiProviderSchema,
        AI_MODEL: z.string(),
        OPENAI_API_KEY: z.string().optional(),
        ANTHROPIC_API_KEY: z.string().optional(),
        GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
        SOCKET_PORT: z.string(),
        NEXT_PUBLIC_SOCKET_URL: z.string(),
        NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    })
    .superRefine((val, ctx) => {
        const keyMap: Record<z.infer<typeof aiProviderSchema>, string> = {
            openai: "OPENAI_API_KEY",
            anthropic: "ANTHROPIC_API_KEY",
            google: "GOOGLE_GENERATIVE_AI_API_KEY",
        };

        const requiredKey = keyMap[val.AI_PROVIDER];
        if (!val[requiredKey as keyof typeof val]) {
            ctx.addIssue({
                code: "custom",
                path: [requiredKey],
                message: `${requiredKey} is required when AI_PROVIDER is "${val.AI_PROVIDER}"`,
            });
        }
    });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error(
            "Invalid environment variables:\n",
            result.error.issues
                .map((i) => `  ${i.path.join(".")}: ${i.message}`)
                .join("\n"),
        );
        throw new Error(
            "Invalid environment variables – see console output above.",
        );
    }
    return result.data;
}

export const env = parseEnv();
