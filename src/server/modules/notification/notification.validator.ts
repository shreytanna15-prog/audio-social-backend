import { z } from "@/server/lib/zod";

export const listNotificationsQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .default(30),
    })
    .openapi("ListNotificationsQuery");

export type ListNotificationsQuerySchema = z.infer<
    typeof listNotificationsQuerySchema
>;

export const markNotificationsReadSchema = z
    .object({
        /** Omit or empty → mark all unread as read */
        ids: z.array(z.uuid("Invalid notification ID")).optional(),
    })
    .openapi("MarkNotificationsReadBody");

export type MarkNotificationsReadSchema = z.infer<
    typeof markNotificationsReadSchema
>;
