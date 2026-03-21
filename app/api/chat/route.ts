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
    aiCreateLabeledShapesSchema,
    aiRenderMermaidSchema,
    simplifySceneForContext,
} from "@/lib/ai/excalidraw-ai-schema";
import { getAuthenticatedSession } from "@/lib/session";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        value !== null &&
        value !== undefined &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function ensureToolInputsAreObjects(messages: ModelMessage[]): ModelMessage[] {
    return messages.map((message) => {
        if (message.role !== "assistant") {
            return message;
        }

        if (typeof message.content === "string") {
            return message;
        }

        let changed = false;
        const sanitizedContent = message.content.map((part) => {
            if (part.type !== "tool-call") {
                return part;
            }

            if (isPlainObject(part.input)) {
                return part;
            }

            console.warn(
                "[chat] Replaced invalid tool-call input (%s) for %s",
                typeof part.input,
                "toolName" in part ? part.toolName : "unknown",
            );

            changed = true;

            return { ...part, input: {} };
        });

        if (!changed) {
            return message;
        }

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
                "Get a PNG screenshot of the current canvas so you can visually verify your work. " +
                "Call this AFTER making changes, in a separate step, to see the result and check for issues.",
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
                    base64: png,
                };
            },
            toModelOutput({ output }) {
                if (!output.success || !output.base64) {
                    return {
                        type: "text" as const,
                        value:
                            output.message ??
                            "No PNG available — canvas may be empty.",
                    };
                }

                return {
                    type: "content" as const,
                    value: [
                        {
                            type: "text" as const,
                            text: "Here is the current canvas screenshot. Inspect it for alignment, readability, and quality issues.",
                        },
                        {
                            type: "file-data" as const,
                            data: output.base64,
                            mediaType: "image/png",
                        },
                    ],
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

        createLabeledShapes: tool({
            description:
                "Create shapes with centered text labels. Each entry produces a shape " +
                "(rectangle, diamond, or ellipse) with a properly centered and grouped " +
                "text label inside it. Use this instead of manually creating separate " +
                "shape + text element pairs.",
            inputSchema: aiCreateLabeledShapesSchema,
            execute: async (params) => ({
                success: true,
                message: `${params.shapes.length} labeled shape(s) created.`,
            }),
        }),

        renderMermaid: tool({
            description:
                "Render a Mermaid diagram on the canvas. Accepts valid Mermaid syntax " +
                "(flowcharts work best) and converts it to Excalidraw elements. " +
                "Use this when the user asks for flowcharts, process diagrams, or " +
                "any diagram that can be expressed in Mermaid syntax. " +
                "This replaces the entire canvas with the rendered diagram.",
            inputSchema: aiRenderMermaidSchema,
            execute: async (params) => ({
                success: true,
                message: "Mermaid diagram rendered on canvas.",
                mermaidSyntax: params.mermaidSyntax,
            }),
        }),
    };
}

export async function POST(req: Request) {
    const session = await getAuthenticatedSession();
    if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

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
            stopWhen: stepCountIs(10),
            prepareStep: ({ messages: stepMessages }) => ({
                messages: ensureToolInputsAreObjects(stepMessages),
            }),
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("Chat API error:", error);

        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
}
