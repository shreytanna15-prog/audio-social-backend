import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";
import { AppError } from "@/server/utils/global-error";
import type {
    AdminUserNestedListQuery,
    AdminUsersListQuery,
} from "@/server/modules/admin/admin-users.validator";

export type AdminUserListItem = {
    id: string;
    email: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
    publishedTrackCount: number;
    followerCount: number;
    followingCount: number;
};

export type AdminUserDetail = {
    id: string;
    email: string;
    username: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    createdAt: string;
    counts: {
        publishedTracks: number;
        playlists: number;
        albums: number;
        feedClips: number;
        followers: number;
        following: number;
    };
};

type PageResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

async function signedCoverUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    try {
        return await objectStorage.createSignedDownloadUrl(path);
    } catch {
        return null;
    }
}

class AdminUsersService {
    public async listUsers(
        query: AdminUsersListQuery
    ): Promise<PageResult<AdminUserListItem>> {
        const { page, pageSize } = query;
        const q = query.q?.trim();
        const where = q
            ? {
                  OR: [
                      { username: { contains: q, mode: "insensitive" as const } },
                      { name: { contains: q, mode: "insensitive" as const } },
                      { email: { contains: q, mode: "insensitive" as const } },
                  ],
              }
            : {};

        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    avatarPath: true,
                    createdAt: true,
                    _count: {
                        select: {
                            tracks: { where: { status: "PUBLISHED" } },
                            followers: true,
                            following: true,
                        },
                    },
                },
            }),
        ]);

        return {
            items: users.map((user) => ({
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                avatarUrl: publicUrl(user.avatarPath),
                createdAt: user.createdAt.toISOString(),
                publishedTrackCount: user._count.tracks,
                followerCount: user._count.followers,
                followingCount: user._count.following,
            })),
            page,
            pageSize,
            total,
        };
    }

    public async getUser(userId: string): Promise<AdminUserDetail> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                bio: true,
                avatarPath: true,
                coverPath: true,
                createdAt: true,
                _count: {
                    select: {
                        tracks: { where: { status: "PUBLISHED" } },
                        playlists: true,
                        albums: true,
                        feedClips: true,
                        followers: true,
                        following: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            bio: user.bio,
            avatarUrl: publicUrl(user.avatarPath),
            coverUrl: publicUrl(user.coverPath),
            createdAt: user.createdAt.toISOString(),
            counts: {
                publishedTracks: user._count.tracks,
                playlists: user._count.playlists,
                albums: user._count.albums,
                feedClips: user._count.feedClips,
                followers: user._count.followers,
                following: user._count.following,
            },
        };
    }

    private async assertUserExists(userId: string): Promise<void> {
        const exists = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!exists) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }
    }

    public async listTracks(
        userId: string,
        query: AdminUserNestedListQuery
    ): Promise<
        PageResult<{
            id: string;
            title: string;
            coverUrl: string | null;
            publishedAt: string | null;
            playCount: number;
            likeCount: number;
        }>
    > {
        await this.assertUserExists(userId);
        const { page, pageSize } = query;
        const where = { userId, status: "PUBLISHED" as const };

        const [total, tracks] = await Promise.all([
            prisma.track.count({ where }),
            prisma.track.findMany({
                where,
                orderBy: { publishedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    coverPath: true,
                    publishedAt: true,
                    playCount: true,
                    likeCount: true,
                },
            }),
        ]);

        const items = await Promise.all(
            tracks.map(async (track) => ({
                id: track.id,
                title: track.title,
                coverUrl: await signedCoverUrl(track.coverPath),
                publishedAt: track.publishedAt?.toISOString() ?? null,
                playCount: track.playCount,
                likeCount: track.likeCount,
            }))
        );

        return { items, page, pageSize, total };
    }

    public async listPlaylists(
        userId: string,
        query: AdminUserNestedListQuery
    ): Promise<
        PageResult<{
            id: string;
            title: string;
            visibility: string;
            trackCount: number;
            updatedAt: string;
        }>
    > {
        await this.assertUserExists(userId);
        const { page, pageSize } = query;

        const [total, playlists] = await Promise.all([
            prisma.playlist.count({ where: { userId } }),
            prisma.playlist.findMany({
                where: { userId },
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    visibility: true,
                    updatedAt: true,
                    _count: { select: { tracks: true } },
                },
            }),
        ]);

        return {
            items: playlists.map((playlist) => ({
                id: playlist.id,
                title: playlist.title,
                visibility: playlist.visibility,
                trackCount: playlist._count.tracks,
                updatedAt: playlist.updatedAt.toISOString(),
            })),
            page,
            pageSize,
            total,
        };
    }

    public async listAlbums(
        userId: string,
        query: AdminUserNestedListQuery
    ): Promise<
        PageResult<{
            id: string;
            title: string;
            status: string;
            releasedAt: string | null;
            trackCount: number;
        }>
    > {
        await this.assertUserExists(userId);
        const { page, pageSize } = query;

        const [total, albums] = await Promise.all([
            prisma.album.count({ where: { userId } }),
            prisma.album.findMany({
                where: { userId },
                orderBy: { updatedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    releasedAt: true,
                    _count: { select: { tracks: true } },
                },
            }),
        ]);

        return {
            items: albums.map((album) => ({
                id: album.id,
                title: album.title,
                status: album.status,
                releasedAt: album.releasedAt?.toISOString() ?? null,
                trackCount: album._count.tracks,
            })),
            page,
            pageSize,
            total,
        };
    }

    public async listFeedClips(
        userId: string,
        query: AdminUserNestedListQuery
    ): Promise<
        PageResult<{
            id: string;
            trackId: string;
            trackTitle: string;
            durationMs: number;
            likeCount: number;
            createdAt: string;
        }>
    > {
        await this.assertUserExists(userId);
        const { page, pageSize } = query;

        const [total, clips] = await Promise.all([
            prisma.feedClip.count({ where: { userId } }),
            prisma.feedClip.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    trackId: true,
                    durationMs: true,
                    likeCount: true,
                    createdAt: true,
                    track: { select: { title: true } },
                },
            }),
        ]);

        return {
            items: clips.map((clip) => ({
                id: clip.id,
                trackId: clip.trackId,
                trackTitle: clip.track.title,
                durationMs: clip.durationMs,
                likeCount: clip.likeCount,
                createdAt: clip.createdAt.toISOString(),
            })),
            page,
            pageSize,
            total,
        };
    }
}

export const adminUsersService = new AdminUsersService();
