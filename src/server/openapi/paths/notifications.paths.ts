import { z } from "@/server/lib/zod";
import {
    listNotificationsQuerySchema,
    markNotificationsReadSchema,
} from "@/server/modules/notification/notification.validator";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";

const notificationTypeSchema = z
    .enum(["FOLLOW", "LIKE", "COMMENT"])
    .openapi("NotificationType");

const notificationActorSchema = registry.register(
    "NotificationActor",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
    })
);

const notificationTrackSchema = registry.register(
    "NotificationTrack",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.url().nullable(),
    })
);

const notificationItemSchema = registry.register(
    "NotificationItem",
    z.object({
        id: z.uuid(),
        type: notificationTypeSchema,
        createdAt: z.iso.datetime(),
        readAt: z.iso.datetime().nullable(),
        actor: notificationActorSchema,
        track: notificationTrackSchema.nullable(),
    })
);

const notificationPageSchema = registry.register(
    "NotificationPage",
    z.object({
        items: z.array(notificationItemSchema),
        nextCursor: z.uuid().nullable(),
    })
);

const unreadCountSchema = registry.register(
    "UnreadNotificationCount",
    z.object({
        count: z.number().int().nonnegative(),
    })
);

const markReadResultSchema = registry.register(
    "MarkNotificationsReadResult",
    z.object({
        markedCount: z.number().int().nonnegative(),
    })
);

registry.registerPath({
    method: "get",
    path: "/api/notifications",
    tags: ["Notifications"],
    summary: "List notifications",
    description: "Cursor-paginated inbox for the authenticated user.",
    security: bearerSecurity,
    request: { query: listNotificationsQuerySchema },
    responses: {
        200: {
            description: "Notifications fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        notificationPageSchema,
                        "NotificationsSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/notifications/unread-count",
    tags: ["Notifications"],
    summary: "Unread notification count",
    description:
        "Badge count. Also available as `unreadNotificationCount` on GET /api/user.",
    security: bearerSecurity,
    responses: {
        200: {
            description: "Unread count fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        unreadCountSchema,
                        "UnreadNotificationCountSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/notifications/read",
    tags: ["Notifications"],
    summary: "Mark notifications read",
    description:
        "Mark specific ids, or omit/empty `ids` to mark all unread as read.",
    security: bearerSecurity,
    request: {
        body: {
            required: true,
            content: {
                "application/json": { schema: markNotificationsReadSchema },
            },
        },
    },
    responses: {
        200: {
            description: "Notifications marked as read",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        markReadResultSchema,
                        "MarkNotificationsReadSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});
