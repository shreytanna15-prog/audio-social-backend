import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import { albumSummarySchema } from "@/server/openapi/paths/albums.paths";
import { playlistSummarySchema } from "@/server/openapi/paths/playlists.paths";

const idParamsSchema = z.object({ id: z.uuid() });

const saveOwnerSchema = registry.register(
    "SaveOwner",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
    })
);

const playlistSaveResultSchema = registry.register(
    "PlaylistSaveResult",
    z.object({
        id: z.uuid(),
        isSaved: z.boolean(),
        saveCount: z.number().int(),
    })
);

const albumSaveResultSchema = registry.register(
    "AlbumSaveResult",
    z.object({
        id: z.uuid(),
        isSaved: z.boolean(),
    })
);

const savedPlaylistItemSchema = registry.register(
    "SavedPlaylistItem",
    z.object({
        savedAt: z.iso.datetime(),
        available: z.boolean(),
        playlist: playlistSummarySchema.partial().extend({
            id: z.uuid(),
            title: z.string(),
            owner: saveOwnerSchema.optional(),
        }),
    })
);

const savedAlbumItemSchema = registry.register(
    "SavedAlbumItem",
    z.object({
        savedAt: z.iso.datetime(),
        available: z.boolean(),
        album: albumSummarySchema.partial().extend({
            id: z.uuid(),
            title: z.string(),
            owner: saveOwnerSchema.optional(),
        }),
    })
);

function jsonOk(description: string, schema: z.ZodType) {
    return {
        description,
        content: { "application/json": { schema } },
    };
}

registry.registerPath({
    method: "post",
    path: "/api/playlists/{id}/save",
    tags: ["Saves"],
    summary: "Save playlist",
    description:
        "Bookmark another user's PUBLIC playlist. Idempotent; saveCount bumps only on first save. 400 for own playlist, 404 when private or missing.",
    security: [...bearerSecurity],
    request: { params: idParamsSchema },
    responses: {
        200: jsonOk(
            "Playlist saved",
            successResponseSchema(
                playlistSaveResultSchema,
                "PlaylistSaveSuccessResponse"
            )
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/playlists/{id}/save",
    tags: ["Saves"],
    summary: "Unsave playlist",
    description:
        "Remove a saved playlist. Idempotent; saveCount drops only when a save existed.",
    security: [...bearerSecurity],
    request: { params: idParamsSchema },
    responses: {
        200: jsonOk(
            "Playlist unsaved",
            successResponseSchema(
                playlistSaveResultSchema,
                "PlaylistUnsaveSuccessResponse"
            )
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/albums/{id}/save",
    tags: ["Saves"],
    summary: "Save album",
    description:
        "Bookmark another user's RELEASED album. Idempotent. 400 for own album, 404 when not released or missing.",
    security: [...bearerSecurity],
    request: { params: idParamsSchema },
    responses: {
        200: jsonOk(
            "Album saved",
            successResponseSchema(
                albumSaveResultSchema,
                "AlbumSaveSuccessResponse"
            )
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/albums/{id}/save",
    tags: ["Saves"],
    summary: "Unsave album",
    description: "Remove a saved album. Idempotent.",
    security: [...bearerSecurity],
    request: { params: idParamsSchema },
    responses: {
        200: jsonOk(
            "Album unsaved",
            successResponseSchema(
                albumSaveResultSchema,
                "AlbumUnsaveSuccessResponse"
            )
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/saves/playlists",
    tags: ["Saves"],
    summary: "List saved playlists",
    description:
        "Viewer's saved playlists, newest first. Playlists that are no longer PUBLIC stay listed with available=false.",
    security: [...bearerSecurity],
    responses: {
        200: jsonOk(
            "Saved playlists fetched",
            successResponseSchema(
                z.array(savedPlaylistItemSchema),
                "SavedPlaylistListSuccessResponse"
            )
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/saves/albums",
    tags: ["Saves"],
    summary: "List saved albums",
    description:
        "Viewer's saved albums, newest first. Albums that are no longer RELEASED stay listed with available=false.",
    security: [...bearerSecurity],
    responses: {
        200: jsonOk(
            "Saved albums fetched",
            successResponseSchema(
                z.array(savedAlbumItemSchema),
                "SavedAlbumListSuccessResponse"
            )
        ),
        ...standardErrorResponses,
    },
});
