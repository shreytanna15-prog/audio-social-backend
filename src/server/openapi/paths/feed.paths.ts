import { z } from "@/server/lib/zod";
import { listFeedQuerySchema } from "@/server/modules/feed/feed.validator";
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

const feedItemSchema = registry.register(
    "FeedItem",
    z.object({
        id: z.uuid(),
        title: z.string(),
        caption: z.string().nullable(),
        durationMs: z.number().int(),
        coverUrl: z.url().nullable(),
        mixUrl: z.url().nullable(),
        likeCount: z.number().int(),
        commentCount: z.number().int(),
        isLiked: z.boolean(),
        publishedAt: z.iso.datetime().nullable(),
        genres: z.array(z.string()),
        artist: feedArtistSchema,
    })
);

const feedPageSchema = registry.register(
    "FeedPage",
    z.object({
        items: z.array(feedItemSchema),
        nextCursor: z.uuid().nullable(),
    })
);

const feedSuccessResponseSchema = successResponseSchema(
    feedPageSchema,
    "FeedSuccessResponse"
);

registry.registerPath({
    method: "get",
    path: "/api/feed",
    tags: ["Feed"],
    summary: "List published feed (reels)",
    description:
        "Cursor-paginated PUBLISHED tracks with mix, ordered by publishedAt desc. Auth required.",
    security: bearerSecurity,
    request: { query: listFeedQuerySchema },
    responses: {
        200: {
            description: "Feed fetched successfully",
            content: {
                "application/json": {
                    schema: feedSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
