import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import { z } from "@/server/lib/zod";
import { adminLoginSchema } from "@/server/modules/admin/admin-auth.validator";
import { adminGrowthQuerySchema } from "@/server/modules/admin/admin-metrics.validator";
import {
    adminUserNestedListQuerySchema,
    adminUsersListQuerySchema,
} from "@/server/modules/admin/admin-users.validator";

const adminProfileSchema = z
    .object({
        id: z.uuid(),
        email: z.email(),
        name: z.string().nullable(),
        createdAt: z.iso.datetime().optional(),
    })
    .openapi("AdminProfileResponse");

const adminLoginDataSchema = z
    .object({
        accessToken: z.string(),
        admin: z.object({
            id: z.uuid(),
            email: z.email(),
            name: z.string().nullable(),
        }),
    })
    .openapi("AdminLoginData");

const growthPointSchema = z.object({
    date: z.string(),
    usersCreated: z.number().int().nonnegative(),
    tracksPublished: z.number().int().nonnegative(),
});

const growthDataSchema = z
    .object({
        range: z.enum(["7d", "30d"]),
        series: z.array(growthPointSchema),
        totals: z.object({
            totalUsers: z.number().int().nonnegative(),
            totalPublishedTracks: z.number().int().nonnegative(),
        }),
    })
    .openapi("AdminGrowthData");

const adminUserListItemSchema = z
    .object({
        id: z.uuid(),
        email: z.email(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        createdAt: z.iso.datetime(),
        publishedTrackCount: z.number().int().nonnegative(),
        followerCount: z.number().int().nonnegative(),
        followingCount: z.number().int().nonnegative(),
    })
    .openapi("AdminUserListItem");

const paginatedUsersSchema = z
    .object({
        items: z.array(adminUserListItemSchema),
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
        total: z.number().int().nonnegative(),
    })
    .openapi("AdminUsersListData");

const adminUserDetailSchema = z
    .object({
        id: z.uuid(),
        email: z.email(),
        username: z.string(),
        name: z.string().nullable(),
        bio: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        coverUrl: z.string().nullable(),
        createdAt: z.iso.datetime(),
        counts: z.object({
            publishedTracks: z.number().int().nonnegative(),
            playlists: z.number().int().nonnegative(),
            albums: z.number().int().nonnegative(),
            feedClips: z.number().int().nonnegative(),
            followers: z.number().int().nonnegative(),
            following: z.number().int().nonnegative(),
        }),
    })
    .openapi("AdminUserDetail");

registry.registerPath({
    method: "post",
    path: "/api/admin/auth/login",
    tags: ["Admin Auth"],
    summary: "Admin login",
    description:
        "Authenticate a Super Admin. Sets an HttpOnly cookie and returns accessToken for Postman.",
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: adminLoginSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Admin authenticated",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        adminLoginDataSchema,
                        "AdminLoginSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/admin/auth/me",
    tags: ["Admin Auth"],
    summary: "Current admin profile",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Admin profile",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        adminProfileSchema,
                        "AdminMeSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/admin/auth/logout",
    tags: ["Admin Auth"],
    summary: "Admin logout",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Logged out",
            content: {
                "application/json": {
                    schema: successResponseSchema(z.null(), "AdminLogoutSuccess"),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/admin/metrics/growth",
    tags: ["Admin Metrics"],
    summary: "Growth metrics",
    security: [...bearerSecurity],
    request: {
        query: adminGrowthQuerySchema,
    },
    responses: {
        200: {
            description: "Growth series",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        growthDataSchema,
                        "AdminGrowthSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/admin/users",
    tags: ["Admin Users"],
    summary: "List users",
    security: [...bearerSecurity],
    request: {
        query: adminUsersListQuerySchema,
    },
    responses: {
        200: {
            description: "Paginated users",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        paginatedUsersSchema,
                        "AdminUsersListSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/admin/users/{id}",
    tags: ["Admin Users"],
    summary: "User detail",
    security: [...bearerSecurity],
    request: {
        params: z.object({ id: z.uuid() }),
    },
    responses: {
        200: {
            description: "User detail",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        adminUserDetailSchema,
                        "AdminUserDetailSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

for (const resource of [
    "tracks",
    "playlists",
    "albums",
    "feed-clips",
] as const) {
    registry.registerPath({
        method: "get",
        path: `/api/admin/users/{id}/${resource}`,
        tags: ["Admin Users"],
        summary: `User ${resource}`,
        security: [...bearerSecurity],
        request: {
            params: z.object({ id: z.uuid() }),
            query: adminUserNestedListQuerySchema,
        },
        responses: {
            200: {
                description: `Paginated ${resource}`,
                content: {
                    "application/json": {
                        schema: successResponseSchema(
                            z.object({
                                items: z.array(z.record(z.string(), z.unknown())),
                                page: z.number().int().positive(),
                                pageSize: z.number().int().positive(),
                                total: z.number().int().nonnegative(),
                            }),
                            `AdminUser${resource}Success`
                        ),
                    },
                },
            },
            ...standardErrorResponses,
        },
    });
}
