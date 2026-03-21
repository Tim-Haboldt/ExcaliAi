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
    fillStyle: z.enum(["hachure", "cross-hatch", "solid", "zigzag"]).optional(),
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
    startElementId: z.string().nullable().optional(),
    endElementId: z.string().nullable().optional(),

    name: z.string().nullable().optional(),

    groupIds: z.array(z.string()).optional(),
});

export type AiElement = z.infer<typeof aiElementSchema>;

export const aiCanvasUpdateSchema = z.object({
    elements: z.array(aiElementSchema),
    viewBackgroundColor: z.string().optional(),
});

export type AiCanvasUpdate = z.infer<typeof aiCanvasUpdateSchema>;

export const aiUpdateElementsSchema = z.object({
    elements: z.array(aiElementSchema),
});

export type AiUpdateElements = z.infer<typeof aiUpdateElementsSchema>;

export const aiDeleteElementsSchema = z.object({
    elementIds: z.array(z.string()),
});

export type AiDeleteElements = z.infer<typeof aiDeleteElementsSchema>;

// ---------------------------------------------------------------------------
// Labeled shapes — a compound tool that creates shape + centered text pairs
// ---------------------------------------------------------------------------

const aiLabeledShapeSchema = z.object({
    shapeType: z.enum(["rectangle", "diamond", "ellipse"]),
    label: z.string(),
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    strokeColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    fillStyle: z.enum(["hachure", "cross-hatch", "solid", "zigzag"]).optional(),
    strokeWidth: z.number().optional(),
    strokeStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
    roughness: z.number().optional(),
    opacity: z.number().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.number().optional(),
});

export type AiLabeledShape = z.infer<typeof aiLabeledShapeSchema>;

export const aiCreateLabeledShapesSchema = z.object({
    shapes: z.array(aiLabeledShapeSchema),
});

export type AiCreateLabeledShapes = z.infer<typeof aiCreateLabeledShapesSchema>;

// ---------------------------------------------------------------------------
// Mermaid rendering — accepts Mermaid syntax and converts it client-side
// ---------------------------------------------------------------------------

export const aiRenderMermaidSchema = z.object({
    mermaidSyntax: z
        .string()
        .describe("A valid Mermaid diagram definition string"),
});

export type AiRenderMermaid = z.infer<typeof aiRenderMermaidSchema>;

export function expandLabeledShapesToElements(
    shapes: AiLabeledShape[],
): AiElement[] {
    const elements: AiElement[] = [];

    for (const shape of shapes) {
        const groupId = `group_${shape.id}`;
        const fontSize = shape.fontSize ?? 20;
        const textHeight = Math.ceil(fontSize * 1.25);

        elements.push({
            type: shape.shapeType,
            id: shape.id,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            strokeColor: shape.strokeColor,
            backgroundColor: shape.backgroundColor,
            fillStyle: shape.fillStyle,
            strokeWidth: shape.strokeWidth,
            strokeStyle: shape.strokeStyle,
            roughness: shape.roughness,
            opacity: shape.opacity,
            groupIds: [groupId],
        });

        elements.push({
            type: "text",
            id: `label_${shape.id}`,
            x: shape.x,
            y: shape.y + (shape.height - textHeight) / 2,
            width: shape.width,
            height: textHeight,
            text: shape.label,
            fontSize,
            fontFamily: shape.fontFamily,
            textAlign: "center",
            verticalAlign: "middle",
            strokeColor: shape.strokeColor,
            opacity: shape.opacity,
            groupIds: [groupId],
        });
    }

    return elements;
}

// ---------------------------------------------------------------------------
// AI schema → Excalidraw scene conversion
// ---------------------------------------------------------------------------

interface ExcalidrawBaseElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    strokeColor: string;
    backgroundColor: string;
    fillStyle: string;
    strokeWidth: number;
    strokeStyle: string;
    roundness: { type: number; value?: number } | null;
    roughness: number;
    opacity: number;
    seed: number;
    version: number;
    versionNonce: number;
    index: string | null;
    frameId: string | null;
    isDeleted: boolean;
    groupIds: string[];
    boundElements: null;
    updated: number;
    link: null;
    locked: boolean;
}

