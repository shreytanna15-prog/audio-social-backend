import { AlbumStatus, PlaylistVisibility } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { AppError } from "@/server/utils/global-error";
import {
    albumService,
    ALBUM_SUMMARY_INCLUDE,
    type AlbumSummary,
} from "@/server/modules/album/album.service";
import {
    playlistService,
    PLAYLIST_SUMMARY_INCLUDE,
    type PlaylistSummary,
} from "@/server/modules/playlist/playlist.service";

export type SaveOwner = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

export type PlaylistSaveResult = {
    id: string;
    isSaved: boolean;
    saveCount: number;
};

export type AlbumSaveResult = {
    id: string;
    isSaved: boolean;
};

export type SavedPlaylistItem = {
    savedAt: string;
    available: boolean;
    playlist: Partial<PlaylistSummary> & {
        id: string;
        title: string;
        owner?: SaveOwner;
    };
};

export type SavedAlbumItem = {
    savedAt: string;
    available: boolean;
    album: Partial<AlbumSummary> & {
        id: string;
        title: string;
        owner?: SaveOwner;
    };
};

const OWNER_SELECT = {
    id: true,
    username: true,
    name: true,
    avatarPath: true,
} as const;

function toOwner(user: {
    id: string;
    username: string;
    name: string | null;
    avatarPath: string | null;
}): SaveOwner {
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: publicUrl(user.avatarPath),
    };
}

class SaveService {
    public async savePlaylist(
        viewerId: string,
        playlistId: string
    ): Promise<PlaylistSaveResult> {
        return prisma.$transaction(async (tx) => {
            const playlist = await tx.playlist.findFirst({
                where: { id: playlistId },
                select: {
                    id: true,
                    userId: true,
                    visibility: true,
                    saveCount: true,
                },
            });

            if (!playlist) {
                throw new AppError("Playlist not found", 404, "RESOURCE_NOT_FOUND");
            }

            if (playlist.userId === viewerId) {
                throw new AppError(
                    "You cannot save your own playlist",
                    400,
                    "BAD_REQUEST"
                );
            }

            if (playlist.visibility !== PlaylistVisibility.PUBLIC) {
                throw new AppError("Playlist not found", 404, "RESOURCE_NOT_FOUND");
            }

            const { count } = await tx.savedPlaylist.createMany({
                data: [{ userId: viewerId, playlistId }],
                skipDuplicates: true,
            });

            if (count === 0) {
                return {
                    id: playlistId,
                    isSaved: true,
                    saveCount: playlist.saveCount,
                };
            }

            const updated = await tx.playlist.update({
                where: { id: playlistId },
                data: { saveCount: { increment: 1 } },
                select: { saveCount: true },
            });

            return {
                id: playlistId,
                isSaved: true,
                saveCount: updated.saveCount,
            };
        });
    }

    public async unsavePlaylist(
        viewerId: string,
        playlistId: string
    ): Promise<PlaylistSaveResult> {
        return prisma.$transaction(async (tx) => {
            const playlist = await tx.playlist.findFirst({
                where: { id: playlistId },
                select: { saveCount: true },
            });

            if (!playlist) {
                throw new AppError("Playlist not found", 404, "RESOURCE_NOT_FOUND");
            }

            const { count } = await tx.savedPlaylist.deleteMany({
                where: { userId: viewerId, playlistId },
            });

            if (count === 0) {
                return {
                    id: playlistId,
                    isSaved: false,
                    saveCount: playlist.saveCount,
                };
            }

            await tx.playlist.updateMany({
                where: { id: playlistId, saveCount: { gt: 0 } },
                data: { saveCount: { decrement: 1 } },
            });
            const updated = await tx.playlist.findFirst({
                where: { id: playlistId },
                select: { saveCount: true },
            });

            return {
                id: playlistId,
                isSaved: false,
                saveCount: updated?.saveCount ?? 0,
            };
        });
    }

    public async saveAlbum(
        viewerId: string,
        albumId: string
    ): Promise<AlbumSaveResult> {
        const album = await prisma.album.findFirst({
            where: { id: albumId },
            select: { id: true, userId: true, status: true },
        });

        if (!album) {
            throw new AppError("Album not found", 404, "RESOURCE_NOT_FOUND");
        }

        if (album.userId === viewerId) {
            throw new AppError(
                "You cannot save your own album",
                400,
                "BAD_REQUEST"
            );
        }

        if (album.status !== AlbumStatus.RELEASED) {
            throw new AppError("Album not found", 404, "RESOURCE_NOT_FOUND");
        }

        await prisma.savedAlbum.createMany({
            data: [{ userId: viewerId, albumId }],
            skipDuplicates: true,
        });

        return { id: albumId, isSaved: true };
    }

    public async unsaveAlbum(
        viewerId: string,
        albumId: string
    ): Promise<AlbumSaveResult> {
        const album = await prisma.album.findFirst({
            where: { id: albumId },
            select: { id: true },
        });

        if (!album) {
            throw new AppError("Album not found", 404, "RESOURCE_NOT_FOUND");
        }

        await prisma.savedAlbum.deleteMany({
            where: { userId: viewerId, albumId },
        });

        return { id: albumId, isSaved: false };
    }

    public async listSavedPlaylists(
        viewerId: string
    ): Promise<SavedPlaylistItem[]> {
        const rows = await prisma.savedPlaylist.findMany({
            where: { userId: viewerId },
            orderBy: { savedAt: "desc" },
            include: {
                playlist: {
                    include: {
                        ...PLAYLIST_SUMMARY_INCLUDE,
                        user: { select: OWNER_SELECT },
                    },
                },
            },
        });

        return Promise.all(
            rows.map(async ({ savedAt, playlist }): Promise<SavedPlaylistItem> => {
                if (playlist.visibility !== PlaylistVisibility.PUBLIC) {
                    return {
                        savedAt: savedAt.toISOString(),
                        available: false,
                        playlist: { id: playlist.id, title: playlist.title },
                    };
                }

                return {
                    savedAt: savedAt.toISOString(),
                    available: true,
                    playlist: {
                        ...(await playlistService.toSummary(playlist)),
                        owner: toOwner(playlist.user),
                    },
                };
            })
        );
    }

    public async listSavedAlbums(viewerId: string): Promise<SavedAlbumItem[]> {
        const rows = await prisma.savedAlbum.findMany({
            where: { userId: viewerId },
            orderBy: { savedAt: "desc" },
            include: {
                album: {
                    include: {
                        ...ALBUM_SUMMARY_INCLUDE,
                        user: { select: OWNER_SELECT },
                    },
                },
            },
        });

        return Promise.all(
            rows.map(async ({ savedAt, album }): Promise<SavedAlbumItem> => {
                if (album.status !== AlbumStatus.RELEASED) {
                    return {
                        savedAt: savedAt.toISOString(),
                        available: false,
                        album: { id: album.id, title: album.title },
                    };
                }

                return {
                    savedAt: savedAt.toISOString(),
                    available: true,
                    album: {
                        ...(await albumService.toSummary(album)),
                        owner: toOwner(album.user),
                    },
                };
            })
        );
    }
}

export const saveService = new SaveService();
