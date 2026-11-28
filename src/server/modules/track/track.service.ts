import { v7 as uuidv7 } from "uuid";
import {
    Prisma,
    Track,
    TrackKind,
    TrackLayer,
    TrackStatus,
    TrackStorageState,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { supabase } from "@/server/config/supabase";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import { objectStorage } from "@/server/lib/object-storage";
import {
    buildCoverPath,
    buildLayerPrefix,
    buildMixPath,
    buildSourcePath,
    buildStemPath,
    buildTrackPrefix,
} from "@/server/lib/storage-path";
import { followService } from "@/server/modules/follow/follow.service";
import { AppError } from "@/server/utils/global-error";
import type {
    CreateTrackSchema,
    CreateUploadUrlsSchema,
    ListTracksQuerySchema,
    PublishTrackSchema,
    TrackCoverCompleteSchema,
    TrackCoverUploadUrlSchema,
    TrackLayerBodySchema,
    UpdateTrackSchema,
} from "./track.validator";

const COVER_EXT_BY_TYPE: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

const PLAY_DEDUP_MS = 5 * 60 * 1000;

type SignedUpload = {
    path: string;
    signedUrl: string;
    token: string;
};

type LayerSignedUpload = { layerId: string; upload: SignedUpload };

type CreateUploadUrlsResponse = {
    trackId: string;
    uploads: {
        mix: SignedUpload;
        stems: LayerSignedUpload[];
        sources: LayerSignedUpload[];
    };
};

export type TrackListItem = {
    id: string;
    kind: string;
    status: string;
    storageState: string;
    title: string;
    durationMs: number;
    mixUrl: string | null;
    coverUrl: string | null;
    playCount: number;
    likeCount: number;
    isLiked: boolean;
    /** Present when the owner has an active FeedClip for this track. */
    feedClipId: string | null;
    publishedAt: string | null;
    createdAt: string;
};

export type PublishedTrackItem = {
    id: string;
    kind: string;
    title: string;
    caption: string | null;
    description: string | null;
    genres: string[];
    keywords: string[];
    durationMs: number;
    mixUrl: string | null;
    coverUrl: string | null;
    playCount: number;
    likeCount: number;
    isLiked: boolean;
    commentCount: number;
    publishedAt: string | null;
    createdAt: string;
};

/** Social listen detail for the global player (not owner studio GET). */
export type PublicTrackDetail = {
    id: string;
    title: string;
    durationMs: number;
    durationSec: number;
    mixUrl: string | null;
    coverUrl: string | null;
    caption: string | null;
    description: string | null;
    genres: string[];
    keywords: string[];
    publishedAt: string | null;
    playCount: number;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    artist: {
        id: string;
        username: string;
        name: string | null;
        avatarUrl: string | null;
        isFollowing: boolean;
    };
};

export type TrackLayerDetail = {
    id: string;
    sortIndex: number;
    kind: string;
    name: string;
    stemUrl: string | null;
    sourceUrl: string | null;
    offsetMs: number;
    durationMs: number;
    muted: boolean;
    appliedEffects: unknown;
    peaks: unknown;
    createdAt: string;
    updatedAt: string;
};

export type TrackDetail = {
    id: string;
    kind: string;
    status: string;
    storageState: string;
    title: string;
    durationMs: number;
    mixUrl: string | null;
    coverUrl: string | null;
    caption: string | null;
    description: string | null;
    genres: string[];
    keywords: string[];
    playCount: number;
    likeCount: number;
    isLiked: boolean;
    commentCount: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    layers: TrackLayerDetail[];
};

type TrackWithLayers = Track & { layers: TrackLayer[] };

class TrackService {
    public async createUploadUrls(
        userId: string,
        payload: CreateUploadUrlsSchema
    ): Promise<CreateUploadUrlsResponse> {
        const trackId = payload.trackId ?? uuidv7();
        const mix = await this.createSignedUploadUrl(
            buildMixPath(userId, trackId)
        );

        const layerIds =
            payload.layerIds && payload.layerIds.length > 0
                ? payload.layerIds
                : [uuidv7()];

        const stems = await Promise.all(
            layerIds.map(async (layerId) => ({
                layerId,
                upload: await this.createSignedUploadUrl(
                    buildStemPath(userId, trackId, layerId)
                ),
            }))
        );

        const sources = await Promise.all(
            layerIds.map(async (layerId) => ({
                layerId,
                upload: await this.createSignedUploadUrl(
                    buildSourcePath(userId, trackId, layerId)
                ),
            }))
        );

        return {
            trackId,
            uploads: { mix, stems, sources },
        };
    }

    public async createTrack(
        userId: string,
        payload: CreateTrackSchema
    ): Promise<{ id: string }> {
        try {
            await prisma.$transaction(async (tx) => {
                if (payload.projectId) {
                    const project = await tx.project.findFirst({
                        where: { id: payload.projectId, userId },
                        select: { id: true },
                    });
                    if (!project) {
                        throw new AppError(
                            "Project not found",
                            404,
                            "RESOURCE_NOT_FOUND"
                        );
                    }
                }

                await tx.track.create({
                    data: {
                        id: payload.id,
                        userId,
                        kind: payload.kind as TrackKind,
                        status: TrackStatus.DRAFT,
                        storageState: TrackStorageState.LOCAL_ONLY,
                        title: payload.title,
                        durationMs: payload.durationMs,
                        mixPath: null,
                        layers: {
                            create: payload.layers.map((layer, index) =>
                                this.toLayerCreateData(layer, index)
                            ),
                        },
                    },
                });

                if (payload.projectId) {
                    await tx.projectTrack.upsert({
                        where: {
                            projectId_trackId: {
                                projectId: payload.projectId,
                                trackId: payload.id,
                            },
                        },
                        create: {
                            projectId: payload.projectId,
                            trackId: payload.id,
                        },
                        update: {},
                    });
                    await tx.project.update({
                        where: { id: payload.projectId },
                        data: { updatedAt: new Date() },
                    });
                }
            });

            return { id: payload.id };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new AppError("Track already exists", 409, "CONFLICT");
            }
            throw error;
        }
    }

    public async updateTrack(
        userId: string,
        trackId: string,
        payload: UpdateTrackSchema
    ): Promise<{ id: string }> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
            include: { layers: true },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        if (track.status !== TrackStatus.DRAFT) {
            throw new AppError(
                "Only DRAFT tracks can be updated",
                400,
                "BAD_REQUEST"
            );
        }

        // Only audio/layer changes invalidate the uploaded mix. Metadata-only
        // edits (title, duration) keep the track SYNCED so it stays publishable
        // without re-uploading. Keep paths so abortIncompleteBackup cannot wipe
        // the last good cloud objects.
        const markDirty =
            payload.layers !== undefined &&
            track.storageState === TrackStorageState.SYNCED
                ? { storageState: TrackStorageState.LOCAL_ONLY }
                : {};

        if (payload.layers) {
            if (track.kind === TrackKind.SINGLE && payload.layers.length !== 1) {
                throw new AppError(
                    "SINGLE tracks must have exactly one layer",
                    400,
                    "BAD_REQUEST"
                );
            }

            await prisma.$transaction(async (tx) => {
                await tx.trackLayer.deleteMany({ where: { trackId } });
                await tx.track.update({
                    where: { id: trackId },
                    data: {
                        title: payload.title ?? track.title,
                        durationMs: payload.durationMs ?? track.durationMs,
                        ...markDirty,
                        layers: {
                            create: payload.layers!.map((layer, index) =>
                                this.toLayerCreateData(layer, index)
                            ),
                        },
                    },
                });
            });
        } else {
            await prisma.track.update({
                where: { id: trackId },
                data: {
                    ...(payload.title !== undefined
                        ? { title: payload.title }
                        : {}),
                    ...(payload.durationMs !== undefined
                        ? { durationMs: payload.durationMs }
                        : {}),
                    ...markDirty,
                },
            });
        }

        return { id: trackId };
    }

    public async listTracks(
        userId: string,
        query: ListTracksQuerySchema
    ): Promise<TrackListItem[]> {
        const tracks = await prisma.track.findMany({
            where: {
                userId,
                ...(query.status ? { status: query.status as TrackStatus } : {}),
            },
            orderBy: { createdAt: "desc" },
            include: {
                feedClip: { select: { id: true } },
            },
        });

        const liked = await this.likedTrackIds(
            userId,
            tracks.map((track) => track.id)
        );
        return Promise.all(
            tracks.map((track) =>
                this.toListItem(track, liked.has(track.id), track.feedClip?.id ?? null)
            )
        );
    }

    public async getTrackById(
        userId: string,
        trackId: string
    ): Promise<TrackDetail> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
            include: {
                layers: { orderBy: { sortIndex: "asc" } },
            },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        const liked = await this.likedTrackIds(userId, [track.id]);
        return this.toDetail(track, liked.has(track.id));
    }

    public async deleteTrack(
        userId: string,
        trackId: string
    ): Promise<{ id: string }> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
            include: { layers: true },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        await this.removeTrackPrefix(userId, trackId);

        await prisma.track.delete({
            where: { id: trackId },
        });

        return { id: trackId };
    }

    public async abortIncompleteBackup(
        userId: string,
        trackId: string
    ): Promise<{ id: string }> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        if (
            track.storageState !== TrackStorageState.LOCAL_ONLY ||
            track.mixPath !== null
        ) {
            throw new AppError(
                "Only incomplete LOCAL_ONLY backups can be aborted",
                400,
                "BAD_REQUEST"
            );
        }

        await this.removeTrackPrefix(userId, trackId);

        return { id: trackId };
    }

    public async createBackupUploadUrls(
        userId: string,
        trackId: string
    ): Promise<CreateUploadUrlsResponse> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
            include: { layers: { orderBy: { sortIndex: "asc" } } },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        const mix = await this.createSignedUploadUrl(
            buildMixPath(userId, trackId)
        );

        const stems = await Promise.all(
            track.layers.map(async (layer) => ({
                layerId: layer.id,
                upload: await this.createSignedUploadUrl(
                    buildStemPath(userId, trackId, layer.id)
                ),
            }))
        );

        const sources = await Promise.all(
            track.layers.map(async (layer) => ({
                layerId: layer.id,
                upload: await this.createSignedUploadUrl(
                    buildSourcePath(userId, trackId, layer.id)
                ),
            }))
        );

        return {
            trackId,
            uploads: { mix, stems, sources },
        };
    }

    public async completeBackup(
        userId: string,
        trackId: string
    ): Promise<{ id: string; storageState: string }> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
            include: { layers: { orderBy: { sortIndex: "asc" } } },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        const mixPath = buildMixPath(userId, trackId);
        const hasMix = await this.objectExists(
            buildTrackPrefix(userId, trackId),
            STORAGE_CONFIG.files.mix
        );

        if (!hasMix) {
            throw new AppError(
                "Mix file not found in storage. Upload mix before completing backup.",
                400,
                "BAD_REQUEST"
            );
        }

        const layerUpdates = await Promise.all(
            track.layers.map(async (layer) => {
                const stemPath = buildStemPath(userId, trackId, layer.id);
                const sourcePath = buildSourcePath(userId, trackId, layer.id);
                const layerPrefix = buildLayerPrefix(
                    userId,
                    trackId,
                    layer.id
                );
                const hasStem = await this.objectExists(
                    layerPrefix,
                    STORAGE_CONFIG.files.stem
                );
                const hasSource = await this.objectExists(
                    layerPrefix,
                    STORAGE_CONFIG.files.source
                );

                return {
                    id: layer.id,
                    stemPath: hasStem ? stemPath : mixPath,
                    sourcePath: hasSource ? sourcePath : null,
                };
            })
        );

        await prisma.$transaction(async (tx) => {
            await tx.track.update({
                where: { id: trackId },
                data: {
                    mixPath,
                    storageState: TrackStorageState.SYNCED,
                },
            });

            for (const layer of layerUpdates) {
                await tx.trackLayer.update({
                    where: { id: layer.id },
                    data: {
                        stemPath: layer.stemPath,
                        sourcePath: layer.sourcePath,
                    },
                });
            }
        });

        return { id: trackId, storageState: TrackStorageState.SYNCED };
    }

    public async createCoverUploadUrl(
        userId: string,
        trackId: string,
        payload: TrackCoverUploadUrlSchema
    ): Promise<{ path: string; signedUrl: string; token?: string }> {
        const track = await this.requireOwnedTrack(userId, trackId);
        this.assertDraftMutable(track);

        const extension = COVER_EXT_BY_TYPE[payload.contentType];
        if (!extension) {
            throw new AppError("Unsupported cover type", 400, "BAD_REQUEST");
        }

        const path = buildCoverPath(userId, trackId, extension);
        const upload = await objectStorage.createSignedUploadUrl(
            path,
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
        trackId: string,
        payload: TrackCoverCompleteSchema
    ): Promise<{ path: string; coverUrl: string | null }> {
        const track = await this.requireOwnedTrack(userId, trackId);
        this.assertDraftMutable(track);

        const expectedPrefix = `${buildTrackPrefix(userId, trackId)}/cover.`;
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

        const previous = track.coverPath;
        await prisma.track.update({
            where: { id: trackId },
            data: { coverPath: payload.path },
        });

        if (previous && previous !== payload.path) {
            await objectStorage.remove([previous]);
        }

        const coverUrl =
            await objectStorage.createSignedDownloadUrl(payload.path);

        return { path: payload.path, coverUrl };
    }

    public async deleteCover(
        userId: string,
        trackId: string
    ): Promise<{ id: string }> {
        const track = await this.requireOwnedTrack(userId, trackId);
        this.assertDraftMutable(track);

        if (!track.coverPath) {
            return { id: trackId };
        }

        const previous = track.coverPath;
        await prisma.track.update({
            where: { id: trackId },
            data: { coverPath: null },
        });
        await objectStorage.remove([previous]);

        return { id: trackId };
    }

    public async publishTrack(
        userId: string,
        trackId: string,
        payload: PublishTrackSchema
    ): Promise<PublishedTrackItem> {
        const track = await this.requireOwnedTrack(userId, trackId);

        if (track.status !== TrackStatus.DRAFT) {
            throw new AppError(
                "Only DRAFT tracks can be published",
                400,
                "BAD_REQUEST"
            );
        }

        if (
            track.storageState !== TrackStorageState.SYNCED ||
            !track.mixPath
        ) {
            throw new AppError(
                "Track must be SYNCED with a mix before publish",
                400,
                "BAD_REQUEST"
            );
        }

        if (!track.coverPath) {
            throw new AppError(
                "Cover image is required before publish",
                400,
                "BAD_REQUEST"
            );
        }

        const updated = await prisma.track.update({
            where: { id: trackId },
            data: {
                status: TrackStatus.PUBLISHED,
                caption: payload.caption ?? null,
                description: payload.description ?? null,
                genres: payload.genres,
                keywords: payload.keywords,
                publishedAt: track.publishedAt ?? new Date(),
            },
        });

        const liked = await this.likedTrackIds(userId, [updated.id]);
        return this.toPublishedItem(updated, liked.has(updated.id));
    }

    public async unpublishTrack(
        userId: string,
        trackId: string
    ): Promise<{ id: string; status: string }> {
        const track = await this.requireOwnedTrack(userId, trackId);

        if (track.status !== TrackStatus.PUBLISHED) {
            throw new AppError(
                "Only PUBLISHED tracks can be unpublished",
                400,
                "BAD_REQUEST"
            );
        }

        const { contestService } = await import(
            "@/server/modules/contest/contest.service"
        );
        await contestService.assertTrackNotContestLocked(trackId);

        await prisma.track.update({
            where: { id: trackId },
            data: { status: TrackStatus.DRAFT },
        });

        return { id: trackId, status: TrackStatus.DRAFT };
    }

    public async recordPlay(
        userId: string,
        trackId: string
    ): Promise<{ playCount: number; recorded: boolean }> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, status: TrackStatus.PUBLISHED },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        const since = new Date(Date.now() - PLAY_DEDUP_MS);
        const recent = await prisma.trackPlay.findFirst({
            where: {
                trackId,
                userId,
                createdAt: { gte: since },
            },
            select: { id: true },
        });

        if (recent) {
            return { playCount: track.playCount, recorded: false };
        }

        const updated = await prisma.$transaction(async (tx) => {
            await tx.trackPlay.create({
                data: { trackId, userId },
            });
            return tx.track.update({
                where: { id: trackId },
                data: { playCount: { increment: 1 } },
                select: { playCount: true },
            });
        });

        return { playCount: updated.playCount, recorded: true };
    }

    public async getPublishedPublicDetail(
        trackId: string,
        viewerUserId: string
    ): Promise<PublicTrackDetail> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, status: TrackStatus.PUBLISHED },
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

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        const [liked, relationship, mixUrl, coverUrl] = await Promise.all([
            this.likedTrackIds(viewerUserId, [track.id]),
            followService.getRelationship(viewerUserId, track.user.id),
            track.mixPath
                ? objectStorage.createSignedDownloadUrl(track.mixPath)
                : Promise.resolve(null),
            track.coverPath
                ? objectStorage.createSignedDownloadUrl(track.coverPath)
                : Promise.resolve(null),
        ]);

        const durationSec = Math.max(1, Math.round(track.durationMs / 1000));

        return {
            id: track.id,
            title: track.title,
            durationMs: track.durationMs,
            durationSec,
            mixUrl,
            coverUrl,
            caption: track.caption,
            description: track.description,
            genres: track.genres,
            keywords: track.keywords,
            publishedAt: track.publishedAt?.toISOString() ?? null,
            playCount: track.playCount,
            likeCount: track.likeCount,
            commentCount: track.commentCount,
            isLiked: liked.has(track.id),
            artist: {
                id: track.user.id,
                username: track.user.username,
                name: track.user.name,
                avatarUrl: publicUrl(track.user.avatarPath),
                isFollowing: relationship.isFollowing,
            },
        };
    }

    public async listPublishedByUser(
        targetUserId: string,
        viewerUserId: string
    ): Promise<PublishedTrackItem[]> {
        const tracks = await prisma.track.findMany({
            where: {
                userId: targetUserId,
                status: TrackStatus.PUBLISHED,
            },
            orderBy: { publishedAt: "desc" },
        });

        const liked = await this.likedTrackIds(
            viewerUserId,
            tracks.map((track) => track.id)
        );
        return Promise.all(
            tracks.map((track) =>
                this.toPublishedItem(track, liked.has(track.id))
            )
        );
    }

    private async requireOwnedTrack(userId: string, trackId: string) {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        return track;
    }

    private assertDraftMutable(track: Track) {
        if (track.status !== TrackStatus.DRAFT) {
            throw new AppError(
                "Published tracks are frozen. Unpublish to edit.",
                400,
                "BAD_REQUEST"
            );
        }
    }

    private async likedTrackIds(
        userId: string,
        trackIds: string[]
    ): Promise<Set<string>> {
        if (trackIds.length === 0) {
            return new Set();
        }

        const rows = await prisma.likedTrack.findMany({
            where: { userId, trackId: { in: trackIds } },
            select: { trackId: true },
        });

        return new Set(rows.map((row) => row.trackId));
    }

    private async toPublishedItem(
        track: Track,
        isLiked: boolean
    ): Promise<PublishedTrackItem> {
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
            kind: track.kind,
            title: track.title,
            caption: track.caption,
            description: track.description,
            genres: track.genres,
            keywords: track.keywords,
            durationMs: track.durationMs,
            mixUrl,
            coverUrl,
            playCount: track.playCount,
            likeCount: track.likeCount,
            isLiked,
            commentCount: track.commentCount,
            publishedAt: track.publishedAt?.toISOString() ?? null,
            createdAt: track.createdAt.toISOString(),
        };
    }

    private toLayerCreateData(layer: TrackLayerBodySchema, index: number) {
        return {
            id: layer.id,
            sortIndex: layer.sortIndex ?? index,
            kind: layer.kind,
            name: layer.name,
            stemPath: null as string | null,
            sourcePath: null as string | null,
            offsetMs: layer.offsetMs,
            durationMs: layer.durationMs,
            muted: layer.muted,
            appliedEffects: layer.appliedEffects,
            peaks: layer.peaks ?? undefined,
        };
    }

    private async createSignedUploadUrl(path: string): Promise<SignedUpload> {
        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .createSignedUploadUrl(path, { upsert: true });

        if (error || !data) {
            throw new AppError(
                error?.message ?? "Failed to create upload URL",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }

        return {
            path,
            signedUrl: data.signedUrl,
            token: data.token,
        };
    }

    private async createSignedUrl(
        storagePath: string | null
    ): Promise<string | null> {
        if (!storagePath) {
            return null;
        }

        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .createSignedUrl(
                storagePath,
                STORAGE_CONFIG.signedPlaybackUrlTtlSeconds
            );

        if (error || !data?.signedUrl) {
            throw new AppError(
                error?.message ?? "Failed to create signed URL",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }

        return data.signedUrl;
    }

    private async objectExists(
        prefix: string,
        fileName: string
    ): Promise<boolean> {
        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .list(prefix);

        if (error || !data) {
            return false;
        }

        return data.some((file) => file.name === fileName);
    }

    private async removeTrackPrefix(
        userId: string,
        trackId: string
    ): Promise<void> {
        const trackPrefix = buildTrackPrefix(userId, trackId);
        const paths: string[] = [];

        const { data: rootEntries } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .list(trackPrefix);

        if (rootEntries) {
            for (const entry of rootEntries) {
                // metadata set => file; unset => folder placeholder
                if (entry.metadata != null) {
                    paths.push(`${trackPrefix}/${entry.name}`);
                }
            }
        }

        const layersPrefix = `${trackPrefix}/layers`;
        const { data: layerDirs } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .list(layersPrefix);

        if (layerDirs) {
            for (const layerDir of layerDirs) {
                const layerPrefix = `${layersPrefix}/${layerDir.name}`;
                const { data: layerFiles } = await supabase.storage
                    .from(STORAGE_CONFIG.bucket)
                    .list(layerPrefix);
                if (layerFiles) {
                    for (const file of layerFiles) {
                        if (file.metadata != null) {
                            paths.push(`${layerPrefix}/${file.name}`);
                        }
                    }
                }
            }
        }

        const uniquePaths = [...new Set(paths)];
        if (uniquePaths.length === 0) {
            return;
        }

        const { error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .remove(uniquePaths);

        if (error) {
            throw new AppError(
                error.message ?? "Failed to delete track files from storage",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }
    }

    private async toListItem(
        track: Track,
        isLiked: boolean,
        feedClipId: string | null = null
    ): Promise<TrackListItem> {
        const [mixUrl, coverUrl] = await Promise.all([
            this.createSignedUrl(track.mixPath),
            this.createSignedUrl(track.coverPath),
        ]);

        return {
            id: track.id,
            kind: track.kind,
            status: track.status,
            storageState: track.storageState,
            title: track.title,
            durationMs: track.durationMs,
            mixUrl,
            coverUrl,
            playCount: track.playCount,
            likeCount: track.likeCount,
            isLiked,
            feedClipId,
            publishedAt: track.publishedAt?.toISOString() ?? null,
            createdAt: track.createdAt.toISOString(),
        };
    }

    private async toDetail(
        track: TrackWithLayers,
        isLiked: boolean
    ): Promise<TrackDetail> {
        const [mixUrl, coverUrl] = await Promise.all([
            this.createSignedUrl(track.mixPath),
            this.createSignedUrl(track.coverPath),
        ]);

        const layers = await Promise.all(
            track.layers.map(async (layer) => {
                const stemUrl = await this.createSignedUrl(layer.stemPath);
                const sourceUrl = await this.createSignedUrl(layer.sourcePath);

                return {
                    id: layer.id,
                    sortIndex: layer.sortIndex,
                    kind: layer.kind,
                    name: layer.name,
                    stemUrl,
                    sourceUrl,
                    offsetMs: layer.offsetMs,
                    durationMs: layer.durationMs,
                    muted: layer.muted,
                    appliedEffects: layer.appliedEffects,
                    peaks: layer.peaks,
                    createdAt: layer.createdAt.toISOString(),
                    updatedAt: layer.updatedAt.toISOString(),
                };
            })
        );

        return {
            id: track.id,
            kind: track.kind,
            status: track.status,
            storageState: track.storageState,
            title: track.title,
            durationMs: track.durationMs,
            mixUrl,
            coverUrl,
            caption: track.caption,
            description: track.description,
            genres: track.genres,
            keywords: track.keywords,
            playCount: track.playCount,
            likeCount: track.likeCount,
            isLiked,
            commentCount: track.commentCount,
            publishedAt: track.publishedAt?.toISOString() ?? null,
            createdAt: track.createdAt.toISOString(),
            updatedAt: track.updatedAt.toISOString(),
            layers,
        };
    }
}

export const trackService = new TrackService();
