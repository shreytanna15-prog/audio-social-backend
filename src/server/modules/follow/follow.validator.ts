import { z } from "@/server/lib/zod";

export const followListQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(50, "limit must be at most 50")
            .optional()
            .default(20),
        cursor: z.uuid("Invalid cursor").optional(),
    })
    .openapi("FollowListQuery");

export type FollowListQuerySchema = z.infer<typeof followListQuerySchema>;
