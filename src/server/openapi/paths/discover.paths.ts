import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import {
    discoverPlaylistsQuerySchema,
    featuredArtistsQuerySchema,
    homePlaylistsQuerySchema,
    madeForYouQuerySchema,
    risingArtistsQuerySchema,
    trendingTracksQuerySchema,
} from "@/server/modules/discover/discover.validator";

const discoverArtistSchema = registry.register(
    "DiscoverFeaturedArtist",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
        followerCount: z.number().int(),
        latestPublishedAt: z.iso.datetime().nullable(),
    })
);

const risingSampleTrackSchema = registry.register(
    "DiscoverRisingSampleTrack",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
        mixUrl: z.url().nullable(),
    })
);

const risingArtistSchema = registry.register(
    "DiscoverRisingArtist",
    discoverArtistSchema.extend({
        sampleTrack: risingSampleTrackSchema.nullable(),
    })
);

const discoverTrackArtistSchema = registry.register(
    "DiscoverTrackArtist",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
    })
);

const discoverTrackSchema = registry.register(
    "DiscoverTrack",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
        mixUrl: z.url().nullable(),
        playCount: z.number().int(),
        likeCount: z.number().int(),
        publishedAt: z.iso.datetime().nullable(),
        genres: z.array(z.string()),
        artist: discoverTrackArtistSchema,
    })
);

const discoverPlaylistSchema = registry.register(
    "DiscoverPlaylist",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
        coverFallbackUrls: z.array(z.url()),
        trackCount: z.number().int(),
        saveCount: z.number().int(),
        owner: z.object({
            id: z.uuid(),
            username: z.string(),
            name: z.string().nullable(),
            avatarUrl: z.url().nullable(),
        }),
    })
);

const madeForYouTrackSchema = registry.register(
    "MadeForYouTrack",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
        mixUrl: z.url().nullable(),
        playCount: z.number().int(),
        likeCount: z.number().int(),
        publishedAt: z.iso.datetime().nullable(),
        genres: z.array(z.string()),
        artist: discoverTrackArtistSchema,
        reason: z.enum(["taste", "fresh"]),
    })
);

const homePlaylistSchema = registry.register(
    "HomePlaylist",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
        coverFallbackUrls: z.array(z.url()),
        trackCount: z.number().int(),
        source: z.enum(["owned", "saved"]),
        owner: z
            .object({
                id: z.uuid(),
                username: z.string(),
                name: z.string().nullable(),
            })
            .optional(),
    })
);

const featuredArtistsSuccessResponseSchema = successResponseSchema(
    z.array(discoverArtistSchema),
    "FeaturedArtistsSuccessResponse"
);

const risingArtistsSuccessResponseSchema = successResponseSchema(
    z.array(risingArtistSchema),
    "RisingArtistsSuccessResponse"
);

const trendingTracksSuccessResponseSchema = successResponseSchema(
    z.array(discoverTrackSchema),
    "TrendingTracksSuccessResponse"
);

const discoverPlaylistsSuccessResponseSchema = successResponseSchema(
    z.array(discoverPlaylistSchema),
    "DiscoverPlaylistsSuccessResponse"
);

const madeForYouSuccessResponseSchema = successResponseSchema(
    z.array(madeForYouTrackSchema),
    "MadeForYouTracksSuccessResponse"
);

const homePlaylistsSuccessResponseSchema = successResponseSchema(
    z.array(homePlaylistSchema),
    "HomePlaylistsSuccessResponse"
);

registry.registerPath({
    method: "get",
    path: "/api/discover/artists/featured",
    tags: ["Discover"],
    summary: "List featured artists",
    description:
        "Public catalog of artists with ≥1 PUBLISHED track in the last 30 days, ordered by followerCount then latest publish.",
    request: { query: featuredArtistsQuerySchema },
    responses: {
        200: {
            description: "Featured artists fetched successfully",
            content: {
                "application/json": {
                    schema: featuredArtistsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/discover/artists/rising",
    tags: ["Discover"],
    summary: "List rising artists",
    description:
        "Public catalog of recently active publishers (≥1 PUBLISHED in last 30 days), ordered by latest publish desc then followerCount asc. Includes optional sampleTrack from latest publish.",
    request: { query: risingArtistsQuerySchema },
    responses: {
        200: {
            description: "Rising artists fetched successfully",
            content: {
                "application/json": {
                    schema: risingArtistsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/discover/tracks/trending",
    tags: ["Discover"],
    summary: "List trending / all-time tracks",
    description:
        "Public catalog of PUBLISHED tracks. window=30d (default) limits to last 30 days; window=all uses all-time playCount. Sorted by playCount desc, publishedAt desc.",
    request: { query: trendingTracksQuerySchema },
    responses: {
        200: {
            description: "Trending tracks fetched successfully",
            content: {
                "application/json": {
                    schema: trendingTracksSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/discover/playlists",
    tags: ["Discover"],
    summary: "List discover playlists",
    description:
        "Public playlists ordered by saveCount desc then updatedAt desc.",
    request: { query: discoverPlaylistsQuerySchema },
    responses: {
        200: {
            description: "Discover playlists fetched successfully",
            content: {
                "application/json": {
                    schema: discoverPlaylistsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/discover/tracks/made-for-you",
    tags: ["Discover"],
    summary: "List Made for you tracks",
    description:
        "Auth-required heuristic recommendations from preferredGenres + recent TrackPlay (+ likes). Cold start falls back to fresh 14d publishes.",
    security: [...bearerSecurity],
    request: { query: madeForYouQuerySchema },
    responses: {
        200: {
            description: "Made for you tracks fetched successfully",
            content: {
                "application/json": {
                    schema: madeForYouSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/home/playlists",
    tags: ["Home"],
    summary: "List home playlists",
    description:
        "Viewer's owned playlists plus available saved playlists, most recently touched first (owned updatedAt vs saved savedAt).",
    security: [...bearerSecurity],
    request: { query: homePlaylistsQuerySchema },
    responses: {
        200: {
            description: "Home playlists fetched successfully",
            content: {
                "application/json": {
                    schema: homePlaylistsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
