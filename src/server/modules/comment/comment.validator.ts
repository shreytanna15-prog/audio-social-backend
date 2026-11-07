import { z } from "@/server/lib/zod";

export const COMMENT_BODY_MAX = 300;

export const COMMENT_SORTS = ["newest", "top"] as const;

export const createCommentSchema = z
    .object({
        body: z
            .string()
            .trim()
            .min(1, "Comment is required")
            .max(
                COMMENT_BODY_MAX,
                `Comment must be at most ${COMMENT_BODY_MAX} characters`
            ),
        parentId: z.uuid("Invalid parent comment ID").nullish(),
    })
    .openapi("CreateTrackCommentBody");

export const listCommentsQuerySchema = z
    .object({
        sort: z
            .enum(COMMENT_SORTS, { message: "sort must be newest or top" })
            .optional()
            .default("newest"),
    })
    .openapi("ListTrackCommentsQuery");

export type CreateCommentSchema = z.infer<typeof createCommentSchema>;
export type ListCommentsQuerySchema = z.infer<typeof listCommentsQuerySchema>;
export type CommentSort = (typeof COMMENT_SORTS)[number];
