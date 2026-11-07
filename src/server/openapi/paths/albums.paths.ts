import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import { userIdParamSchema } from "@/server/openapi/schemas";
import { collectionTrackItemSchema } from "@/server/openapi/paths/playlists.paths";
import {
    albumCoverCompleteSchema,
    albumCoverUploadUrlSchema,
    attachAlbumTracksSchema,
    createAlbumSchema,
    reorderAlbumTracksSchema,
    updateAlbumSchema,
} from "@/server/modules/album/album.validator";

const albumIdParamsSchema = z.object({ id: z.uuid() });

const albumTrackParamsSchema = z.object({
    id: z.uuid(),
    trackId: z.uuid(),
});

const userIdParamsSchema = z.object({ id: userIdParamSchema });

export const albumSummarySchema = registry.register(
    "AlbumSummary",
    z.object({
        id: z.uuid(),
        ownerId: z.uuid(),
        title: z.string(),
        description: z.string().nullable(),
        status: z.enum(["DRAFT", "RELEASED"]),
        releasedAt: z.iso.datetime().nullable(),
        trackCount: z.number().int(),
        coverUrl: z.url().nullable(),
        coverFallbackUrl: z.url().nullable(),
        updatedAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
    })
);

const albumDetailSchema = registry.register(
    "AlbumDetail",
    albumSummarySchema.extend({
        isOwner: z.boolean(),
        isSaved: z.boolean(),
        tracks: z.array(collectionTrackItemSchema),
    })
);

const albumSummarySuccessResponseSchema = successResponseSchema(
    albumSummarySchema,
    "AlbumSummarySuccessResponse"
);

const albumListSuccessResponseSchema = successResponseSchema(
    z.array(albumSummarySchema),
    "AlbumListSuccessResponse"
);

const albumDetailSuccessResponseSchema = successResponseSchema(
    albumDetailSchema,
    "AlbumDetailSuccessResponse"
);

const albumIdSuccessResponseSchema = successResponseSchema(
    z.object({ id: z.uuid() }),
    "AlbumIdSuccessResponse"
);

const albumAttachSuccessResponseSchema = successResponseSchema(
    z.object({ attached: z.array(z.uuid()) }),
    "AlbumAttachSuccessResponse"
);

const albumUnlinkSuccessResponseSchema = successResponseSchema(
    z.object({ id: z.uuid(), trackId: z.uuid() }),
    "AlbumUnlinkSuccessResponse"
);

const albumReorderSuccessResponseSchema = successResponseSchema(
    z.object({ id: z.uuid(), trackIds: z.array(z.uuid()) }),
    "AlbumReorderSuccessResponse"
);

const albumCoverUploadUrlSuccessResponseSchema = successResponseSchema(
    z.object({
        path: z.string(),
        signedUrl: z.url(),
        token: z.string().optional(),
    }),
    "AlbumCoverUploadUrlSuccessResponse"
);

const albumCoverCompleteSuccessResponseSchema = successResponseSchema(
    z.object({ path: z.string(), coverUrl: z.url().nullable() }),
    "AlbumCoverCompleteSuccessResponse"
);

function jsonOk(description: string, schema: z.ZodType) {
    return {
        description,
        content: { "application/json": { schema } },
    };
}

