import { z } from "zod";

// ---------------------------------------------------------------------------
// Simplified schema for AI tool calling.
// Avoids discriminated unions, tuples, and other constructs that AI providers
// struggle with. The conversion function below maps this back to the full
// Excalidraw scene format.
// ---------------------------------------------------------------------------

const aiElementSchema = z.object({
    type: z.enum([
        "rectangle",
        "diamond",
        "ellipse",
        "text",
        "line",
        "arrow",
        "freedraw",
        "frame",
    ]),
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    angle: z.number().optional(),
    strokeColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    fillStyle: z
        .enum(["hachure", "cross-hatch", "solid", "zigzag"])
        .optional(),
    strokeWidth: z.number().optional(),
    strokeStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
    roughness: z.number().optional(),
    opacity: z.number().optional(),

    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.number().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
    lineHeight: z.number().optional(),

    points: z.array(z.array(z.number())).optional(),
    startArrowhead: z.string().nullable().optional(),
    endArrowhead: z.string().nullable().optional(),

    name: z.string().nullable().optional(),

    groupIds: z.array(z.string()).optional(),
});

export type AiElement = z.infer<typeof aiElementSchema>;

export const aiCanvasUpdateSchema = z.object({
    elements: z.array(aiElementSchema),
    viewBackgroundColor: z.string().optional(),
});

export type AiCanvasUpdate = z.infer<typeof aiCanvasUpdateSchema>;

// ---------------------------------------------------------------------------
// AI schema → Excalidraw scene conversion
// ---------------------------------------------------------------------------

function randomSeed(): number {
    return Math.floor(Math.random() * 2_147_483_647);
}

function getRoundness(
    type: string,
): { type: number; value?: number } | null {
    if (type === "diamond" || type === "line" || type === "arrow")
        return { type: 2 };
    if (["rectangle", "ellipse", "image", "frame"].includes(type))
        return { type: 3 };
    return null;
}

export function convertAiToExcalidrawScene(update: AiCanvasUpdate) {
    const elements = update.elements.map((el) => {
        const base = {
            id: el.id,
            type: el.type as string,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            angle: el.angle ?? 0,
            strokeColor: el.strokeColor ?? "#1e1e1e",
            backgroundColor: el.backgroundColor ?? "transparent",
            fillStyle: el.fillStyle ?? "solid",
            strokeWidth: el.strokeWidth ?? 2,
            strokeStyle: el.strokeStyle ?? "solid",
            roundness: getRoundness(el.type),
            roughness: el.roughness ?? 1,
            opacity: el.opacity ?? 100,
            seed: randomSeed(),
            version: 1,
            versionNonce: randomSeed(),
            isDeleted: false,
            groupIds: el.groupIds ?? [],
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
        };

        switch (el.type) {
            case "text":
                return {
                    ...base,
                    text: el.text ?? "",
                    fontSize: el.fontSize ?? 20,
                    fontFamily: el.fontFamily ?? 1,
                    textAlign: el.textAlign ?? "left",
                    verticalAlign: el.verticalAlign ?? "top",
                    containerId: null,
                    originalText: el.text ?? "",
                    autoResize: true,
                    lineHeight: el.lineHeight ?? 1.25,
                };

            case "line":
                return {
                    ...base,
                    points: (
                        el.points ?? [
                            [0, 0],
                            [el.width, el.height],
                        ]
                    ).map((p) => [p[0] ?? 0, p[1] ?? 0]),
                    lastCommittedPoint: null,
                    startBinding: null,
                    endBinding: null,
                };

            case "arrow":
                return {
                    ...base,
                    points: (
                        el.points ?? [
                            [0, 0],
                            [el.width, el.height],
                        ]
                    ).map((p) => [p[0] ?? 0, p[1] ?? 0]),
                    lastCommittedPoint: null,
                    startBinding: null,
                    endBinding: null,
                    startArrowhead: el.startArrowhead ?? null,
                    endArrowhead: el.endArrowhead ?? "arrow",
                };

            case "freedraw":
                return {
                    ...base,
                    points: (el.points ?? []).map((p) => [
                        p[0] ?? 0,
                        p[1] ?? 0,
                    ]),
                    pressures: [],
                    simulatePressure: true,
                    lastCommittedPoint: null,
                };

            case "frame":
                return {
                    ...base,
                    name: el.name ?? null,
                };

            default:
                return base;
        }
    });

    return {
        type: "excalidraw" as const,
        version: 2,
        elements,
        appState: {
            viewBackgroundColor: update.viewBackgroundColor ?? "#ffffff",
        },
    };
}

// ---------------------------------------------------------------------------
// Excalidraw scene → simplified context for AI (strips internal noise)
// ---------------------------------------------------------------------------

export function simplifySceneForContext(sceneJson: string): string {
    try {
        const scene = JSON.parse(sceneJson);
        const elements = (scene.elements ?? [])
            .filter((el: Record<string, unknown>) => !el.isDeleted)
            .map((el: Record<string, unknown>) => {
                const simplified: Record<string, unknown> = {
                    id: el.id,
                    type: el.type,
                    x: Math.round(el.x as number),
                    y: Math.round(el.y as number),
                    width: Math.round(el.width as number),
                    height: Math.round(el.height as number),
                };

                if (el.strokeColor && el.strokeColor !== "#1e1e1e")
                    simplified.strokeColor = el.strokeColor;
                if (
                    el.backgroundColor &&
                    el.backgroundColor !== "transparent"
                )
                    simplified.backgroundColor = el.backgroundColor;
                if (el.fillStyle && el.fillStyle !== "solid")
                    simplified.fillStyle = el.fillStyle;
                if (el.opacity !== undefined && el.opacity !== 100)
                    simplified.opacity = el.opacity;
                if (el.angle && el.angle !== 0) simplified.angle = el.angle;
                if (el.strokeWidth && el.strokeWidth !== 2)
                    simplified.strokeWidth = el.strokeWidth;

                if (el.type === "text") {
                    simplified.text = el.text;
                    simplified.fontSize = el.fontSize;
                }

                if (el.type === "line" || el.type === "arrow") {
                    simplified.points = el.points;
                    if (el.type === "arrow") {
                        if (el.startArrowhead)
                            simplified.startArrowhead = el.startArrowhead;
                        if (el.endArrowhead)
                            simplified.endArrowhead = el.endArrowhead;
                    }
                }

                if (el.type === "frame" && el.name)
                    simplified.name = el.name;

                if (
                    Array.isArray(el.groupIds) &&
                    (el.groupIds as string[]).length > 0
                )
                    simplified.groupIds = el.groupIds;

                return simplified;
            });

        return JSON.stringify({
            elements,
            background: scene.appState?.viewBackgroundColor,
        });
    } catch {
        return sceneJson;
    }
}
