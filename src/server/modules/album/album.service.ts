import { AlbumStatus, Prisma, TrackStatus } from "@/generated/prisma/client";
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
import { buildAlbumCoverPath } from "@/server/lib/storage-path";
import { AppError } from "@/server/utils/global-error";
import type {
    AlbumCoverCompleteSchema,
    AlbumCoverUploadUrlSchema,
    AttachAlbumTracksSchema,
    CreateAlbumSchema,
    ReorderAlbumTracksSchema,
    UpdateAlbumSchema,
} from "./album.validator";

export const ALBUM_SUMMARY_INCLUDE = {
    _count: { select: { tracks: true } },
    tracks: {
        where: {
            track: {
                status: TrackStatus.PUBLISHED,
                coverPath: { not: null },
            },
        },
        orderBy: { position: "asc" },
        take: 1,
        select: { track: { select: { coverPath: true } } },
    },
} satisfies Prisma.AlbumInclude;

export type AlbumSummaryRow = Prisma.AlbumGetPayload<{
    include: typeof ALBUM_SUMMARY_INCLUDE;
}>;

export type AlbumSummary = {
    id: string;
    ownerId: string;
    title: string;
    description: string | null;
    status: string;
    releasedAt: string | null;
    trackCount: number;
    coverUrl: string | null;
    coverFallbackUrl: string | null;
    updatedAt: string;
    createdAt: string;
};

export type AlbumDetail = AlbumSummary & {
    isOwner: boolean;
    isSaved: boolean;
    tracks: CollectionTrackItem[];
};

