import { TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";

const DISCOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type FeaturedArtistItem = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    followerCount: number;
    latestPublishedAt: string | null;
};

export type DiscoverTrackArtist = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

export type DiscoverTrackItem = {
    id: string;
    title: string;
    coverUrl: string | null;
    mixUrl: string | null;
    playCount: number;
    likeCount: number;
    publishedAt: string | null;
    genres: string[];
    artist: DiscoverTrackArtist;
};

class DiscoverService {
    public async listFeaturedArtists(
        limit: number
    ): Promise<FeaturedArtistItem[]> {
        const since = new Date(Date.now() - DISCOVERY_WINDOW_MS);

        const grouped = await prisma.track.groupBy({
            by: ["userId"],
            where: {
                status: TrackStatus.PUBLISHED,
                publishedAt: { gte: since },
            },
            _max: { publishedAt: true },
        });

        if (grouped.length === 0) {
            return [];
        }

        const userIds = grouped.map((row) => row.userId);
        const latestByUser = new Map(
            grouped.map((row) => [
                row.userId,
                row._max.publishedAt?.getTime() ?? 0,
            ])
        );

        const [users, followerRows] = await Promise.all([
            prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    username: true,
                    name: true,
                    avatarPath: true,
                },
            }),
            prisma.follow.groupBy({
                by: ["followingId"],
                where: { followingId: { in: userIds } },
                _count: { _all: true },
            }),
        ]);

        const followerCountByUser = new Map(
            followerRows.map((row) => [row.followingId, row._count._all])
        );

        return users
            .map((user) => ({
                id: user.id,
                username: user.username,
                name: user.name,
                avatarUrl: publicUrl(user.avatarPath),
                followerCount: followerCountByUser.get(user.id) ?? 0,
                latestPublishedAt: (() => {
                    const ms = latestByUser.get(user.id) ?? 0;
                    return ms > 0 ? new Date(ms).toISOString() : null;
                })(),
                _latestMs: latestByUser.get(user.id) ?? 0,
            }))
            .sort((a, b) => {
                if (b.followerCount !== a.followerCount) {
                    return b.followerCount - a.followerCount;
                }
                return b._latestMs - a._latestMs;
            })
            .slice(0, limit)
            .map(({ _latestMs: _, ...item }) => item);
    }

    public async listTrendingTracks(
        limit: number
    ): Promise<DiscoverTrackItem[]> {
        const since = new Date(Date.now() - DISCOVERY_WINDOW_MS);

        const tracks = await prisma.track.findMany({
            where: {
                status: TrackStatus.PUBLISHED,
                publishedAt: { gte: since },
            },
            orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }],
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
            },
        });

        return Promise.all(tracks.map((track) => this.toTrackItem(track)));
    }

    public async toTrackItem(track: {
        id: string;
        title: string;
        mixPath: string | null;
        coverPath: string | null;
        playCount: number;
        likeCount: number;
        publishedAt: Date | null;
        genres: string[];
        user: {
            id: string;
            username: string;
            name: string | null;
            avatarPath: string | null;
        };
    }): Promise<DiscoverTrackItem> {
        const [mixUrl, coverUrl] = await Promise.all([
            track.mixPath
                ? objectStorage.createSignedDownloadUrl(track.mixPath)
                : Promise.resolve(null),
            track.coverPath
                ? objectStorage.createSignedDownloadUrl(track.coverPath)
                : Promise.resolve(null),
        ]);

        return {
            id: track.id,
            title: track.title,
            coverUrl,
            mixUrl,
            playCount: track.playCount,
            likeCount: track.likeCount,
            publishedAt: track.publishedAt?.toISOString() ?? null,
            genres: track.genres,
            artist: {
                id: track.user.id,
                username: track.user.username,
                name: track.user.name,
                avatarUrl: publicUrl(track.user.avatarPath),
            },
        };
    }
}

export const discoverService = new DiscoverService();
