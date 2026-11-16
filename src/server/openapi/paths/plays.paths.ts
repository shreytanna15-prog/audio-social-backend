import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import { recentlyPlayedQuerySchema } from "@/server/modules/play/play.validator";

const recentlyPlayedTrackSchema = registry.register(
    "RecentlyPlayedTrack",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
        mixUrl: z.url().nullable(),
        playCount: z.number().int(),
        likeCount: z.number().int(),
        publishedAt: z.iso.datetime().nullable(),
        genres: z.array(z.string()),
        artist: z.object({
            id: z.uuid(),
            username: z.string(),
            name: z.string().nullable(),
            avatarUrl: z.url().nullable(),
        }),
        playedAt: z.iso.datetime(),
    })
);

const recentlyPlayedSuccessResponseSchema = successResponseSchema(
    z.array(recentlyPlayedTrackSchema),
    "RecentlyPlayedSuccessResponse"
);

registry.registerPath({
    method: "get",
    path: "/api/me/recently-played",
    tags: ["Plays"],
    summary: "List recently played tracks",
    description:
        "Auth-required history of distinct PUBLISHED tracks the viewer played recently (TrackPlay), most recent first.",
    security: [...bearerSecurity],
    request: { query: recentlyPlayedQuerySchema },
    responses: {
        200: {
            description: "Recently played fetched successfully",
            content: {
                "application/json": {
                    schema: recentlyPlayedSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
