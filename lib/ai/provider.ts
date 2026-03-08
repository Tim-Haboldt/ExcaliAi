import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../environment";

export function getModel() {
    switch (env.AI_PROVIDER) {
        case "openai":
            return createOpenAI({ apiKey: env.OPENAI_API_KEY })(env.AI_MODEL);
        case "anthropic":
            return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(
                env.AI_MODEL,
            );
        case "google":
            return createGoogleGenerativeAI({
                apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
            })(env.AI_MODEL);
    }
}
