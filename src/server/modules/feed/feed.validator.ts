import { z } from "@/server/lib/zod";

export const listFeedQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(30)
            .optional()
            .default(10),
    })
    .openapi("ListFeedQuery");

export type ListFeedQuerySchema = z.infer<typeof listFeedQuerySchema>;

export const createFeedClipSchema = z
    .object({
        trackId: z.uuid("Invalid trackId"),
        clipAudioPath: z.string().min(1, "clipAudioPath is required"),
        startMs: z.number().int().min(0),
        endMs: z.number().int().min(10000),
        durationMs: z.number().int().min(10000).max(30000),
    })
    .superRefine((value, ctx) => {
        if (value.endMs - value.startMs !== value.durationMs) {
            ctx.addIssue({
                code: "custom",
                message: "endMs - startMs must equal durationMs",
                path: ["durationMs"],
            });
        }
    })
    .openapi("CreateFeedClipBody");

export type CreateFeedClipSchema = z.infer<typeof createFeedClipSchema>;

export const feedClipUploadUrlSchema = z
    .object({
        trackId: z.uuid("Invalid trackId"),
    })
    .openapi("FeedClipUploadUrlBody");

export type FeedClipUploadUrlSchema = z.infer<typeof feedClipUploadUrlSchema>;
