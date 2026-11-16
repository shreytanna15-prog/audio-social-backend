import { TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";
import { AppError } from "@/server/utils/global-error";
import type { ListFeedQuerySchema } from "./feed.validator";

export type FeedArtist = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    isFollowing: boolean;
};

export type FeedItem = {
    id: string;
    title: string;
    caption: string | null;
    durationMs: number;
    coverUrl: string | null;
    mixUrl: string | null;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    publishedAt: string | null;
    genres: string[];
    artist: FeedArtist;
};

export type FeedPage = {
    items: FeedItem[];
    nextCursor: string | null;
};

class FeedService {
    public async listFeed(
        viewerId: string,
        query: ListFeedQuerySchema
    ): Promise<FeedPage> {
        const limit = query.limit;
        let cursorFilter:
            | {
                  OR: Array<
                      | { publishedAt: { lt: Date } }
                      | { publishedAt: Date; id: { lt: string } }
                  >;
              }
            | undefined;

        if (query.cursor) {
            const cursorTrack = await prisma.track.findFirst({
                where: {
                    id: query.cursor,
                    status: TrackStatus.PUBLISHED,
                    publishedAt: { not: null },
                },
                select: { id: true, publishedAt: true },
            });

            if (!cursorTrack?.publishedAt) {
                throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
            }

            cursorFilter = {
                OR: [
                    { publishedAt: { lt: cursorTrack.publishedAt } },
                    {
                        publishedAt: cursorTrack.publishedAt,
                        id: { lt: cursorTrack.id },
                    },
                ],
            };
        }

        const rows = await prisma.track.findMany({
            where: {
                status: TrackStatus.PUBLISHED,
                publishedAt: { not: null },
                mixPath: { not: null },
                ...cursorFilter,
            },
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
                likedBy: {
                    where: { userId: viewerId },
                    select: { id: true },
                },
            },
        });

        const page = rows.slice(0, limit);
        const artistIds = [...new Set(page.map((row) => row.userId))];
        const followingRows =
            artistIds.length === 0
                ? []
                : await prisma.follow.findMany({
                      where: {
                          followerId: viewerId,
                          followingId: { in: artistIds },
                      },
                      select: { followingId: true },
                  });
        const followingSet = new Set(
            followingRows.map((row) => row.followingId)
        );

        const items = await Promise.all(
            page.map(async (row) => {
                const [mixUrl, coverUrl] = await Promise.all([
                    row.mixPath
                        ? objectStorage.createSignedDownloadUrl(row.mixPath)
                        : Promise.resolve(null),
                    row.coverPath
                        ? objectStorage.createSignedDownloadUrl(row.coverPath)
                        : Promise.resolve(null),
                ]);

                return {
                    id: row.id,
                    title: row.title,
                    caption: row.caption,
                    durationMs: row.durationMs,
                    coverUrl,
                    mixUrl,
                    likeCount: row.likeCount,
                    commentCount: row.commentCount,
                    isLiked: row.likedBy.length > 0,
                    publishedAt: row.publishedAt?.toISOString() ?? null,
                    genres: row.genres,
                    artist: {
                        id: row.user.id,
                        username: row.user.username,
                        name: row.user.name,
                        avatarUrl: publicUrl(row.user.avatarPath),
                        isFollowing: followingSet.has(row.user.id),
                    },
                } satisfies FeedItem;
            })
        );

        const nextCursor =
            rows.length > limit ? (page[page.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }
}

export const feedService = new FeedService();
