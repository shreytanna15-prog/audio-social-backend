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

const createTrackLayerSchema = z.object({
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
    appliedEffects: z.array(appliedEffectSchema).optional().default([]),
    peaks: z.array(z.number()).optional(),
});

export const createUploadUrlsSchema = z
    .object({
        kind: z.literal("SINGLE", {
            message: "Only SINGLE tracks are supported for upload-urls right now",
        }),
    })
    .openapi("CreateTrackUploadUrlsBody");

export const createTrackSchema = z
    .object({
        id: z.uuid("Invalid track ID"),
        kind: z.literal("SINGLE", {
            message: "Only SINGLE tracks can be created right now",
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
        layer: createTrackLayerSchema,
    })
    .openapi("CreateTrackBody");

export const listTracksQuerySchema = z
    .object({
        status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
    })
    .openapi("ListTracksQuery");

export type CreateUploadUrlsSchema = z.infer<typeof createUploadUrlsSchema>;
export type CreateTrackSchema = z.infer<typeof createTrackSchema>;
export type ListTracksQuerySchema = z.infer<typeof listTracksQuerySchema>;
