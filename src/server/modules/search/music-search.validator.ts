import { z } from "@/server/lib/zod";

export const musicSearchQuerySchema = z
    .object({
        q: z.string().trim().min(1, "Search query is required").max(100),
        limit: z.coerce.number().int().min(1).max(30).optional().default(30),
    })
    .openapi("MusicSearchQuery");

export type MusicSearchQuerySchema = z.infer<typeof musicSearchQuerySchema>;
