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

const visibilitySchema = z.enum(["PRIVATE", "PUBLIC"], {
    message: "visibility must be PRIVATE or PUBLIC",
});

export const createPlaylistSchema = z
    .object({
        title: titleSchema,
        description: nullableDescriptionSchema.transform((value) =>
            value == null || value === "" ? null : value
        ),
        visibility: visibilitySchema.optional().default("PRIVATE"),
    })
    .openapi("CreatePlaylistBody");

export const updatePlaylistSchema = z
    .object({
        title: titleSchema.optional(),
        description: nullableDescriptionSchema.transform((value) => {
            if (value === undefined) {
                return undefined;
            }
            return value == null || value === "" ? null : value;
        }),
        visibility: visibilitySchema.optional(),
    })
    .refine(
        (value) =>
            value.title !== undefined ||
            value.description !== undefined ||
            value.visibility !== undefined,
        { message: "At least one field is required" }
    )
    .openapi("UpdatePlaylistBody");

export const attachPlaylistTracksSchema = z
    .object({
        trackIds: z
            .array(z.uuid("Invalid track ID"))
            .min(1, "At least one track ID is required")
            .max(100, "Too many tracks"),
    })
    .openapi("AttachPlaylistTracksBody");

export const reorderPlaylistTracksSchema = z
    .object({
        trackIds: z.array(z.uuid("Invalid track ID")).max(1000),
    })
    .openapi("ReorderPlaylistTracksBody");

export const playlistCoverUploadUrlSchema = z
    .object({
        contentType: z.enum(COVER_CONTENT_TYPES, {
            message: "Cover must be jpeg, png, or webp",
        }),
    })
    .openapi("PlaylistCoverUploadUrlBody");

export const playlistCoverCompleteSchema = z
    .object({
        path: z.string().min(1, "Path is required"),
    })
    .openapi("PlaylistCoverCompleteBody");

export type CreatePlaylistSchema = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistSchema = z.infer<typeof updatePlaylistSchema>;
export type AttachPlaylistTracksSchema = z.infer<
    typeof attachPlaylistTracksSchema
>;
export type ReorderPlaylistTracksSchema = z.infer<
    typeof reorderPlaylistTracksSchema
>;
export type PlaylistCoverUploadUrlSchema = z.infer<
    typeof playlistCoverUploadUrlSchema
>;
export type PlaylistCoverCompleteSchema = z.infer<
    typeof playlistCoverCompleteSchema
>;
