import { z } from "@/server/lib/zod";
import {
    createFeedClipSchema,
    feedClipUploadUrlSchema,
    listFeedQuerySchema,
} from "@/server/modules/feed/feed.validator";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";

const feedArtistSchema = registry.register(
    "FeedArtist",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
        isFollowing: z.boolean(),
    })
);

const feedClipItemSchema = registry.register(
    "FeedClipItem",
    z.object({
        id: z.uuid(),
        trackId: z.uuid(),
        title: z.string(),
        caption: z.string().nullable(),
        clipAudioUrl: z.url(),
        mixUrl: z.url().nullable(),
        coverUrl: z.url().nullable(),
        durationMs: z.number().int(),
        trackDurationMs: z.number().int(),
        startMs: z.number().int(),
        endMs: z.number().int(),
        likeCount: z.number().int(),
        commentCount: z.number().int(),
        isLiked: z.boolean(),
        artist: feedArtistSchema,
    })
);

const feedPageSchema = registry.register(
    "FeedPage",
    z.object({
        items: z.array(feedClipItemSchema),
        nextCursor: z.uuid().nullable(),
    })
);

const feedClipSummarySchema = registry.register(
    "FeedClipSummary",
    z.object({
        id: z.uuid(),
        trackId: z.uuid(),
        startMs: z.number().int(),
        endMs: z.number().int(),
        durationMs: z.number().int(),
        likeCount: z.number().int(),
        clipAudioPath: z.string(),
    })
);

const feedClipUploadSchema = registry.register(
    "FeedClipUploadUrl",
    z.object({
        path: z.string(),
        signedUrl: z.url(),
        token: z.string().optional(),
    })
);

const feedClipLikeSchema = registry.register(
    "FeedClipLikeResult",
    z.object({
        id: z.uuid(),
        isLiked: z.boolean(),
        likeCount: z.number().int(),
    })
);

registry.registerPath({
    method: "get",
    path: "/api/feed",
    tags: ["Feed"],
    summary: "List personalized feed clips",
    description:
        "Cursor-paginated FeedClip discovery (~40% followed artists, ~60% popular), shuffled without consecutive same artist. Auth required.",
    security: bearerSecurity,
    request: { query: listFeedQuerySchema },
    responses: {
        200: {
            description: "Feed fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        feedPageSchema,
                        "FeedSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/feed/clips/upload-url",
    tags: ["Feed"],
    summary: "Create feed clip upload URL",
    description:
        "Signed upload URL for client-trimmed AAC/M4A under the track feed-clip path. Auth + track ownership required.",
    security: bearerSecurity,
    request: { body: { content: { "application/json": { schema: feedClipUploadUrlSchema } } } },
    responses: {
        201: {
            description: "Feed clip upload URL created successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        feedClipUploadSchema,
                        "FeedClipUploadUrlSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/feed/clips",
    tags: ["Feed"],
    summary: "Create or replace feed clip",
    description:
        "Upsert one FeedClip per PUBLISHED track (10–30s). Replaces existing clip for the same track.",
    security: bearerSecurity,
    request: { body: { content: { "application/json": { schema: createFeedClipSchema } } } },
    responses: {
        201: {
            description: "Feed clip saved successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        feedClipSummarySchema,
                        "FeedClipSummarySuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/feed/clips/for-track/{trackId}",
    tags: ["Feed"],
    summary: "Get own feed clip for a track",
    description:
        "Owner-only. Returns the FeedClip summary for a track, or null when none exists.",
    security: bearerSecurity,
    request: {
        params: z.object({ trackId: z.uuid() }),
    },
    responses: {
        200: {
            description: "Feed clip lookup completed",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        feedClipSummarySchema.nullable(),
                        "FeedClipForTrackSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/feed/clips/{id}",
    tags: ["Feed"],
    summary: "Delete feed clip",
    description:
        "Owner-only delete. Removes clip row and storage object; parent track unchanged.",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
    },
    responses: {
        200: {
            description: "Feed clip deleted successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.object({ id: z.uuid() }),
                        "FeedClipDeleteSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/feed/clips/{id}/like",
    tags: ["Feed"],
    summary: "Like feed clip",
    description:
        "Idempotent FeedClipLike insert; bumps FeedClip.likeCount. Does not affect Liked Songs.",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
    },
    responses: {
        200: {
            description: "Feed clip liked successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        feedClipLikeSchema,
                        "FeedClipLikeSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/feed/clips/{id}/like",
    tags: ["Feed"],
    summary: "Unlike feed clip",
    description: "Idempotent FeedClipLike delete; decrements FeedClip.likeCount.",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
    },
    responses: {
        200: {
            description: "Feed clip unliked successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        feedClipLikeSchema,
                        "FeedClipUnlikeSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});
