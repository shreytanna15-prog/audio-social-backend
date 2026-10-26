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
import { supabase } from "@/server/config/supabase";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import {
    buildLayerPrefix,
    buildMixPath,
    buildSourcePath,
    buildStemPath,
    buildTrackPrefix,
} from "@/server/lib/storage-path";
import { AppError } from "@/server/utils/global-error";
import type {
    CreateTrackSchema,
    CreateUploadUrlsSchema,
    ListTracksQuerySchema,
    TrackLayerBodySchema,
    UpdateTrackSchema,
} from "./track.validator";

type SignedUpload = {
    path: string;
    signedUrl: string;
    token: string;
};

type CreateUploadUrlsResponse = {
    trackId: string;
    uploads: {
        mix: SignedUpload;
        stems: Array<{ layerId: string; upload: SignedUpload }>;
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
    createdAt: string;
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

        return {
            trackId,
            uploads: { mix, stems },
        };
    }

    /**
     * Create DRAFT metadata only (LOCAL_ONLY). No Supabase file required.
     */
    public async createTrack(
        userId: string,
        payload: CreateTrackSchema
    ): Promise<{ id: string }> {
        try {
            await prisma.track.create({
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

            return { id: payload.id };
        } catch (error) {
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
        });

        return Promise.all(tracks.map((track) => this.toListItem(track)));
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

        return this.toDetail(track);
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

        await this.removeTrackFiles(userId, track);

        await prisma.track.delete({
            where: { id: trackId },
        });

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

        return {
            trackId,
            uploads: { mix, stems },
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

    private async removeTrackFiles(
        userId: string,
        track: TrackWithLayers
    ): Promise<void> {
        const paths = [
            track.mixPath,
            ...track.layers.flatMap((layer) =>
                [layer.stemPath, layer.sourcePath].filter(
                    (path): path is string => Boolean(path)
                )
            ),
        ].filter((path): path is string => Boolean(path));

        const layerFolders = track.layers.map((layer) =>
            buildLayerPrefix(userId, track.id, layer.id)
        );

        for (const folder of layerFolders) {
            const { data } = await supabase.storage
                .from(STORAGE_CONFIG.bucket)
                .list(folder);
            if (data) {
                for (const file of data) {
                    paths.push(`${folder}/${file.name}`);
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

    private async toListItem(track: Track): Promise<TrackListItem> {
        const mixUrl = await this.createSignedUrl(track.mixPath);

        return {
            id: track.id,
            kind: track.kind,
            status: track.status,
            storageState: track.storageState,
            title: track.title,
            durationMs: track.durationMs,
            mixUrl,
            createdAt: track.createdAt.toISOString(),
        };
    }

    private async toDetail(track: TrackWithLayers): Promise<TrackDetail> {
        const mixUrl = await this.createSignedUrl(track.mixPath);

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
            publishedAt: track.publishedAt?.toISOString() ?? null,
            createdAt: track.createdAt.toISOString(),
            updatedAt: track.updatedAt.toISOString(),
            layers,
        };
    }
}

export const trackService = new TrackService();
