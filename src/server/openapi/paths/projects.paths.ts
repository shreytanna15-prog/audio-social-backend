import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    projectDetailSuccessResponseSchema,
    projectListSuccessResponseSchema,
    projectSummarySuccessResponseSchema,
    trackIdSuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    attachProjectTracksSchema,
    createProjectSchema,
    deleteProjectQuerySchema,
    updateProjectSchema,
} from "@/server/modules/project/project.validator";

const projectIdParamsSchema = z.object({
    id: z.uuid(),
});

const projectTrackParamsSchema = z.object({
    id: z.uuid(),
    trackId: z.uuid(),
});

const attachedTracksSuccessResponseSchema = registry.register(
    "AttachedTracksSuccessResponse",
    z.object({
        success: z.literal(true),
        message: z.string(),
        data: z.object({
            attached: z.array(z.uuid()),
        }),
    })
);

registry.registerPath({
    method: "get",
    path: "/api/projects",
    tags: ["Projects"],
    summary: "List projects",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Projects fetched successfully",
            content: {
                "application/json": {
                    schema: projectListSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/projects/latest",
    tags: ["Projects"],
    summary: "Get latest project",
    description:
        "Returns the viewer's most recently updated project summary, or null when they have none.",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Latest project fetched successfully",
            content: {
                "application/json": {
                    schema: projectSummarySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/projects",
    tags: ["Projects"],
    summary: "Create project",
    security: [...bearerSecurity],
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: createProjectSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Project created successfully",
            content: {
                "application/json": {
                    schema: projectSummarySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/projects/{id}",
    tags: ["Projects"],
    summary: "Get project detail",
    security: [...bearerSecurity],
    request: { params: projectIdParamsSchema },
    responses: {
        200: {
            description: "Project fetched successfully",
            content: {
                "application/json": {
                    schema: projectDetailSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/projects/{id}",
    tags: ["Projects"],
    summary: "Update project",
    security: [...bearerSecurity],
    request: {
        params: projectIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: updateProjectSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Project updated successfully",
            content: {
                "application/json": {
                    schema: projectSummarySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/projects/{id}",
    tags: ["Projects"],
    summary: "Delete project",
    security: [...bearerSecurity],
    request: {
        params: projectIdParamsSchema,
        query: deleteProjectQuerySchema,
    },
    responses: {
        200: {
            description: "Project deleted successfully",
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
    path: "/api/projects/{id}/tracks",
    tags: ["Projects"],
    summary: "Attach tracks to project",
    security: [...bearerSecurity],
    request: {
        params: projectIdParamsSchema,
        body: {
            required: true,
            content: {
                "application/json": { schema: attachProjectTracksSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Tracks attached successfully",
            content: {
                "application/json": {
                    schema: attachedTracksSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/projects/{id}/tracks/{trackId}",
    tags: ["Projects"],
    summary: "Unlink track from project",
    security: [...bearerSecurity],
    request: { params: projectTrackParamsSchema },
    responses: {
        200: {
            description: "Track unlinked successfully",
            content: {
                "application/json": {
                    schema: trackIdSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

