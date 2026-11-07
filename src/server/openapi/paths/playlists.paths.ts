import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import { userIdParamSchema } from "@/server/openapi/schemas";
import {
    attachPlaylistTracksSchema,
    createPlaylistSchema,
    playlistCoverCompleteSchema,
    playlistCoverUploadUrlSchema,
    reorderPlaylistTracksSchema,
    updatePlaylistSchema,
} from "@/server/modules/playlist/playlist.validator";

const playlistIdParamsSchema = z.object({ id: z.uuid() });

const playlistTrackParamsSchema = z.object({
    id: z.uuid(),
    trackId: z.uuid(),
});

const userIdParamsSchema = z.object({ id: userIdParamSchema });

export const collectionTrackArtistSchema = registry.register(
    "CollectionTrackArtist",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
    })
);

export const collectionTrackItemSchema = registry.register(
    "CollectionTrackItem",
    z.object({
        id: z.uuid(),
        position: z.number().int(),
        addedAt: z.iso.datetime(),
        available: z.boolean(),
        title: z.string(),
        kind: z.string().optional(),
        caption: z.string().nullable().optional(),
        genres: z.array(z.string()).optional(),
        durationMs: z.number().int().optional(),
        mixUrl: z.url().nullable().optional(),
        coverUrl: z.url().nullable().optional(),
        playCount: z.number().int().optional(),
        publishedAt: z.iso.datetime().nullable().optional(),
        artist: collectionTrackArtistSchema.optional(),
    })
);

export const playlistSummarySchema = registry.register(
    "PlaylistSummary",
    z.object({
        id: z.uuid(),
        ownerId: z.uuid(),
        title: z.string(),
        description: z.string().nullable(),
        visibility: z.enum(["PRIVATE", "PUBLIC"]),
        trackCount: z.number().int(),
        saveCount: z.number().int(),
        coverUrl: z.url().nullable(),
        coverFallbackUrls: z.array(z.url()),
        updatedAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
    })
);

const playlistDetailSchema = registry.register(
    "PlaylistDetail",
    playlistSummarySchema.extend({
        isOwner: z.boolean(),
        isSaved: z.boolean(),
        tracks: z.array(collectionTrackItemSchema),
    })
);

const playlistSummarySuccessResponseSchema = successResponseSchema(
    playlistSummarySchema,
    "PlaylistSummarySuccessResponse"
);

const playlistListSuccessResponseSchema = successResponseSchema(
    z.array(playlistSummarySchema),
    "PlaylistListSuccessResponse"
);

const playlistDetailSuccessResponseSchema = successResponseSchema(
    playlistDetailSchema,
    "PlaylistDetailSuccessResponse"
);

const playlistIdSuccessResponseSchema = successResponseSchema(
    z.object({ id: z.uuid() }),
    "PlaylistIdSuccessResponse"
);

const playlistAttachSuccessResponseSchema = successResponseSchema(
    z.object({ attached: z.array(z.uuid()) }),
    "PlaylistAttachSuccessResponse"
);

const playlistUnlinkSuccessResponseSchema = successResponseSchema(
    z.object({ id: z.uuid(), trackId: z.uuid() }),
    "PlaylistUnlinkSuccessResponse"
);

const playlistReorderSuccessResponseSchema = successResponseSchema(
    z.object({ id: z.uuid(), trackIds: z.array(z.uuid()) }),
    "PlaylistReorderSuccessResponse"
);

const playlistCoverUploadUrlSuccessResponseSchema = successResponseSchema(
    z.object({
        path: z.string(),
        signedUrl: z.url(),
        token: z.string().optional(),
    }),
    "PlaylistCoverUploadUrlSuccessResponse"
);

const playlistCoverCompleteSuccessResponseSchema = successResponseSchema(
    z.object({ path: z.string(), coverUrl: z.url().nullable() }),
    "PlaylistCoverCompleteSuccessResponse"
);

function jsonOk(description: string, schema: z.ZodType) {
    return {
        description,
        content: { "application/json": { schema } },
    };
}