interface ParsedSceneElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isDeleted?: boolean;
    strokeColor?: string;
    backgroundColor?: string;
    fillStyle?: string;
    opacity?: number;
    angle?: number;
    strokeWidth?: number;
    text?: string;
    fontSize?: number;
    points?: number[][];
    startArrowhead?: string;
    endArrowhead?: string;
    name?: string;
    groupIds?: string[];
}

interface ParsedScene {
    elements?: ParsedSceneElement[];
    appState?: {
        viewBackgroundColor?: string;
    };
}

const SCENE_TYPE = "excalidraw";

function randomSeed(): number {
    return Math.floor(Math.random() * 2_147_483_647);
}

function getRoundness(
    elementType: string,
): { type: number; value?: number } | null {
    switch (elementType) {
        case "diamond":
        case "line":
        case "arrow":
            return { type: 2 };
        case "rectangle":
        case "ellipse":
        case "image":
        case "frame":
            return { type: 3 };
        default:
            return null;
    }
}

export function convertAiElementToExcalidraw(element: AiElement) {
    const base: ExcalidrawBaseElement = {
        id: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        angle: element.angle ?? 0,
        strokeColor: element.strokeColor ?? "#1e1e1e",
        backgroundColor: element.backgroundColor ?? "transparent",
        fillStyle: element.fillStyle ?? "solid",
        strokeWidth: element.strokeWidth ?? 2,
        strokeStyle: element.strokeStyle ?? "solid",
        roundness: getRoundness(element.type),
        roughness: element.roughness ?? 1,
        opacity: element.opacity ?? 100,
        seed: randomSeed(),
        version: 1,
        versionNonce: randomSeed(),
        index: null,
        frameId: null,
        isDeleted: false,
        groupIds: element.groupIds ?? [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
    };

    switch (element.type) {
        case "text":
            return {
                ...base,
                text: element.text ?? "",
                fontSize: element.fontSize ?? 20,
                fontFamily: element.fontFamily ?? 1,
                textAlign: element.textAlign ?? "left",
                verticalAlign: element.verticalAlign ?? "top",
                containerId: null,
                originalText: element.text ?? "",
                autoResize: true,
                lineHeight: element.lineHeight ?? 1.25,
            };

        case "line":
            return {
                ...base,
                points: (
                    element.points ?? [
                        [0, 0],
                        [element.width, element.height],
                    ]
                ).map((point) => [point[0] ?? 0, point[1] ?? 0]),
                lastCommittedPoint: null,
                startBinding: null,
                endBinding: null,
            };

        case "arrow":
            return {
                ...base,
                points: (
                    element.points ?? [
                        [0, 0],
                        [element.width, element.height],
                    ]
                ).map((point) => [point[0] ?? 0, point[1] ?? 0]),
                lastCommittedPoint: null,
                startBinding: null,
                endBinding: null,
                startArrowhead: element.startArrowhead ?? null,
                endArrowhead: element.endArrowhead ?? "arrow",
                _startElementId: element.startElementId ?? null,
                _endElementId: element.endElementId ?? null,
            };

        case "freedraw":
            return {
                ...base,
                points: (element.points ?? []).map((point) => [
                    point[0] ?? 0,
                    point[1] ?? 0,
                ]),
                pressures: [],
                simulatePressure: true,
                lastCommittedPoint: null,
            };

        case "frame":
            return {
                ...base,
                name: element.name ?? null,
            };

        default:
            return base;
    }
}

export function convertAiToExcalidrawScene(update: AiCanvasUpdate) {
    const converted = update.elements.map(convertAiElementToExcalidraw);
    const resolved = resolveArrowBindings(
        converted as unknown as ConvertedElement[],
    );

    return {
        type: SCENE_TYPE,
        version: 2,
        elements: resolved,
        ...(update.viewBackgroundColor !== undefined && {
            appState: { viewBackgroundColor: update.viewBackgroundColor },
        }),
    };
}

// ---------------------------------------------------------------------------
// Arrow binding resolution — resolves startElementId/endElementId into
// proper Excalidraw binding metadata after all elements are converted.
// ---------------------------------------------------------------------------

interface ConvertedElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    boundElements: { id: string; type: string }[] | null;
    _startElementId?: string | null;
    _endElementId?: string | null;
    startBinding?: {
        elementId: string;
        focus: number;
        gap: number;
        fixedPoint: [number, number] | null;
    } | null;
    endBinding?: {
        elementId: string;
        focus: number;
        gap: number;
        fixedPoint: [number, number] | null;
    } | null;
    [key: string]: unknown;
}

