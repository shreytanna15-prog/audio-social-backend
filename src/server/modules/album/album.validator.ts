import { z } from "@/server/lib/zod";

const COVER_CONTENT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
] as const;

const titleSchema = z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters");

const nullableDescriptionSchema = z
    .string()
    .trim()
    .max(500, "Description must be less than 500 characters")
    .nullish();

export const createAlbumSchema = z
    .object({
        title: titleSchema,
        description: nullableDescriptionSchema.transform((value) =>
            value == null || value === "" ? null : value
        ),
    })
    .openapi("CreateAlbumBody");

export const updateAlbumSchema = z
    .object({
        title: titleSchema.optional(),
        description: nullableDescriptionSchema.transform((value) => {
            if (value === undefined) {
                return undefined;
            }
            return value == null || value === "" ? null : value;
        }),
    })
    .refine(
        (value) => value.title !== undefined || value.description !== undefined,
        { message: "At least one field is required" }
    )
    .openapi("UpdateAlbumBody");

export const attachAlbumTracksSchema = z
    .object({
        trackIds: z
            .array(z.uuid("Invalid track ID"))
            .min(1, "At least one track ID is required")
            .max(100, "Too many tracks"),
    })
    .openapi("AttachAlbumTracksBody");

export const reorderAlbumTracksSchema = z
    .object({
        trackIds: z.array(z.uuid("Invalid track ID")).max(1000),
    })
    .openapi("ReorderAlbumTracksBody");

export const albumCoverUploadUrlSchema = z
    .object({
        contentType: z.enum(COVER_CONTENT_TYPES, {
            message: "Cover must be jpeg, png, or webp",
        }),
    })
    .openapi("AlbumCoverUploadUrlBody");

export const albumCoverCompleteSchema = z
    .object({
        path: z.string().min(1, "Path is required"),
    })
    .openapi("AlbumCoverCompleteBody");

export type CreateAlbumSchema = z.infer<typeof createAlbumSchema>;
export type UpdateAlbumSchema = z.infer<typeof updateAlbumSchema>;
export type AttachAlbumTracksSchema = z.infer<typeof attachAlbumTracksSchema>;
export type ReorderAlbumTracksSchema = z.infer<typeof reorderAlbumTracksSchema>;
export type AlbumCoverUploadUrlSchema = z.infer<
    typeof albumCoverUploadUrlSchema
>;
export type AlbumCoverCompleteSchema = z.infer<typeof albumCoverCompleteSchema>;
