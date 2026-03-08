import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { getModel } from "@/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import {
    aiCanvasUpdateSchema,
    simplifySceneForContext,
} from "@/lib/ai/excalidraw-ai-schema";

export async function POST(req: Request) {
    const { messages: uiMessages, scene } = await req.json();

    const sceneContext = scene
        ? `\n\nCurrent canvas state:\n${simplifySceneForContext(scene)}`
        : "\n\nThe canvas is currently empty.";

    const modelMessages = await convertToModelMessages(uiMessages);

    const result = streamText({
        model: getModel(),
        system: SYSTEM_PROMPT + sceneContext,
        messages: modelMessages,
        tools: {
            updateCanvas: tool({
                description:
                    "Update the Excalidraw canvas with the given elements. " +
                    "This replaces ALL canvas content. " +
                    "Include existing elements (with their IDs) to keep them.",
                inputSchema: aiCanvasUpdateSchema,
                execute: async (params) => ({
                    success: true,
                    message: `Canvas updated with ${params.elements.length} element(s).`,
                }),
            }),
        },
        stopWhen: stepCountIs(3),
    });

    return result.toUIMessageStreamResponse();
}
