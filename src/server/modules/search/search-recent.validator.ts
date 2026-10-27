import { z } from "@/server/lib/zod";

const optionalQuery = z.string().trim().min(1).max(100).optional();

const artistRecentSchema = z.object({
    kind: z.literal("ARTIST"),
    targetUserId: z.uuid("Invalid target user ID"),
    query: optionalQuery,
});

const mediaRecentSchema = z.object({
    kind: z.enum(["SONG", "ALBUM", "PLAYLIST"]),
    targetId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(200),
    subtitle: z.string().trim().min(1).max(200).optional(),
    coverUrl: z.string().trim().min(1).max(2048).optional(),
    query: optionalQuery,
});

export const recordSearchRecentSchema = z
    .discriminatedUnion("kind", [artistRecentSchema, mediaRecentSchema])
    .openapi("RecordSearchRecent");

export type RecordSearchRecentSchema = z.infer<typeof recordSearchRecentSchema>;
