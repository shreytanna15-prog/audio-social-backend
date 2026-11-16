import { z } from "@/server/lib/zod";

export const recentlyPlayedQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(20, "limit must be at most 20")
            .optional()
            .default(8),
    })
    .openapi("RecentlyPlayedQuery");

export type RecentlyPlayedQuerySchema = z.infer<
    typeof recentlyPlayedQuerySchema
>;
