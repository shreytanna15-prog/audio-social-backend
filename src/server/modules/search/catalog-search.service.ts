import {
    AlbumStatus,
    PlaylistVisibility,
    TrackStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";
import type { CatalogSearchQuerySchema } from "./catalog-search.validator";

export type SearchTrackItem = {
    id: string;
    title: string;
    coverUrl: string | null;
    mixUrl: string | null;
    playCount: number;
    durationMs: number;
    artist: {
        id: string;
        username: string;
        name: string | null;
        avatarUrl: string | null;
    };
};

export type SearchPlaylistItem = {
    id: string;
    title: string;
    coverUrl: string | null;
    trackCount: number;
    owner: {
        id: string;
        username: string;
        name: string | null;
        avatarUrl: string | null;
    };
};

export type SearchAlbumItem = {
    id: string;
    title: string;
    coverUrl: string | null;
    trackCount: number;
    releasedAt: string | null;
    artist: {
        id: string;
        username: string;
        name: string | null;
        avatarUrl: string | null;
    };
};

class CatalogSearchService {
    public async searchTracks(
        query: CatalogSearchQuerySchema
    ): Promise<SearchTrackItem[]> {
        const q = query.q.trim();
        const limit = query.limit;

        const tracks = await prisma.track.findMany({
            where: {
                status: TrackStatus.PUBLISHED,
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { caption: { contains: q, mode: "insensitive" } },
                    {
                        user: {
                            OR: [
                                {
                                    username: {
                                        contains: q,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    name: {
                                        contains: q,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                ],
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

        return Promise.all(
            tracks.map(async (track) => {
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
                    durationMs: track.durationMs,
                    artist: {
                        id: track.user.id,
                        username: track.user.username,
                        name: track.user.name,
                        avatarUrl: publicUrl(track.user.avatarPath),
                    },
                };
            })
        );
    }

    public async searchPlaylists(
        query: CatalogSearchQuerySchema
    ): Promise<SearchPlaylistItem[]> {
        const q = query.q.trim();
        const limit = query.limit;

        const playlists = await prisma.playlist.findMany({
            where: {
                visibility: PlaylistVisibility.PUBLIC,
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    {
                        description: {
                            contains: q,
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            OR: [
                                {
                                    username: {
                                        contains: q,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    name: {
                                        contains: q,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
            orderBy: [{ saveCount: "desc" }, { updatedAt: "desc" }],
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
                _count: { select: { tracks: true } },
            },
        });

        return Promise.all(
            playlists.map(async (playlist) => ({
                id: playlist.id,
                title: playlist.title,
                coverUrl: playlist.coverPath
                    ? await objectStorage.createSignedDownloadUrl(
                          playlist.coverPath
                      )
                    : null,
                trackCount: playlist._count.tracks,
                owner: {
                    id: playlist.user.id,
                    username: playlist.user.username,
                    name: playlist.user.name,
                    avatarUrl: publicUrl(playlist.user.avatarPath),
                },
            }))
        );
    }

    public async searchAlbums(
        query: CatalogSearchQuerySchema
    ): Promise<SearchAlbumItem[]> {
        const q = query.q.trim();
        const limit = query.limit;

        const albums = await prisma.album.findMany({
            where: {
                status: AlbumStatus.RELEASED,
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    {
                        description: {
                            contains: q,
                            mode: "insensitive",
                        },
                    },
                    {
                        user: {
                            OR: [
                                {
                                    username: {
                                        contains: q,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    name: {
                                        contains: q,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
            orderBy: [{ releasedAt: "desc" }, { updatedAt: "desc" }],
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
                _count: { select: { tracks: true } },
            },
        });

        return Promise.all(
            albums.map(async (album) => ({
                id: album.id,
                title: album.title,
                coverUrl: album.coverPath
                    ? await objectStorage.createSignedDownloadUrl(
                          album.coverPath
                      )
                    : null,
                trackCount: album._count.tracks,
                releasedAt: album.releasedAt?.toISOString() ?? null,
                artist: {
                    id: album.user.id,
                    username: album.user.username,
                    name: album.user.name,
                    avatarUrl: publicUrl(album.user.avatarPath),
                },
            }))
        );
    }
}

export const catalogSearchService = new CatalogSearchService();
