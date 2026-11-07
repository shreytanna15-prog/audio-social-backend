import { z } from "@/server/lib/zod";
import {
    MAX_TRACK_GENRES,
    MAX_TRACK_KEYWORDS,
    TRACK_GENRES,
} from "@/server/constants/track-genres";

const EFFECT_IDS = ["denoise", "enhance", "reverb", "echo", "modulate"] as const;
const COVER_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
] as const;

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
        projectId: z.uuid("Invalid project ID").optional(),
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

export const trackCoverUploadUrlSchema = z
    .object({
        contentType: z.enum(COVER_CONTENT_TYPES, {
            message: "Cover must be jpeg, png, or webp",
        }),
    })
    .openapi("TrackCoverUploadUrlBody");

export const trackCoverCompleteSchema = z
    .object({
        path: z.string().min(1, "Path is required"),
    })
    .openapi("TrackCoverCompleteBody");

const genreIdSchema = z.enum(TRACK_GENRES, {
    message: "Invalid genre id",
});

export const publishTrackSchema = z
    .object({
        caption: z
            .string()
            .trim()
            .max(200, "Caption must be at most 200 characters")
            .nullish()
            .transform((value) => {
                if (value == null || value === "") {
                    return null;
                }
                return value;
            }),
        description: z
            .string()
            .trim()
            .max(1000, "Description must be at most 1000 characters")
            .nullish()
            .transform((value) => {
                if (value == null || value === "") {
                    return null;
                }
                return value;
            }),
        genres: z
            .array(genreIdSchema)
            .min(1, "Select at least one genre")
            .max(MAX_TRACK_GENRES, `Select at most ${MAX_TRACK_GENRES} genres`),
        keywords: z
            .array(z.string().trim().min(1).max(40))
            .max(MAX_TRACK_KEYWORDS, `At most ${MAX_TRACK_KEYWORDS} keywords`)
            .optional()
            .default([])
            .transform((values) =>
                [
                    ...new Set(
                        values.map((value) => value.toLowerCase()).filter(Boolean)
                    ),
                ].slice(0, MAX_TRACK_KEYWORDS)
            ),
    })
    .openapi("PublishTrackBody");

export type CreateUploadUrlsSchema = z.infer<typeof createUploadUrlsSchema>;
export type CreateTrackSchema = z.infer<typeof createTrackSchema>;
export type UpdateTrackSchema = z.infer<typeof updateTrackSchema>;
export type ListTracksQuerySchema = z.infer<typeof listTracksQuerySchema>;
export type TrackLayerBodySchema = z.infer<typeof trackLayerBodySchema>;
export type TrackCoverUploadUrlSchema = z.infer<typeof trackCoverUploadUrlSchema>;
export type TrackCoverCompleteSchema = z.infer<typeof trackCoverCompleteSchema>;
export type PublishTrackSchema = z.infer<typeof publishTrackSchema>;
