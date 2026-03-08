import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared enums & primitives
// ---------------------------------------------------------------------------

const fillStyleSchema = z.enum(["hachure", "cross-hatch", "solid", "zigzag"]);

const strokeStyleSchema = z.enum(["solid", "dashed", "dotted"]);

const textAlignSchema = z.enum(["left", "center", "right"]);

const verticalAlignSchema = z.enum(["top", "middle", "bottom"]);

const fontFamilySchema = z.number().int();

const roundnessSchema = z
    .object({
        type: z.number().int(),
        value: z.number().optional(),
    })
    .nullable();

const pointSchema = z.tuple([z.number(), z.number()]);

const boundElementSchema = z.object({
    id: z.string(),
    type: z.enum(["arrow", "text"]),
});

const pointBindingSchema = z.object({
    elementId: z.string(),
    focus: z.number(),
    gap: z.number(),
    fixedPoint: z.tuple([z.number(), z.number()]).optional(),
});

const arrowheadSchema = z
    .enum([
        "arrow",
        "bar",
        "dot",
        "circle",
        "circle_outline",
        "triangle",
        "triangle_outline",
        "diamond",
        "diamond_outline",
        "crowfoot_one",
        "crowfoot_many",
        "crowfoot_one_or_many",
    ])
    .nullable();

// ---------------------------------------------------------------------------
// Base element – fields shared by every element type
// ---------------------------------------------------------------------------

const baseElementSchema = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    angle: z.number(),
    strokeColor: z.string(),
    backgroundColor: z.string(),
    fillStyle: fillStyleSchema,
    strokeWidth: z.number(),
    strokeStyle: strokeStyleSchema,
    roundness: roundnessSchema,
    roughness: z.number(),
    opacity: z.number(),
    seed: z.number().int(),
    version: z.number().int(),
    versionNonce: z.number().int(),
    index: z.string().nullable().optional(),
    isDeleted: z.boolean(),
    groupIds: z.array(z.string()),
    frameId: z.string().nullable().optional(),
    boundElements: z.array(boundElementSchema).nullable().optional(),
    updated: z.number().optional(),
    link: z.string().nullable().optional(),
    locked: z.boolean().optional(),
    customData: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Per-type element schemas (discriminated on `type`)
// ---------------------------------------------------------------------------

const genericElementSchema = baseElementSchema.extend({
    type: z.enum(["rectangle", "diamond", "ellipse", "selection"]),
});

const textElementSchema = baseElementSchema.extend({
    type: z.literal("text"),
    fontSize: z.number(),
    fontFamily: fontFamilySchema,
    text: z.string(),
    textAlign: textAlignSchema,
    verticalAlign: verticalAlignSchema,
    containerId: z.string().nullable().optional(),
    originalText: z.string(),
    autoResize: z.boolean().optional(),
    lineHeight: z.number(),
});

const linearElementSchema = baseElementSchema.extend({
    type: z.literal("line"),
    points: z.array(pointSchema),
    lastCommittedPoint: pointSchema.nullable().optional(),
    startBinding: pointBindingSchema.nullable().optional(),
    endBinding: pointBindingSchema.nullable().optional(),
    startArrowhead: arrowheadSchema.optional(),
    endArrowhead: arrowheadSchema.optional(),
});

const arrowElementSchema = baseElementSchema.extend({
    type: z.literal("arrow"),
    points: z.array(pointSchema),
    lastCommittedPoint: pointSchema.nullable().optional(),
    startBinding: pointBindingSchema.nullable().optional(),
    endBinding: pointBindingSchema.nullable().optional(),
    startArrowhead: arrowheadSchema.optional(),
    endArrowhead: arrowheadSchema.optional(),
    elbowed: z.boolean().optional(),
});

const freeDrawElementSchema = baseElementSchema.extend({
    type: z.literal("freedraw"),
    points: z.array(pointSchema),
    pressures: z.array(z.number()),
    simulatePressure: z.boolean(),
    lastCommittedPoint: pointSchema.nullable().optional(),
});

const imageCropSchema = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    naturalWidth: z.number(),
    naturalHeight: z.number(),
});

const imageElementSchema = baseElementSchema.extend({
    type: z.literal("image"),
    fileId: z.string().nullable(),
    status: z.enum(["pending", "saved", "error"]),
    scale: z.tuple([z.number(), z.number()]),
    crop: imageCropSchema.nullable().optional(),
});

const frameElementSchema = baseElementSchema.extend({
    type: z.enum(["frame", "magicframe"]),
    name: z.string().nullable().optional(),
});

const embeddableElementSchema = baseElementSchema.extend({
    type: z.enum(["embeddable", "iframe"]),
});

// ---------------------------------------------------------------------------
// Union of all element types
// ---------------------------------------------------------------------------

export const excalidrawElementSchema = z.discriminatedUnion("type", [
    genericElementSchema,
    textElementSchema,
    linearElementSchema,
    arrowElementSchema,
    freeDrawElementSchema,
    imageElementSchema,
    frameElementSchema,
    embeddableElementSchema,
]);

// ---------------------------------------------------------------------------
// Binary file data (embedded images etc.)
// ---------------------------------------------------------------------------

const binaryFileDataSchema = z.object({
    mimeType: z.string(),
    id: z.string(),
    dataURL: z.string(),
    created: z.number(),
    lastRetrieved: z.number().optional(),
    version: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Exported appState (only fields with export: true)
// ---------------------------------------------------------------------------

const appStateSchema = z
    .object({
        gridSize: z.number().nullable().optional(),
        gridStep: z.number().optional(),
        gridModeEnabled: z.boolean().optional(),
        viewBackgroundColor: z.string().optional(),
    })
    .optional();

// ---------------------------------------------------------------------------
// Top-level scene schema
// ---------------------------------------------------------------------------

export const excalidrawSceneSchema = z.object({
    type: z.literal("excalidraw"),
    version: z.number().int(),
    source: z.string().optional(),
    elements: z.array(excalidrawElementSchema),
    appState: appStateSchema,
    files: z.record(z.string(), binaryFileDataSchema).optional(),
});

export type ExcalidrawSceneData = z.infer<typeof excalidrawSceneSchema>;