registry.registerPath({
    method: "post",
    path: "/api/playlists",
    tags: ["Playlists"],
    summary: "Create playlist",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: { "application/json": { schema: createPlaylistSchema } },
        },
    },
    responses: {
        201: jsonOk(
            "Playlist created successfully",
            playlistSummarySuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/playlists",
    tags: ["Playlists"],
    summary: "List own playlists",
    description:
        "Owner's playlists by updatedAt desc. coverFallbackUrls holds up to 4 playable track covers for a client collage when no custom cover is set.",
    security: [...bearerSecurity],
    responses: {
        200: jsonOk(
            "Playlists fetched successfully",
            playlistListSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/playlists/{id}",
    tags: ["Playlists"],
    summary: "Get playlist detail",
    description:
        "Visible to the owner, or to anyone when PUBLIC; otherwise 404. Tracks no longer PUBLISHED return available=false.",
    security: [...bearerSecurity],
    request: { params: playlistIdParamsSchema },
    responses: {
        200: jsonOk(
            "Playlist fetched successfully",
            playlistDetailSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/playlists/{id}",
    tags: ["Playlists"],
    summary: "Update playlist",
    security: [...bearerSecurity],
    request: {
        params: playlistIdParamsSchema,
        body: {
            required: true,
            content: { "application/json": { schema: updatePlaylistSchema } },
        },
    },
    responses: {
        200: jsonOk(
            "Playlist updated successfully",
            playlistSummarySuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/playlists/{id}",
    tags: ["Playlists"],
    summary: "Delete playlist",
    description: "Removes the playlist and its join rows; tracks are untouched.",
    security: [...bearerSecurity],
    request: { params: playlistIdParamsSchema },
    responses: {
        200: jsonOk(
            "Playlist deleted successfully",
            playlistIdSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/playlists/{id}/tracks",
    tags: ["Playlists"],
    summary: "Attach tracks to playlist",
    description:
        "Appends PUBLISHED tracks from any artist. Already-attached tracks are skipped.",
    security: [...bearerSecurity],
    request: {
        params: playlistIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: attachPlaylistTracksSchema },
            },
        },
    },
    responses: {
        200: jsonOk(
            "Tracks attached successfully",
            playlistAttachSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/playlists/{id}/tracks/{trackId}",
    tags: ["Playlists"],
    summary: "Unlink track from playlist",
    security: [...bearerSecurity],
    request: { params: playlistTrackParamsSchema },
    responses: {
        200: jsonOk(
            "Track unlinked successfully",
            playlistUnlinkSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "put",
    path: "/api/playlists/{id}/tracks/reorder",
    tags: ["Playlists"],
    summary: "Reorder playlist tracks",
    description: "trackIds must be a permutation of the current members.",
    security: [...bearerSecurity],
    request: {
        params: playlistIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: reorderPlaylistTracksSchema },
            },
        },
    },
    responses: {
        200: jsonOk(
            "Tracks reordered successfully",
            playlistReorderSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/playlists/{id}/cover/upload-url",
    tags: ["Playlists"],
    summary: "Create playlist cover upload URL",
    security: [...bearerSecurity],
    request: {
        params: playlistIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: playlistCoverUploadUrlSchema },
            },
        },
    },
    responses: {
        201: jsonOk(
            "Cover upload URL created successfully",
            playlistCoverUploadUrlSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/playlists/{id}/cover/complete",
    tags: ["Playlists"],
    summary: "Complete playlist cover upload",
    security: [...bearerSecurity],
    request: {
        params: playlistIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: playlistCoverCompleteSchema },
            },
        },
    },
    responses: {
        200: jsonOk(
            "Cover uploaded successfully",
            playlistCoverCompleteSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/playlists/{id}/cover",
    tags: ["Playlists"],
    summary: "Delete playlist cover",
    security: [...bearerSecurity],
    request: { params: playlistIdParamsSchema },
    responses: {
        200: jsonOk(
            "Cover deleted successfully",
            playlistIdSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/users/{id}/playlists",
    tags: ["Playlists", "Users"],
    summary: "List a user's public playlists",
    security: [...bearerSecurity],
    request: { params: userIdParamsSchema },
    responses: {
        200: jsonOk(
            "Public playlists fetched successfully",
            playlistListSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});
