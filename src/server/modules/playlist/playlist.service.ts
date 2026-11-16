import {
    Prisma,
    PlaylistVisibility,
    TrackStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { objectStorage } from "@/server/lib/object-storage";
import {
    assertSamePermutation,
    COLLECTION_TRACK_INCLUDE,
    COVER_EXT_BY_TYPE,
    signedUrlOrNull,
    toCollectionTrackItem,
    viewerLikedTrackIds,
    type CollectionTrackItem,
} from "@/server/lib/collection-track";
import { buildPlaylistCoverPath } from "@/server/lib/storage-path";
import { AppError } from "@/server/utils/global-error";
import type {
    AttachPlaylistTracksSchema,
    CreatePlaylistSchema,
    PlaylistCoverCompleteSchema,
    PlaylistCoverUploadUrlSchema,
    ReorderPlaylistTracksSchema,
    UpdatePlaylistSchema,
} from "./playlist.validator";

const COLLAGE_SIZE = 4;

export const PLAYLIST_SUMMARY_INCLUDE = {
    _count: { select: { tracks: true } },
    tracks: {
        where: {
            track: {
                status: TrackStatus.PUBLISHED,
                coverPath: { not: null },
            },
        },
        orderBy: { position: "asc" },
        take: COLLAGE_SIZE,
        select: { track: { select: { coverPath: true } } },
    },
} satisfies Prisma.PlaylistInclude;

export type PlaylistSummaryRow = Prisma.PlaylistGetPayload<{
    include: typeof PLAYLIST_SUMMARY_INCLUDE;
}>;

export type PlaylistSummary = {
    id: string;
    ownerId: string;
    title: string;
    description: string | null;
    visibility: string;
    trackCount: number;
    saveCount: number;
    coverUrl: string | null;
    coverFallbackUrls: string[];
    updatedAt: string;
    createdAt: string;
};

export type PlaylistDetail = PlaylistSummary & {
    isOwner: boolean;
    isSaved: boolean;
    tracks: CollectionTrackItem[];
};

class PlaylistService {
    public async createPlaylist(
        userId: string,
        payload: CreatePlaylistSchema
    ): Promise<PlaylistSummary> {
        const playlist = await prisma.playlist.create({
            data: {
                userId,
                title: payload.title,
                description: payload.description ?? null,
                visibility: payload.visibility as PlaylistVisibility,
            },
            include: PLAYLIST_SUMMARY_INCLUDE,
        });

        return this.toSummary(playlist);
    }

    public async listPlaylists(userId: string): Promise<PlaylistSummary[]> {
        const playlists = await prisma.playlist.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: PLAYLIST_SUMMARY_INCLUDE,
        });

        return Promise.all(playlists.map((row) => this.toSummary(row)));
    }

    public async listPublicByUser(
        targetUserId: string
    ): Promise<PlaylistSummary[]> {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });

        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        const playlists = await prisma.playlist.findMany({
            where: {
                userId: targetUserId,
                visibility: PlaylistVisibility.PUBLIC,
            },
            orderBy: { updatedAt: "desc" },
            include: PLAYLIST_SUMMARY_INCLUDE,
        });

        return Promise.all(playlists.map((row) => this.toSummary(row)));
    }

    public async getPlaylist(
        viewerId: string,
        playlistId: string
    ): Promise<PlaylistDetail> {
        const playlist = await prisma.playlist.findFirst({
            where: {
                id: playlistId,
                OR: [
                    { userId: viewerId },
                    { visibility: PlaylistVisibility.PUBLIC },
                ],
            },
        });

        if (!playlist) {
            throw new AppError("Playlist not found", 404, "RESOURCE_NOT_FOUND");
        }

        const links = await prisma.playlistTrack.findMany({
            where: { playlistId },
            orderBy: { position: "asc" },
            include: COLLECTION_TRACK_INCLUDE,
        });
        const liked = await viewerLikedTrackIds(
            viewerId,
            links.map((link) => link.track.id)
        );
        const tracks = await Promise.all(
            links.map((link) =>
                toCollectionTrackItem(link, liked.has(link.track.id))
            )
        );

        const coverFallbackUrls = tracks
            .flatMap((item) =>
                item.available && item.coverUrl ? [item.coverUrl] : []
            )
            .slice(0, COLLAGE_SIZE);

        const isOwner = playlist.userId === viewerId;
        const isSaved = isOwner
            ? false
            : Boolean(
                  await prisma.savedPlaylist.findUnique({
                      where: {
                          userId_playlistId: { userId: viewerId, playlistId },
                      },
                      select: { id: true },
                  })
              );

        return {
            id: playlist.id,
            ownerId: playlist.userId,
            title: playlist.title,
            description: playlist.description,
            visibility: playlist.visibility,
            trackCount: tracks.length,
            saveCount: playlist.saveCount,
            coverUrl: await signedUrlOrNull(playlist.coverPath),
            coverFallbackUrls: playlist.coverPath ? [] : coverFallbackUrls,
            updatedAt: playlist.updatedAt.toISOString(),
            createdAt: playlist.createdAt.toISOString(),
            isOwner,
            isSaved,
            tracks,
        };
    }

    public async updatePlaylist(
        userId: string,
        playlistId: string,
        payload: UpdatePlaylistSchema
    ): Promise<PlaylistSummary> {
        await this.requireOwnedPlaylist(userId, playlistId);

        const playlist = await prisma.playlist.update({
            where: { id: playlistId },
            data: {
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
                ...(payload.visibility !== undefined
                    ? { visibility: payload.visibility as PlaylistVisibility }
                    : {}),
            },
            include: PLAYLIST_SUMMARY_INCLUDE,
        });

        return this.toSummary(playlist);
    }

    public async deletePlaylist(
        userId: string,
        playlistId: string
    ): Promise<{ id: string }> {
        const playlist = await this.requireOwnedPlaylist(userId, playlistId);

        await prisma.playlist.delete({ where: { id: playlistId } });

        if (playlist.coverPath) {
            await objectStorage.remove([playlist.coverPath]);
        }

        return { id: playlistId };
    }

    public async attachTracks(
        userId: string,
        playlistId: string,
        payload: AttachPlaylistTracksSchema
    ): Promise<{ attached: string[] }> {
        await this.requireOwnedPlaylist(userId, playlistId);

        const uniqueIds = [...new Set(payload.trackIds)];
        const tracks = await prisma.track.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, status: true },
        });

        if (tracks.length !== uniqueIds.length) {
            throw new AppError(
                "One or more tracks were not found",
                404,
                "RESOURCE_NOT_FOUND"
            );
        }

        if (tracks.some((track) => track.status !== TrackStatus.PUBLISHED)) {
            throw new AppError(
                "Only PUBLISHED tracks can be added to a playlist",
                400,
                "BAD_REQUEST"
            );
        }

        await prisma.$transaction(async (tx) => {
            const existing = await tx.playlistTrack.findMany({
                where: { playlistId },
                select: { trackId: true, position: true },
            });
            const existingSet = new Set(existing.map((row) => row.trackId));
            const toInsert = uniqueIds.filter((id) => !existingSet.has(id));

            if (toInsert.length === 0) {
                return;
            }

            const nextPosition =
                existing.reduce((max, row) => Math.max(max, row.position), -1) +
                1;

            await tx.playlistTrack.createMany({
                data: toInsert.map((trackId, index) => ({
                    playlistId,
                    trackId,
                    position: nextPosition + index,
                })),
                skipDuplicates: true,
            });
            await tx.playlist.update({
                where: { id: playlistId },
                data: { updatedAt: new Date() },
            });
        });

        return { attached: uniqueIds };
    }

    public async unlinkTrack(
        userId: string,
        playlistId: string,
        trackId: string
    ): Promise<{ id: string; trackId: string }> {
        await this.requireOwnedPlaylist(userId, playlistId);

        await prisma.$transaction(async (tx) => {
            const result = await tx.playlistTrack.deleteMany({
                where: { playlistId, trackId },
            });

            if (result.count === 0) {
                return;
            }

            const remaining = await tx.playlistTrack.findMany({
                where: { playlistId },
                orderBy: { position: "asc" },
                select: { trackId: true },
            });
            await this.writePositions(
                tx,
                playlistId,
                remaining.map((row) => row.trackId)
            );
            await tx.playlist.update({
                where: { id: playlistId },
                data: { updatedAt: new Date() },
            });
        });

        return { id: playlistId, trackId };
    }

    public async reorderTracks(
        userId: string,
        playlistId: string,
        payload: ReorderPlaylistTracksSchema
    ): Promise<{ id: string; trackIds: string[] }> {
        await this.requireOwnedPlaylist(userId, playlistId);

        await prisma.$transaction(async (tx) => {
            const current = await tx.playlistTrack.findMany({
                where: { playlistId },
                select: { trackId: true },
            });
            assertSamePermutation(
                current.map((row) => row.trackId),
                payload.trackIds
            );

            await this.writePositions(tx, playlistId, payload.trackIds);
            await tx.playlist.update({
                where: { id: playlistId },
                data: { updatedAt: new Date() },
            });
        });

        return { id: playlistId, trackIds: payload.trackIds };
    }

    public async createCoverUploadUrl(
        userId: string,
        playlistId: string,
        payload: PlaylistCoverUploadUrlSchema
    ): Promise<{ path: string; signedUrl: string; token?: string }> {
        await this.requireOwnedPlaylist(userId, playlistId);

        const extension = COVER_EXT_BY_TYPE[payload.contentType];
        if (!extension) {
            throw new AppError("Unsupported cover type", 400, "BAD_REQUEST");
        }

        const upload = await objectStorage.createSignedUploadUrl(
            buildPlaylistCoverPath(userId, playlistId, extension),
            payload.contentType
        );

        return {
            path: upload.path,
            signedUrl: upload.signedUrl,
            token: upload.token,
        };
    }

    public async completeCoverUpload(
        userId: string,
        playlistId: string,
        payload: PlaylistCoverCompleteSchema
    ): Promise<{ path: string; coverUrl: string | null }> {
        const playlist = await this.requireOwnedPlaylist(userId, playlistId);

        const expectedPrefix = buildPlaylistCoverPath(userId, playlistId, "");
        if (!payload.path.startsWith(expectedPrefix)) {
            throw new AppError("Invalid cover path", 400, "BAD_REQUEST");
        }

        const exists = await objectStorage.objectExistsAtPath(payload.path);
        if (!exists) {
            throw new AppError(
                "Uploaded cover was not found",
                400,
                "BAD_REQUEST"
            );
        }

        const previous = playlist.coverPath;
        await prisma.playlist.update({
            where: { id: playlistId },
            data: { coverPath: payload.path },
        });

        if (previous && previous !== payload.path) {
            await objectStorage.remove([previous]);
        }

        return {
            path: payload.path,
            coverUrl: await signedUrlOrNull(payload.path),
        };
    }

    public async deleteCover(
        userId: string,
        playlistId: string
    ): Promise<{ id: string }> {
        const playlist = await this.requireOwnedPlaylist(userId, playlistId);

        if (!playlist.coverPath) {
            return { id: playlistId };
        }

        const previous = playlist.coverPath;
        await prisma.playlist.update({
            where: { id: playlistId },
            data: { coverPath: null },
        });
        await objectStorage.remove([previous]);

        return { id: playlistId };
    }

    private async writePositions(
        tx: Prisma.TransactionClient,
        playlistId: string,
        orderedTrackIds: string[]
    ): Promise<void> {
        for (const [position, trackId] of orderedTrackIds.entries()) {
            await tx.playlistTrack.update({
                where: { playlistId_trackId: { playlistId, trackId } },
                data: { position },
            });
        }
    }

    private async requireOwnedPlaylist(userId: string, playlistId: string) {
        const playlist = await prisma.playlist.findFirst({
            where: { id: playlistId, userId },
        });

        if (!playlist) {
            throw new AppError("Playlist not found", 404, "RESOURCE_NOT_FOUND");
        }

        return playlist;
    }

    public async toSummary(row: PlaylistSummaryRow): Promise<PlaylistSummary> {
        const [coverUrl, coverFallbackUrls] = await Promise.all([
            signedUrlOrNull(row.coverPath),
            row.coverPath
                ? Promise.resolve([] as string[])
                : this.resolveFallbackUrls(row),
        ]);

        return {
            id: row.id,
            ownerId: row.userId,
            title: row.title,
            description: row.description,
            visibility: row.visibility,
            trackCount: row._count.tracks,
            saveCount: row.saveCount,
            coverUrl,
            coverFallbackUrls,
            updatedAt: row.updatedAt.toISOString(),
            createdAt: row.createdAt.toISOString(),
        };
    }

    private async resolveFallbackUrls(
        row: PlaylistSummaryRow
    ): Promise<string[]> {
        const urls = await Promise.all(
            row.tracks.map((link) => signedUrlOrNull(link.track.coverPath))
        );
        return urls.filter((url): url is string => url !== null);
    }
}

export const playlistService = new PlaylistService();
