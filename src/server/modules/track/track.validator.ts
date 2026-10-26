import { z } from "@/server/lib/zod";

const EFFECT_IDS = ["denoise", "enhance", "reverb", "echo", "modulate"] as const;

const LAYER_KINDS = ["vocal", "beat", "import"] as const;

const appliedEffectSchema = z.object({
    id: z.enum(EFFECT_IDS, { message: "Invalid effect id" }),
    params: z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean()])
    ),
});

export const trackLayerBodySchema = z.object({
    id: z.uuid("Invalid layer ID"),
    kind: z.enum(LAYER_KINDS, { message: "Invalid layer kind" }),
    name: z
        .string()
        .trim()
        .min(1, "Layer name is required")
        .max(100, "Layer name must be less than 100 characters"),
    durationMs: z
        .number()
        .int("Duration must be a whole number of milliseconds")
        .min(0, "Duration must be 0 or greater"),
    offsetMs: z
        .number()
        .int("Offset must be a whole number of milliseconds")
        .min(0, "Offset must be 0 or greater")
        .optional()
        .default(0),
    muted: z.boolean().optional().default(false),
    sortIndex: z
        .number()
        .int("Sort index must be a whole number")
        .min(0, "Sort index must be 0 or greater")
        .optional(),
    appliedEffects: z.array(appliedEffectSchema).optional().default([]),
    peaks: z.array(z.number()).optional(),
});

export const createUploadUrlsSchema = z
    .object({
        kind: z.enum(["SINGLE", "MULTI"], {
            message: "kind must be SINGLE or MULTI",
        }),
        trackId: z.uuid("Invalid track ID").optional(),
        layerIds: z.array(z.uuid("Invalid layer ID")).optional(),
    })
    .openapi("CreateTrackUploadUrlsBody");

export const createTrackSchema = z
    .object({
        id: z.uuid("Invalid track ID"),
        kind: z.enum(["SINGLE", "MULTI"], {
            message: "kind must be SINGLE or MULTI",
        }),
        title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(100, "Title must be less than 100 characters"),
        durationMs: z
            .number()
            .int("Duration must be a whole number of milliseconds")
            .min(0, "Duration must be 0 or greater"),
        layers: z
            .array(trackLayerBodySchema)
            .min(1, "At least one layer is required")
            .max(16, "Too many layers"),
    })
    .superRefine((value, ctx) => {
        if (value.kind === "SINGLE" && value.layers.length !== 1) {
            ctx.addIssue({
                code: "custom",
                message: "SINGLE tracks must have exactly one layer",
                path: ["layers"],
            });
        }
    })
    .openapi("CreateTrackBody");

export const updateTrackSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(100, "Title must be less than 100 characters")
            .optional(),
        durationMs: z
            .number()
            .int("Duration must be a whole number of milliseconds")
            .min(0, "Duration must be 0 or greater")
            .optional(),
        layers: z
            .array(trackLayerBodySchema)
            .min(1, "At least one layer is required")
            .max(16, "Too many layers")
            .optional(),
    })
    .refine(
        (value) =>
            value.title !== undefined ||
            value.durationMs !== undefined ||
            value.layers !== undefined,
        { message: "At least one field is required" }
    )
    .openapi("UpdateTrackBody");

export const listTracksQuerySchema = z
    .object({
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    })
    .openapi("ListTracksQuery");

export type CreateUploadUrlsSchema = z.infer<typeof createUploadUrlsSchema>;
export type CreateTrackSchema = z.infer<typeof createTrackSchema>;
export type UpdateTrackSchema = z.infer<typeof updateTrackSchema>;
export type ListTracksQuerySchema = z.infer<typeof listTracksQuerySchema>;
export type TrackLayerBodySchema = z.infer<typeof trackLayerBodySchema>;
