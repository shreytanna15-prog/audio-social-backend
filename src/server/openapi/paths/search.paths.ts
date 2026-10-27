import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    clearSearchRecentSuccessResponseSchema,
    searchRecentListSuccessResponseSchema,
} from "@/server/openapi/schemas";
import { recordSearchRecentSchema } from "@/server/modules/search/search-recent.validator";

registry.registerPath({
    method: "get",
    path: "/api/search/recent",
    tags: ["Search"],
    summary: "List recent searches",
    description:
        "List the viewer's recent searches (artists, songs, albums, playlists; max 20).",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Recent searches fetched successfully",
            content: {
                "application/json": {
                    schema: searchRecentListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/search/recent",
    tags: ["Search"],
    summary: "Record recent search",
    description:
        "Upsert a recent search (artist or media) and trim to the last 20 entries.",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: recordSearchRecentSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Recent search recorded successfully",
            content: {
                "application/json": {
                    schema: searchRecentListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/search/recent",
    tags: ["Search"],
    summary: "Clear recent searches",
    description: "Delete all recent searches for the authenticated user.",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Recent searches cleared successfully",
            content: {
                "application/json": {
                    schema: clearSearchRecentSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/search/recent/{id}",
    tags: ["Search"],
    summary: "Remove one recent search",
    description: "Delete a single recent search entry owned by the viewer.",
    security: [...bearerSecurity],
    request: {
        params: z.object({
            id: z.uuid(),
        }),
    },
    responses: {
        200: {
            description: "Recent search removed successfully",
            content: {
                "application/json": {
                    schema: searchRecentListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
