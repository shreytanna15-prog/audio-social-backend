import { z } from "@/server/lib/zod";

export const catalogSearchQuerySchema = z
    .object({
        q: z.string().trim().min(1, "Search query is required"),
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(20, "limit must be at most 20")
            .optional()
            .default(20),
    })
    .openapi("CatalogSearchQuery");

export type CatalogSearchQuerySchema = z.infer<typeof catalogSearchQuerySchema>;
