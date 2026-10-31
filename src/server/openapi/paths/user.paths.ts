import { bearerSecurity, registry, standardErrorResponses } from "@/server/openapi/registry";
import {
    meSuccessResponseSchema,
    profileMediaUploadSuccessResponseSchema,
    usernameAvailabilitySuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    patchProfileSchema,
    profileMediaCompleteSchema,
    profileMediaUploadUrlSchema,
    usernameAvailabilityQuerySchema,
} from "@/server/modules/user/profile.validator";

registry.registerPath({
    method: "get",
    path: "/api/user",
    tags: ["User"],
    summary: "Get current user",
    description:
        "Return the authenticated user's edit/bootstrap profile (me DTO).",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Profile fetched successfully",
            content: {
                "application/json": {
                    schema: meSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/user",
    tags: ["User"],
    summary: "Update current user profile",
    description:
        "Patch dirty text fields only (name, bio, username). Username changes respect the 7-day cooldown.",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: patchProfileSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Profile updated successfully",
            content: {
                "application/json": {
                    schema: meSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/user/username-availability",
    tags: ["User"],
    summary: "Check username availability",
    description:
        "Returns whether a username is available. The caller's own username counts as available.",
    security: [...bearerSecurity],
    request: {
        query: usernameAvailabilityQuerySchema,
    },
    responses: {
        200: {
            description: "Username availability checked",
            content: {
                "application/json": {
                    schema: usernameAvailabilitySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/user/avatar/upload-url",
    tags: ["User"],
    summary: "Create avatar upload URL",
    description: "Presign a PUT URL for uploading an avatar image to R2.",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: profileMediaUploadUrlSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Avatar upload URL created successfully",
            content: {
                "application/json": {
                    schema: profileMediaUploadSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/user/avatar",
    tags: ["User"],
    summary: "Complete avatar upload",
    description:
        "Verify the uploaded avatar object and set it as the current user's avatar.",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: profileMediaCompleteSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Avatar updated successfully",
            content: {
                "application/json": {
                    schema: meSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/user/avatar",
    tags: ["User"],
    summary: "Delete avatar",
    description: "Remove the current user's avatar.",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Avatar removed successfully",
            content: {
                "application/json": {
                    schema: meSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/user/cover/upload-url",
    tags: ["User"],
    summary: "Create cover upload URL",
    description: "Presign a PUT URL for uploading a cover image to R2.",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: profileMediaUploadUrlSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Cover upload URL created successfully",
            content: {
                "application/json": {
                    schema: profileMediaUploadSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/user/cover",
    tags: ["User"],
    summary: "Complete cover upload",
    description:
        "Verify the uploaded cover object and set it as the current user's cover.",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: profileMediaCompleteSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Cover updated successfully",
            content: {
                "application/json": {
                    schema: meSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/user/cover",
    tags: ["User"],
    summary: "Delete cover",
    description: "Remove the current user's cover image.",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Cover removed successfully",
            content: {
                "application/json": {
                    schema: meSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
