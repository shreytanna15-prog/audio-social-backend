import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
} from "@/server/openapi/registry";
import {
    followActionSuccessResponseSchema,
    publicUserProfileSuccessResponseSchema,
    relationshipSuccessResponseSchema,
    userIdParamSchema,
    userSearchSuccessResponseSchema,
} from "@/server/openapi/schemas";
import { searchUsersQuerySchema } from "@/server/modules/user/user.validator";

const userIdParamsSchema = z.object({
    id: userIdParamSchema,
});

registry.registerPath({
    method: "get",
    path: "/api/users/search",
    tags: ["Users"],
    summary: "Search artists",
    description:
        "Search users by username or display name. Excludes the authenticated viewer.",
    security: [...bearerSecurity],
    request: {
        query: searchUsersQuerySchema,
    },
    responses: {
        200: {
            description: "Users fetched successfully",
            content: {
                "application/json": {
                    schema: userSearchSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/users/{id}",
    tags: ["Users"],
    summary: "Get public profile",
    description:
        "Public profile with follower/following counts and relationship flags for the viewer.",
    security: [...bearerSecurity],
    request: {
        params: userIdParamsSchema,
    },
    responses: {
        200: {
            description: "Profile fetched successfully",
            content: {
                "application/json": {
                    schema: publicUserProfileSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/users/{id}/follow",
    tags: ["Users"],
    summary: "Follow user",
    description: "Follow a user. Idempotent if already following.",
    security: [...bearerSecurity],
    request: {
        params: userIdParamsSchema,
    },
    responses: {
        200: {
            description: "Followed successfully",
            content: {
                "application/json": {
                    schema: followActionSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "delete",
    path: "/api/users/{id}/follow",
    tags: ["Users"],
    summary: "Unfollow user",
    description: "Unfollow a user. Idempotent if not following.",
    security: [...bearerSecurity],
    request: {
        params: userIdParamsSchema,
    },
    responses: {
        200: {
            description: "Unfollowed successfully",
            content: {
                "application/json": {
                    schema: followActionSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/users/{id}/relationship",
    tags: ["Users"],
    summary: "Get relationship",
    description:
        "Return isFollowing / isFollowedBy / isMutual for the viewer vs target user.",
    security: [...bearerSecurity],
    request: {
        params: userIdParamsSchema,
    },
    responses: {
        200: {
            description: "Relationship fetched successfully",
            content: {
                "application/json": {
                    schema: relationshipSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
