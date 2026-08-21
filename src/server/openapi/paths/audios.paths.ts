import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    audioDetailSuccessResponseSchema,
    audioIdParamSchema,
    audioIdSuccessResponseSchema,
    audioListSuccessResponseSchema,
    createUploadUrlsSuccessResponseSchema,
    playbackUploadUrlSuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    createAudioSchema,
    listAudiosQuerySchema,
    updateAudioSchema,
} from "@/server/modules/audio/audio.validator";

const audioIdParamsSchema = z.object({
    id: audioIdParamSchema,
});

registry.registerPath({
    method: "get",
    path: "/api/audios",
    tags: ["Audios"],
    summary: "List audios",
    description: "List the authenticated user's audios, optionally filtered by status.",
    security: [...bearerSecurity],
    request: {
        query: listAudiosQuerySchema,
    },
    responses: {
        200: {
            description: "Audios fetched successfully",
            content: {
                "application/json": {
                    schema: audioListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/audios",
    tags: ["Audios"],
    summary: "Create audio",
    description:
        "Create an audio record after both playback and source files have been uploaded.",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: createAudioSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Audio created successfully",
            content: {
                "application/json": {
                    schema: audioIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/audios/{id}",
    tags: ["Audios"],
    summary: "Get audio",
    description: "Fetch a single audio by id.",
    security: [...bearerSecurity],
    request: {
        params: audioIdParamsSchema,
    },
    responses: {
        200: {
            description: "Audio fetched successfully",
            content: {
                "application/json": {
                    schema: audioDetailSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/audios/{id}",
    tags: ["Audios"],
    summary: "Update audio",
    description: "Update title, duration, and/or applied effects.",
    security: [...bearerSecurity],
    request: {
        params: audioIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: updateAudioSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Audio updated successfully",
            content: {
                "application/json": {
                    schema: audioDetailSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/audios/{id}",
    tags: ["Audios"],
    summary: "Delete audio",
    description: "Delete an audio record and its storage files.",
    security: [...bearerSecurity],
    request: {
        params: audioIdParamsSchema,
    },
    responses: {
        200: {
            description: "Audio deleted successfully",
            content: {
                "application/json": {
                    schema: audioIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/audios/upload-urls",
    tags: ["Audios"],
    summary: "Create upload URLs",
    description:
        "Create signed upload URLs for playback and source files for a new audio.",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Upload URLs created successfully",
            content: {
                "application/json": {
                    schema: createUploadUrlsSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/audios/{id}/upload-url",
    tags: ["Audios"],
    summary: "Create playback upload URL",
    description: "Create a signed upload URL to replace the playback file.",
    security: [...bearerSecurity],
    request: {
        params: audioIdParamsSchema,
    },
    responses: {
        200: {
            description: "Playback upload URL created successfully",
            content: {
                "application/json": {
                    schema: playbackUploadUrlSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