class AlbumService {
    public async createAlbum(
        userId: string,
        payload: CreateAlbumSchema
    ): Promise<AlbumSummary> {
        const album = await prisma.album.create({
            data: {
                userId,
                title: payload.title,
                description: payload.description ?? null,
                status: AlbumStatus.DRAFT,
            },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        return this.toSummary(album);
    }

    public async listAlbums(userId: string): Promise<AlbumSummary[]> {
        const albums = await prisma.album.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        return Promise.all(albums.map((row) => this.toSummary(row)));
    }

    public async listReleasedByUser(
        targetUserId: string
    ): Promise<AlbumSummary[]> {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { id: true },
        });

        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        const albums = await prisma.album.findMany({
            where: { userId: targetUserId, status: AlbumStatus.RELEASED },
            orderBy: { releasedAt: "desc" },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        return Promise.all(albums.map((row) => this.toSummary(row)));
    }

    public async getAlbum(
        viewerId: string,
        albumId: string
    ): Promise<AlbumDetail> {
        const album = await prisma.album.findFirst({
            where: {
                id: albumId,
                OR: [
                    { userId: viewerId },
                    { status: AlbumStatus.RELEASED },
                ],
            },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        if (!album) {
            throw new AppError("Album not found", 404, "RESOURCE_NOT_FOUND");
        }

        const links = await prisma.albumTrack.findMany({
            where: { albumId },
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
        const summary = await this.toSummary(album);
        const isOwner = album.userId === viewerId;
        const isSaved = isOwner
            ? false
            : Boolean(
                  await prisma.savedAlbum.findUnique({
                      where: { userId_albumId: { userId: viewerId, albumId } },
                      select: { id: true },
                  })
              );

        return {
            ...summary,
            trackCount: tracks.length,
            isOwner,
            isSaved,
            tracks,
        };
    }

    public async updateAlbum(
        userId: string,
        albumId: string,
        payload: UpdateAlbumSchema
    ): Promise<AlbumSummary> {
        await this.requireOwnedAlbum(userId, albumId);

        const album = await prisma.album.update({
            where: { id: albumId },
            data: {
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
            },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        return this.toSummary(album);
    }

    public async deleteAlbum(
        userId: string,
        albumId: string
    ): Promise<{ id: string }> {
        const album = await this.requireOwnedAlbum(userId, albumId);

        await prisma.album.delete({ where: { id: albumId } });

        if (album.coverPath) {
            await objectStorage.remove([album.coverPath]);
        }

        return { id: albumId };
    }

    public async releaseAlbum(
        userId: string,
        albumId: string
    ): Promise<AlbumSummary> {
        const album = await this.requireOwnedAlbum(userId, albumId);

        if (album.status === AlbumStatus.RELEASED) {
            return this.toSummary(album);
        }

        const trackCount = await prisma.albumTrack.count({
            where: { albumId },
        });
        if (trackCount === 0) {
            throw new AppError(
                "Add at least one track before releasing the album",
                400,
                "BAD_REQUEST"
            );
        }

        const released = await prisma.album.update({
            where: { id: albumId },
            data: {
                status: AlbumStatus.RELEASED,
                releasedAt: album.releasedAt ?? new Date(),
            },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        return this.toSummary(released);
    }

    public async unreleaseAlbum(
        userId: string,
        albumId: string
    ): Promise<AlbumSummary> {
        const album = await this.requireOwnedAlbum(userId, albumId);

        if (album.status === AlbumStatus.DRAFT) {
            return this.toSummary(album);
        }

        const draft = await prisma.album.update({
            where: { id: albumId },
            data: { status: AlbumStatus.DRAFT },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        return this.toSummary(draft);
    }

    public async attachTracks(
        userId: string,
        albumId: string,
        payload: AttachAlbumTracksSchema
    ): Promise<{ attached: string[] }> {
        await this.requireOwnedAlbum(userId, albumId);

        const uniqueIds = [...new Set(payload.trackIds)];
        const tracks = await prisma.track.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true, userId: true, status: true },
        });

        if (
            tracks.length !== uniqueIds.length ||
            tracks.some((track) => track.userId !== userId)
        ) {
            throw new AppError(
                "One or more tracks were not found",
                404,
                "RESOURCE_NOT_FOUND"
            );
        }

        if (tracks.some((track) => track.status !== TrackStatus.PUBLISHED)) {
            throw new AppError(
                "Only PUBLISHED tracks can be added to an album",
                400,
                "BAD_REQUEST"
            );
        }

        try {
            await prisma.$transaction(async (tx) => {
                const linked = await tx.albumTrack.findMany({
                    where: { trackId: { in: uniqueIds } },
                    select: { trackId: true, albumId: true },
                });

                if (linked.some((row) => row.albumId !== albumId)) {
                    throw new AppError(
                        "One or more tracks already belong to another album",
                        409,
                        "CONFLICT"
                    );
                }

                const linkedSet = new Set(linked.map((row) => row.trackId));
                const toInsert = uniqueIds.filter((id) => !linkedSet.has(id));

                if (toInsert.length === 0) {
                    return;
                }

                const members = await tx.albumTrack.findMany({
                    where: { albumId },
                    select: { position: true },
                });
                const nextPosition =
                    members.reduce(
                        (max, row) => Math.max(max, row.position),
                        -1
                    ) + 1;

                await tx.albumTrack.createMany({
                    data: toInsert.map((trackId, index) => ({
                        albumId,
                        trackId,
                        position: nextPosition + index,
                    })),
                });
                await tx.album.update({
                    where: { id: albumId },
                    data: { updatedAt: new Date() },
                });
            });
        } catch (error) {
            // concurrent attach to another album trips the global trackId unique
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new AppError(
                    "One or more tracks already belong to another album",
                    409,
                    "CONFLICT"
                );
            }
            throw error;
        }

        return { attached: uniqueIds };
    }

    public async unlinkTrack(
        userId: string,
        albumId: string,
        trackId: string
    ): Promise<{ id: string; trackId: string }> {
        await this.requireOwnedAlbum(userId, albumId);

        await prisma.$transaction(async (tx) => {
            const result = await tx.albumTrack.deleteMany({
                where: { albumId, trackId },
            });

            if (result.count === 0) {
                return;
            }

            const remaining = await tx.albumTrack.findMany({
                where: { albumId },
                orderBy: { position: "asc" },
                select: { trackId: true },
            });
            await this.writePositions(
                tx,
                albumId,
                remaining.map((row) => row.trackId)
            );
            await tx.album.update({
                where: { id: albumId },
                data: { updatedAt: new Date() },
            });
        });

        return { id: albumId, trackId };
    }

    public async reorderTracks(
        userId: string,
        albumId: string,
        payload: ReorderAlbumTracksSchema
    ): Promise<{ id: string; trackIds: string[] }> {
        await this.requireOwnedAlbum(userId, albumId);

        await prisma.$transaction(async (tx) => {
            const current = await tx.albumTrack.findMany({
                where: { albumId },
                select: { trackId: true },
            });
            assertSamePermutation(
                current.map((row) => row.trackId),
                payload.trackIds
            );

            await this.writePositions(tx, albumId, payload.trackIds);
            await tx.album.update({
                where: { id: albumId },
                data: { updatedAt: new Date() },
            });
        });

        return { id: albumId, trackIds: payload.trackIds };
    }

    public async createCoverUploadUrl(
        userId: string,
        albumId: string,
        payload: AlbumCoverUploadUrlSchema
    ): Promise<{ path: string; signedUrl: string; token?: string }> {
        await this.requireOwnedAlbum(userId, albumId);

        const extension = COVER_EXT_BY_TYPE[payload.contentType];
        if (!extension) {
            throw new AppError("Unsupported cover type", 400, "BAD_REQUEST");
        }

        const upload = await objectStorage.createSignedUploadUrl(
            buildAlbumCoverPath(userId, albumId, extension),
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
        albumId: string,
        payload: AlbumCoverCompleteSchema
    ): Promise<{ path: string; coverUrl: string | null }> {
        const album = await this.requireOwnedAlbum(userId, albumId);

        const expectedPrefix = buildAlbumCoverPath(userId, albumId, "");
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

        const previous = album.coverPath;
        await prisma.album.update({
            where: { id: albumId },
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
        albumId: string
    ): Promise<{ id: string }> {
        const album = await this.requireOwnedAlbum(userId, albumId);

        if (!album.coverPath) {
            return { id: albumId };
        }

        const previous = album.coverPath;
        await prisma.album.update({
            where: { id: albumId },
            data: { coverPath: null },
        });
        await objectStorage.remove([previous]);

        return { id: albumId };
    }

    private async writePositions(
        tx: Prisma.TransactionClient,
        albumId: string,
        orderedTrackIds: string[]
    ): Promise<void> {
        for (const [position, trackId] of orderedTrackIds.entries()) {
            await tx.albumTrack.update({
                where: { albumId_trackId: { albumId, trackId } },
                data: { position },
            });
        }
    }

    private async requireOwnedAlbum(userId: string, albumId: string) {
        const album = await prisma.album.findFirst({
            where: { id: albumId, userId },
            include: ALBUM_SUMMARY_INCLUDE,
        });

        if (!album) {
            throw new AppError("Album not found", 404, "RESOURCE_NOT_FOUND");
        }

        return album;
    }

    public async toSummary(row: AlbumSummaryRow): Promise<AlbumSummary> {
        const firstTrackCoverPath = row.tracks[0]?.track.coverPath ?? null;
        const [coverUrl, coverFallbackUrl] = await Promise.all([
            signedUrlOrNull(row.coverPath),
            row.coverPath
                ? Promise.resolve(null)
                : signedUrlOrNull(firstTrackCoverPath),
        ]);

        return {
            id: row.id,
            ownerId: row.userId,
            title: row.title,
            description: row.description,
            status: row.status,
            releasedAt: row.releasedAt?.toISOString() ?? null,
            trackCount: row._count.tracks,
            coverUrl,
            coverFallbackUrl,
            updatedAt: row.updatedAt.toISOString(),
            createdAt: row.createdAt.toISOString(),
        };
    }
}

export const albumService = new AlbumService();
