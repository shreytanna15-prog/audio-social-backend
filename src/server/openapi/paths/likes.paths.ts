import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import {
    trackIdParamSchema,
    trackKindSchema,
} from "@/server/openapi/schemas";

const trackIdParamsSchema = z.object({
    id: trackIdParamSchema,
});

const likeActionDataSchema = registry.register(
    "LikeActionData",
    z.object({
        id: z.uuid(),
        isLiked: z.boolean(),
        likeCount: z.number().int(),
    })
);

const likedTrackArtistSchema = registry.register(
    "LikedTrackArtist",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
    })
);

const likedTrackSummarySchema = registry.register(
    "LikedTrackSummary",
    z.object({
        id: z.uuid(),
        title: z.string(),
        kind: trackKindSchema.optional(),
        durationMs: z.number().int().optional(),
        coverUrl: z.url().nullable().optional(),
        mixUrl: z.url().nullable().optional(),
        likeCount: z.number().int().optional(),
        isLiked: z.literal(true).optional(),
        artist: likedTrackArtistSchema.optional(),
    })
);

const likedTrackItemSchema = registry.register(
    "LikedTrackItem",
    z.object({
        likedAt: z.iso.datetime(),
        available: z.boolean(),
        track: likedTrackSummarySchema.nullable(),
    })
);

const likeActionSuccessResponseSchema = successResponseSchema(
    likeActionDataSchema,
    "LikeActionSuccessResponse"
);

const likedTrackListSuccessResponseSchema = successResponseSchema(
    z.array(likedTrackItemSchema),
    "LikedTrackListSuccessResponse"
);

registry.registerPath({
    method: "post",
    path: "/api/tracks/{id}/like",
    tags: ["Likes"],
    summary: "Like track",
    description:
        "Add a PUBLISHED track to Liked Songs. Idempotent; likeCount bumps only on first like.",
    security: [...bearerSecurity],
    request: { params: trackIdParamsSchema },
    responses: {
        200: {
            description: "Track liked",
            content: {
                "application/json": { schema: likeActionSuccessResponseSchema },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/tracks/{id}/like",
    tags: ["Likes"],
    summary: "Unlike track",
    description:
        "Remove a track from Liked Songs. Idempotent; likeCount drops only when a like existed.",
    security: [...bearerSecurity],
    request: { params: trackIdParamsSchema },
    responses: {
        200: {
            description: "Track unliked",
            content: {
                "application/json": { schema: likeActionSuccessResponseSchema },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/likes/tracks",
    tags: ["Likes"],
    summary: "List liked tracks",
    description:
        "Viewer's Liked Songs, newest first. Unpublished tracks stay listed with available=false.",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Liked tracks fetched",
            content: {
                "application/json": {
                    schema: likedTrackListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
