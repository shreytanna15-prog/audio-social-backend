import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    createTrackUploadUrlsSuccessResponseSchema,
    trackBackupCompleteSuccessResponseSchema,
    trackDetailSuccessResponseSchema,
    trackIdParamSchema,
    trackIdSuccessResponseSchema,
    trackListSuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    createTrackSchema,
    createUploadUrlsSchema,
    listTracksQuerySchema,
    updateTrackSchema,
} from "@/server/modules/track/track.validator";

const trackIdParamsSchema = z.object({
    id: trackIdParamSchema,
});

registry.registerPath({
    method: "post",
    path: "/api/tracks/upload-urls",
    tags: ["Tracks"],
    summary: "Create track upload URLs",
    description:
        "Create signed upload URLs for mix, stems, and sources (used by backup/sync).",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: createUploadUrlsSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Upload URLs created successfully",
            content: {
                "application/json": {
                    schema: createTrackUploadUrlsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/tracks",
    tags: ["Tracks"],
    summary: "List tracks",
    description:
        "List the authenticated user's tracks, optionally filtered by status.",
    security: [...bearerSecurity],
    request: {
        query: listTracksQuerySchema,
    },
    responses: {
        200: {
            description: "Tracks fetched successfully",
            content: {
                "application/json": {
                    schema: trackListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/tracks",
    tags: ["Tracks"],
    summary: "Create track draft",
    description:
        "Create a DRAFT track metadata row (LOCAL_ONLY). Audio stays on device until backup.",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: createTrackSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Track created successfully",
            content: {
                "application/json": {
                    schema: trackIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/tracks/{id}",
    tags: ["Tracks"],
    summary: "Get track",
    description: "Fetch a single track by id (owner only).",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
    },
    responses: {
        200: {
            description: "Track fetched successfully",
            content: {
                "application/json": {
                    schema: trackDetailSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/tracks/{id}",
    tags: ["Tracks"],
    summary: "Update track draft",
    description: "Update DRAFT track metadata and layers (owner only).",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: updateTrackSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Track updated successfully",
            content: {
                "application/json": {
                    schema: trackIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/tracks/{id}",
    tags: ["Tracks"],
    summary: "Delete track",
    description: "Delete a track and its storage files (owner only).",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
    },
    responses: {
        200: {
            description: "Track deleted successfully",
            content: {
                "application/json": {
                    schema: trackIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/tracks/{id}/backup/upload-urls",
    tags: ["Tracks"],
    summary: "Create backup upload URLs",
    description:
        "Signed URLs to upload local mix, stems, and sources to Supabase.",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
    },
    responses: {
        200: {
            description: "Backup upload URLs created successfully",
            content: {
                "application/json": {
                    schema: createTrackUploadUrlsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/tracks/{id}/backup/complete",
    tags: ["Tracks"],
    summary: "Complete track backup",
    description:
        "Verify uploaded objects and mark track storageState as SYNCED.",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
    },
    responses: {
        200: {
            description: "Track backup completed successfully",
            content: {
                "application/json": {
                    schema: trackBackupCompleteSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/tracks/{id}/backup/abort",
    tags: ["Tracks"],
    summary: "Abort incomplete track backup",
    description:
        "Delete orphaned storage objects from a failed backup while the track remains LOCAL_ONLY with mixPath null. Does not delete the track row.",
    security: [...bearerSecurity],
    request: {
        params: trackIdParamsSchema,
    },
    responses: {
        200: {
            description: "Incomplete backup aborted successfully",
            content: {
                "application/json": {
                    schema: trackIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
