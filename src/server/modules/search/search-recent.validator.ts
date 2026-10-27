import { z } from "@/server/lib/zod";

export const recordSearchRecentSchema = z
    .object({
        kind: z.literal("ARTIST"),
        targetUserId: z.uuid("Invalid target user ID"),
        query: z.string().trim().min(1).max(100).optional(),
    })
    .openapi("RecordSearchRecent");

export type RecordSearchRecentSchema = z.infer<typeof recordSearchRecentSchema>;
