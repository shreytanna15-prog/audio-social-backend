import {
    PlaylistVisibility,
    TrackStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";
import {
    PLAYLIST_SUMMARY_INCLUDE,
    playlistService,
} from "@/server/modules/playlist/playlist.service";
import type { TrendingWindow } from "./discover.validator";

const DISCOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type FeaturedArtistItem = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    followerCount: number;
    latestPublishedAt: string | null;
};

export type RisingArtistSampleTrack = {
    id: string;
    title: string;
    coverUrl: string | null;
    mixUrl: string | null;
};

export type RisingArtistItem = FeaturedArtistItem & {
    sampleTrack: RisingArtistSampleTrack | null;
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

export type DiscoverPlaylistItem = {
    id: string;
    title: string;
    coverUrl: string | null;
    coverFallbackUrls: string[];
    trackCount: number;
    saveCount: number;
    owner: {
        id: string;
        username: string;
        name: string | null;
        avatarUrl: string | null;
    };
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

    public async listRisingArtists(limit: number): Promise<RisingArtistItem[]> {
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

        const [users, followerRows, sampleTracks] = await Promise.all([
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
            prisma.track.findMany({
                where: {
                    userId: { in: userIds },
                    status: TrackStatus.PUBLISHED,
                    publishedAt: { gte: since },
                },
                orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
                select: {
                    id: true,
                    userId: true,
                    title: true,
                    coverPath: true,
                    mixPath: true,
                    publishedAt: true,
                },
            }),
        ]);

        const followerCountByUser = new Map(
            followerRows.map((row) => [row.followingId, row._count._all])
        );

        const sampleByUser = new Map<string, (typeof sampleTracks)[number]>();
        for (const track of sampleTracks) {
            if (!sampleByUser.has(track.userId)) {
                sampleByUser.set(track.userId, track);
            }
        }

        const ranked = users
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
                _sample: sampleByUser.get(user.id) ?? null,
            }))
            .sort((a, b) => {
                if (b._latestMs !== a._latestMs) {
                    return b._latestMs - a._latestMs;
                }
                return a.followerCount - b.followerCount;
            })
            .slice(0, limit);

        return Promise.all(
            ranked.map(async ({ _latestMs: _, _sample, ...item }) => {
                if (!_sample) {
                    return { ...item, sampleTrack: null };
                }

                const [coverUrl, mixUrl] = await Promise.all([
                    _sample.coverPath
                        ? objectStorage.createSignedDownloadUrl(
                              _sample.coverPath
                          )
                        : Promise.resolve(null),
                    _sample.mixPath
                        ? objectStorage.createSignedDownloadUrl(_sample.mixPath)
                        : Promise.resolve(null),
                ]);

                return {
                    ...item,
                    sampleTrack: {
                        id: _sample.id,
                        title: _sample.title,
                        coverUrl,
                        mixUrl,
                    },
                };
            })
        );
    }

    public async listTrendingTracks(
        limit: number,
        window: TrendingWindow = "30d"
    ): Promise<DiscoverTrackItem[]> {
        const since =
            window === "30d"
                ? new Date(Date.now() - DISCOVERY_WINDOW_MS)
                : undefined;

        const tracks = await prisma.track.findMany({
            where: {
                status: TrackStatus.PUBLISHED,
                ...(since ? { publishedAt: { gte: since } } : {}),
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

    public async listDiscoverPlaylists(
        limit: number
    ): Promise<DiscoverPlaylistItem[]> {
        const playlists = await prisma.playlist.findMany({
            where: { visibility: PlaylistVisibility.PUBLIC },
            orderBy: [{ saveCount: "desc" }, { updatedAt: "desc" }],
            take: limit,
            include: {
                ...PLAYLIST_SUMMARY_INCLUDE,
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

        return Promise.all(
            playlists.map(async (row) => {
                const summary = await playlistService.toSummary(row);
                return {
                    id: summary.id,
                    title: summary.title,
                    coverUrl: summary.coverUrl,
                    coverFallbackUrls: summary.coverFallbackUrls,
                    trackCount: summary.trackCount,
                    saveCount: summary.saveCount,
                    owner: {
                        id: row.user.id,
                        username: row.user.username,
                        name: row.user.name,
                        avatarUrl: publicUrl(row.user.avatarPath),
                    },
                };
            })
        );
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
