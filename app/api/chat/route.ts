import {
    streamText,
    tool,
    convertToModelMessages,
    stepCountIs,
    type ModelMessage,
} from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import {
    aiCanvasUpdateSchema,
    aiUpdateElementsSchema,
    aiDeleteElementsSchema,
    simplifySceneForContext,
} from "@/lib/ai/excalidraw-ai-schema";

const EMPTY_TOOL_INPUT: Record<string, unknown> = {};

function ensureToolInputsAreObjects(
    messages: ModelMessage[],
): ModelMessage[] {
    return messages.map((message) => {
        if (message.role !== "assistant") {
            return message;
        }

        if (typeof message.content === "string") {
            return message;
        }

        const sanitizedContent = message.content.map((part) => {
            if (part.type !== "tool-call") {
                return part;
            }

            if (
                part.input !== null &&
                typeof part.input === "object" &&
                !Array.isArray(part.input)
            ) {
                return part;
            }

            return { ...part, input: EMPTY_TOOL_INPUT };
        });

        return { ...message, content: sanitizedContent };
    });
}

function buildTools(scene: string | null, png: string | null) {
    return {
        getCanvas: tool({
            description:
                "Fetch the current canvas state as structured JSON. " +
                "Call this to see what elements are on the canvas before making changes.",
            inputSchema: z.object({}),
            execute: async () => {
                if (!scene) {
                    return { canvas: null, message: "Canvas is empty." };
                }

                return { canvas: simplifySceneForContext(scene) };
            },
        }),

        getCanvasPng: tool({
            description:
                "Get a PNG screenshot of the current canvas to visually inspect the result. " +
                "Call this AFTER making changes, in a separate step.",
            inputSchema: z.object({}),
            execute: async () => {
                if (!png) {
                    return {
                        success: false,
                        message: "No PNG available — canvas may be empty.",
                    };
                }

                return {
                    success: true,
                    message: "PNG screenshot captured successfully.",
                    imageSizeBytes: Math.round((png.length * 3) / 4),
                };
            },
        }),

        updateCanvas: tool({
            description:
                "Replace the ENTIRE canvas with the given elements. " +
                "Use this for creating new diagrams from scratch or completely redesigning the layout. " +
                "Any element not included will be removed.",
            inputSchema: aiCanvasUpdateSchema,
            execute: async (params) => ({
                success: true,
                message: `Canvas replaced with ${params.elements.length} element(s).`,
            }),
        }),

        updateElements: tool({
            description:
                "Add or update specific elements on the canvas by ID. " +
                "Provide complete element definitions. " +
                "Existing elements with matching IDs are replaced; new IDs are added. " +
                "Elements not mentioned are left untouched.",
            inputSchema: aiUpdateElementsSchema,
            execute: async (params) => ({
                success: true,
                message: `${params.elements.length} element(s) updated.`,
            }),
        }),

        deleteElements: tool({
            description:
                "Delete specific elements from the canvas by their IDs. " +
                "Other elements are left untouched.",
            inputSchema: aiDeleteElementsSchema,
            execute: async (params) => ({
                success: true,
                message: `${params.elementIds.length} element(s) deleted.`,
            }),
        }),
    };
}

export async function POST(req: Request) {
    try {
        const { messages: uiMessages, scene, png } = await req.json();
        const tools = buildTools(scene ?? null, png ?? null);

        const rawModelMessages = await convertToModelMessages(uiMessages, {
            tools,
        });
        const modelMessages = ensureToolInputsAreObjects(rawModelMessages);

        const result = streamText({
            model: getModel(),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            tools,
            stopWhen: stepCountIs(5),
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("Chat API error:", error);

        return new Response(
            JSON.stringify({
                error:
                    error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
}