export function resolveArrowBindings(
    elements: ConvertedElement[],
): ConvertedElement[] {
    const elementMap = new Map<string, ConvertedElement>();
    for (const element of elements) {
        elementMap.set(element.id, element);
    }

    for (const element of elements) {
        if (element.type !== "arrow") {
            continue;
        }

        const startId = element._startElementId;
        const endId = element._endElementId;

        if (startId) {
            const target = elementMap.get(startId);
            if (target) {
                element.startBinding = {
                    elementId: startId,
                    focus: 0,
                    gap: 4,
                    fixedPoint: null,
                };
                target.boundElements = target.boundElements ?? [];
                target.boundElements.push({ id: element.id, type: "arrow" });
            }
        }

        if (endId) {
            const target = elementMap.get(endId);
            if (target) {
                element.endBinding = {
                    elementId: endId,
                    focus: 0,
                    gap: 4,
                    fixedPoint: null,
                };
                target.boundElements = target.boundElements ?? [];
                target.boundElements.push({ id: element.id, type: "arrow" });
            }
        }

        delete element._startElementId;
        delete element._endElementId;
    }

    return elements;
}

// ---------------------------------------------------------------------------
// Excalidraw scene → simplified context for AI (strips internal noise)
// ---------------------------------------------------------------------------

export function simplifySceneForContext(sceneJson: string): string {
    try {
        const scene: ParsedScene = JSON.parse(sceneJson);

        const elements = (scene.elements ?? [])
            .filter((element) => !element.isDeleted)
            .map((element) => {
                const simplified: Record<string, unknown> = {
                    id: element.id,
                    type: element.type,
                    x: Math.round(element.x),
                    y: Math.round(element.y),
                    width: Math.round(element.width),
                    height: Math.round(element.height),
                };

                if (element.strokeColor && element.strokeColor !== "#1e1e1e") {
                    simplified.strokeColor = element.strokeColor;
                }
                if (
                    element.backgroundColor &&
                    element.backgroundColor !== "transparent"
                ) {
                    simplified.backgroundColor = element.backgroundColor;
                }
                if (element.fillStyle && element.fillStyle !== "solid") {
                    simplified.fillStyle = element.fillStyle;
                }
                if (element.opacity !== undefined && element.opacity !== 100) {
                    simplified.opacity = element.opacity;
                }
                if (element.angle && element.angle !== 0) {
                    simplified.angle = element.angle;
                }
                if (element.strokeWidth && element.strokeWidth !== 2) {
                    simplified.strokeWidth = element.strokeWidth;
                }

                switch (element.type) {
                    case "text":
                        simplified.text = element.text;
                        simplified.fontSize = element.fontSize;
                        break;
                    case "arrow":
                        if (element.startArrowhead) {
                            simplified.startArrowhead = element.startArrowhead;
                        }
                        if (element.endArrowhead) {
                            simplified.endArrowhead = element.endArrowhead;
                        }
                    // falls through
                    case "line":
                        simplified.points = element.points;
                        break;
                    case "frame":
                        if (element.name) {
                            simplified.name = element.name;
                        }
                        break;
                }

                if (
                    Array.isArray(element.groupIds) &&
                    element.groupIds.length > 0
                ) {
                    simplified.groupIds = element.groupIds;
                }

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
