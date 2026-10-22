import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    createTrackUploadUrlsSuccessResponseSchema,
    trackDetailSuccessResponseSchema,
    trackIdParamSchema,
    trackIdSuccessResponseSchema,
    trackListSuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    createTrackSchema,
    createUploadUrlsSchema,
    listTracksQuerySchema,
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
        "Create a signed upload URL for a new SINGLE track mix (stem/source optional later).",
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
    summary: "Create track",
    description:
        "Create a DRAFT SINGLE track after the mix file has been uploaded (stem defaults to mix).",
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