registry.registerPath({
    method: "post",
    path: "/api/albums",
    tags: ["Albums"],
    summary: "Create album",
    description: "Creates a DRAFT album.",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: { "application/json": { schema: createAlbumSchema } },
        },
    },
    responses: {
        201: jsonOk(
            "Album created successfully",
            albumSummarySuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/albums",
    tags: ["Albums"],
    summary: "List own albums",
    description:
        "Owner's albums (DRAFT and RELEASED). coverFallbackUrl is the first track's cover when no custom cover is set.",
    security: [...bearerSecurity],
    responses: {
        200: jsonOk(
            "Albums fetched successfully",
            albumListSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/albums/{id}",
    tags: ["Albums"],
    summary: "Get album detail",
    description:
        "Owner always; others only when RELEASED (otherwise 404). Tracks no longer PUBLISHED return available=false.",
    security: [...bearerSecurity],
    request: { params: albumIdParamsSchema },
    responses: {
        200: jsonOk(
            "Album fetched successfully",
            albumDetailSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/albums/{id}",
    tags: ["Albums"],
    summary: "Update album",
    security: [...bearerSecurity],
    request: {
        params: albumIdParamsSchema,
        body: {
            required: true,
            content: { "application/json": { schema: updateAlbumSchema } },
        },
    },
    responses: {
        200: jsonOk(
            "Album updated successfully",
            albumSummarySuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/albums/{id}",
    tags: ["Albums"],
    summary: "Delete album",
    description: "Removes the album and its join rows; tracks are untouched.",
    security: [...bearerSecurity],
    request: { params: albumIdParamsSchema },
    responses: {
        200: jsonOk("Album deleted successfully", albumIdSuccessResponseSchema),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/albums/{id}/release",
    tags: ["Albums"],
    summary: "Release album",
    description:
        "Sets status RELEASED and releasedAt on first release. Rejects empty albums with 400.",
    security: [...bearerSecurity],
    request: { params: albumIdParamsSchema },
    responses: {
        200: jsonOk(
            "Album released successfully",
            albumSummarySuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/albums/{id}/unrelease",
    tags: ["Albums"],
    summary: "Unrelease album",
    description: "Returns the album to DRAFT; releasedAt and tracks are kept.",
    security: [...bearerSecurity],
    request: { params: albumIdParamsSchema },
    responses: {
        200: jsonOk(
            "Album unreleased successfully",
            albumSummarySuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/albums/{id}/tracks",
    tags: ["Albums"],
    summary: "Attach tracks to album",
    description:
        "Appends the owner's PUBLISHED tracks. 409 if a track already belongs to another album.",
    security: [...bearerSecurity],
    request: {
        params: albumIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: attachAlbumTracksSchema },
            },
        },
    },
    responses: {
        200: jsonOk(
            "Tracks attached successfully",
            albumAttachSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/albums/{id}/tracks/{trackId}",
    tags: ["Albums"],
    summary: "Unlink track from album",
    security: [...bearerSecurity],
    request: { params: albumTrackParamsSchema },
    responses: {
        200: jsonOk(
            "Track unlinked successfully",
            albumUnlinkSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "put",
    path: "/api/albums/{id}/tracks/reorder",
    tags: ["Albums"],
    summary: "Reorder album tracks",
    description: "trackIds must be a permutation of the current members.",
    security: [...bearerSecurity],
    request: {
        params: albumIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: reorderAlbumTracksSchema },
            },
        },
    },
    responses: {
        200: jsonOk(
            "Tracks reordered successfully",
            albumReorderSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/albums/{id}/cover/upload-url",
    tags: ["Albums"],
    summary: "Create album cover upload URL",
    security: [...bearerSecurity],
    request: {
        params: albumIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: albumCoverUploadUrlSchema },
            },
        },
    },
    responses: {
        201: jsonOk(
            "Cover upload URL created successfully",
            albumCoverUploadUrlSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/albums/{id}/cover/complete",
    tags: ["Albums"],
    summary: "Complete album cover upload",
    security: [...bearerSecurity],
    request: {
        params: albumIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: albumCoverCompleteSchema },
            },
        },
    },
    responses: {
        200: jsonOk(
            "Cover uploaded successfully",
            albumCoverCompleteSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/albums/{id}/cover",
    tags: ["Albums"],
    summary: "Delete album cover",
    security: [...bearerSecurity],
    request: { params: albumIdParamsSchema },
    responses: {
        200: jsonOk("Cover deleted successfully", albumIdSuccessResponseSchema),
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/users/{id}/albums",
    tags: ["Albums", "Users"],
    summary: "List a user's released albums",
    security: [...bearerSecurity],
    request: { params: userIdParamsSchema },
    responses: {
        200: jsonOk(
            "Released albums fetched successfully",
            albumListSuccessResponseSchema
        ),
        ...standardErrorResponses,
    },
});
