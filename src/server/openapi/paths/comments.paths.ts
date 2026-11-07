import { z } from "@/server/lib/zod";
import {
    apiErrorSchema,
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    commentIdParamSchema,
    commentLikeSuccessResponseSchema,
    deleteCommentSuccessResponseSchema,
    trackCommentListSuccessResponseSchema,
    trackCommentSuccessResponseSchema,
    trackIdParamSchema,
} from "@/server/openapi/schemas";
import {
    createCommentSchema,
    listCommentsQuerySchema,
} from "@/server/modules/comment/comment.validator";

const trackIdParamsSchema = z.object({
    id: trackIdParamSchema,
});

const commentIdParamsSchema = z.object({
    id: commentIdParamSchema,
});

const forbiddenResponse = {
    403: {
        description: "Forbidden",
        content: {
            "application/json": {
                schema: apiErrorSchema,
            },
        },
    },
} as const;

registry.registerPath({
    method: "get",
    path: "/api/tracks/{id}/comments",
    tags: ["Comments"],
    summary: "List track comments",
    description:
        "Top-level comments with nested replies. Track must be PUBLISHED. `sort=newest` (default) or `top` (by likeCount); replies are oldest first.",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
        query: listCommentsQuerySchema,
    },
    responses: {
        200: {
            description: "Comments fetched successfully",
            content: {
                "application/json": {
                    schema: trackCommentListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/tracks/{id}/comments",
    tags: ["Comments"],
    summary: "Create comment or reply",
    description:
        "Comment on a PUBLISHED track. Set `parentId` to reply; parent must be a top-level comment on the same track (replies to replies return 400).",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: createCommentSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Comment created successfully",
            content: {
                "application/json": {
                    schema: trackCommentSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/comments/{id}",
    tags: ["Comments"],
    summary: "Delete own comment",
    description:
        "Hard delete (author only). Deleting a top-level comment also removes its replies; returns the updated track `commentCount`.",
    security: [...bearerSecurity],
    request: { params: commentIdParamsSchema },
    responses: {
        200: {
            description: "Comment deleted successfully",
            content: {
                "application/json": {
                    schema: deleteCommentSuccessResponseSchema,
                },
            },
        },
        ...forbiddenResponse,
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/comments/{id}/like",
    tags: ["Comments"],
    summary: "Like comment",
    description: "Idempotent. Comment's track must be PUBLISHED.",
    security: [...bearerSecurity],
    request: { params: commentIdParamsSchema },
    responses: {
        200: {
            description: "Comment liked successfully",
            content: {
                "application/json": {
                    schema: commentLikeSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/comments/{id}/like",
    tags: ["Comments"],
    summary: "Unlike comment",
    description: "Idempotent. Comment's track must be PUBLISHED.",
    security: [...bearerSecurity],
    request: { params: commentIdParamsSchema },
    responses: {
        200: {
            description: "Comment unliked successfully",
            content: {
                "application/json": {
                    schema: commentLikeSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
