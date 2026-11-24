import {
    AlbumStatus,
    PlaylistVisibility,
    TrackStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { objectStorage } from "@/server/lib/object-storage";
import type { MusicSearchQuerySchema } from "./music-search.validator";

export type FirstMusicTrack = {
    id: string;
    title: string;
    mixUrl: string | null;
    coverUrl: string | null;
    artistName: string;
};

export type MusicSearchItem =
    | {
          type: "song";
          id: string;
          title: string;
          subtitle: string;
          coverUrl: string | null;
          mixUrl: string | null;
          playCount: number;
          artist: { id: string; username: string; name: string | null };
      }
    | {
          type: "playlist";
          id: string;
          title: string;
          subtitle: string;
          coverUrl: string | null;
          trackCount: number;
          saveCount: number;
          firstTrack: FirstMusicTrack | null;
      }
    | {
          type: "album";
          id: string;
          title: string;
          subtitle: string;
          coverUrl: string | null;
          trackCount: number;
          firstTrack: FirstMusicTrack | null;
      };

type RankedItem = {
    item: MusicSearchItem;
    description: string | null;
    ownerName: string;
    popularity: number;
    releasedAt?: Date | null;
};

const TYPE_ORDER = { song: 0, playlist: 1, album: 2 } as const;

export function rankMusicResults(
    candidates: RankedItem[],
    query: string,
    limit: number
): MusicSearchItem[] {
    const needle = query.trim().toLocaleLowerCase();
    const score = ({ item, description, ownerName, popularity, releasedAt }: RankedItem) => {
        const title = item.title.toLocaleLowerCase();
        const relevance =
            title === needle ? 1000 : title.startsWith(needle) ? 700 : title.includes(needle) ? 400 : 100;
        const secondary =
            ownerName.toLocaleLowerCase().includes(needle) ||
            description?.toLocaleLowerCase().includes(needle)
                ? 20
                : 0;
        const activity = Math.min(60, Math.log1p(Math.max(0, popularity)) * 6);
        const recency = releasedAt
            ? Math.min(20, Math.max(0, (releasedAt.getTime() - Date.UTC(2020, 0, 1)) / 1e10))
            : 0;
        return relevance + secondary + activity + recency;
    };

    return [...candidates]
        .sort((a, b) =>
            score(b) - score(a) ||
            TYPE_ORDER[a.item.type] - TYPE_ORDER[b.item.type] ||
            a.item.id.localeCompare(b.item.id)
        )
        .slice(0, limit)
        .map(({ item }) => item);
}

async function firstPlayableTrack(
    link: {
        track: {
            id: string;
            title: string;
            mixPath: string | null;
            coverPath: string | null;
            user: { username: string; name: string | null };
        };
    } | undefined
): Promise<FirstMusicTrack | null> {
    if (!link?.track.mixPath) return null;
    const { track } = link;
    const mixPath = track.mixPath;
    if (!mixPath) return null;
    const [mixUrl, coverUrl] = await Promise.all([
        objectStorage.createSignedDownloadUrl(mixPath),
        track.coverPath
            ? objectStorage.createSignedDownloadUrl(track.coverPath)
            : Promise.resolve(null),
    ]);
    return {
        id: track.id,
        title: track.title,
        mixUrl,
        coverUrl,
        artistName: track.user.name?.trim() || track.user.username,
    };
}

const playableTrack = {
    where: { track: { status: TrackStatus.PUBLISHED, mixPath: { not: null } } },
    orderBy: { position: "asc" as const },
    take: 1,
    include: { track: { include: { user: { select: { username: true, name: true } } } } },
};

class MusicSearchService {
    public async search(query: MusicSearchQuerySchema): Promise<MusicSearchItem[]> {
        const q = query.q.trim();
        const take = Math.min(10, query.limit);
        const [songs, playlists, albums] = await Promise.all([
            prisma.track.findMany({
                where: {
                    status: TrackStatus.PUBLISHED,
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { caption: { contains: q, mode: "insensitive" } },
                        { user: { OR: [
                            { username: { contains: q, mode: "insensitive" } },
                            { name: { contains: q, mode: "insensitive" } },
                        ] } },
                    ],
                },
                orderBy: [{ playCount: "desc" }, { publishedAt: "desc" }],
                take,
                include: { user: { select: { id: true, username: true, name: true } } },
            }),
            prisma.playlist.findMany({
                where: {
                    visibility: PlaylistVisibility.PUBLIC,
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                        { user: { OR: [
                            { username: { contains: q, mode: "insensitive" } },
                            { name: { contains: q, mode: "insensitive" } },
                        ] } },
                    ],
                },
                orderBy: [{ saveCount: "desc" }, { updatedAt: "desc" }],
                take,
                include: {
                    user: { select: { username: true, name: true } },
                    _count: { select: { tracks: true } },
                    tracks: playableTrack,
                },
            }),
            prisma.album.findMany({
                where: {
                    status: AlbumStatus.RELEASED,
                    OR: [
                        { title: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                        { user: { OR: [
                            { username: { contains: q, mode: "insensitive" } },
                            { name: { contains: q, mode: "insensitive" } },
                        ] } },
                    ],
                },
                orderBy: [{ releasedAt: "desc" }, { updatedAt: "desc" }],
                take,
                include: {
                    user: { select: { username: true, name: true } },
                    _count: { select: { tracks: true } },
                    tracks: playableTrack,
                },
            }),
        ]);

        const candidates = await Promise.all([
            ...songs.map(async (song): Promise<RankedItem> => ({
                item: {
                    type: "song",
                    id: song.id,
                    title: song.title,
                    subtitle: song.user.name?.trim() || song.user.username,
                    coverUrl: song.coverPath
                        ? await objectStorage.createSignedDownloadUrl(song.coverPath)
                        : null,
                    mixUrl: song.mixPath
                        ? await objectStorage.createSignedDownloadUrl(song.mixPath)
                        : null,
                    playCount: song.playCount,
                    artist: song.user,
                },
                description: song.caption,
                ownerName: `${song.user.name ?? ""} ${song.user.username}`,
                popularity: song.playCount,
            })),
            ...playlists.map(async (playlist): Promise<RankedItem> => {
                const firstTrack = await firstPlayableTrack(playlist.tracks[0]);
                return {
                    item: {
                        type: "playlist",
                        id: playlist.id,
                        title: playlist.title,
                        subtitle: playlist.user.name?.trim() || playlist.user.username,
                        coverUrl: playlist.coverPath
                            ? await objectStorage.createSignedDownloadUrl(playlist.coverPath)
                            : firstTrack?.coverUrl ?? null,
                        trackCount: playlist._count.tracks,
                        saveCount: playlist.saveCount,
                        firstTrack,
                    },
                    description: playlist.description,
                    ownerName: `${playlist.user.name ?? ""} ${playlist.user.username}`,
                    popularity: playlist.saveCount,
                };
            }),
            ...albums.map(async (album): Promise<RankedItem> => {
                const firstTrack = await firstPlayableTrack(album.tracks[0]);
                return {
                    item: {
                        type: "album",
                        id: album.id,
                        title: album.title,
                        subtitle: album.user.name?.trim() || album.user.username,
                        coverUrl: album.coverPath
                            ? await objectStorage.createSignedDownloadUrl(album.coverPath)
                            : firstTrack?.coverUrl ?? null,
                        trackCount: album._count.tracks,
                        firstTrack,
                    },
                    description: album.description,
                    ownerName: `${album.user.name ?? ""} ${album.user.username}`,
                    popularity: 0,
                    releasedAt: album.releasedAt,
                };
            }),
        ]);
        return rankMusicResults(candidates, q, query.limit);
    }
}

export const musicSearchService = new MusicSearchService();
