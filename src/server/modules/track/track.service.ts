import { v7 as uuidv7 } from "uuid";
import {
    Prisma,
    Track,
    TrackLayer,
    TrackStatus,
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
    ListTracksQuerySchema,
} from "./track.validator";

type SignedUpload = {
    path: string;
    signedUrl: string;
    token: string;
};

type CreateUploadUrlsResponse = {
    trackId: string;
    layerId: string;
    uploads: {
        mix: SignedUpload;
    };
};

export type TrackListItem = {
    id: string;
    kind: string;
    status: string;
    title: string;
    durationMs: number;
    mixUrl: string;
    createdAt: string;
};

export type TrackLayerDetail = {
    id: string;
    sortIndex: number;
    kind: string;
    name: string;
    stemUrl: string;
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
    title: string;
    durationMs: number;
    mixUrl: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    layers: TrackLayerDetail[];
};

type TrackWithLayers = Track & { layers: TrackLayer[] };

class TrackService {
    public async createUploadUrls(userId: string): Promise<CreateUploadUrlsResponse> {
        const trackId = uuidv7();
        const layerId = uuidv7();

        // SINGLE v1: one mix upload only (stem/source can share mix path on create).
        const mix = await this.createSignedUploadUrl(buildMixPath(userId, trackId));

        return {
            trackId,
            layerId,
            uploads: { mix },
        };
    }

    public async createTrack(
        userId: string,
        payload: CreateTrackSchema
    ): Promise<{ id: string }> {
        const mixPath = buildMixPath(userId, payload.id);
        const stemPath = buildStemPath(userId, payload.id, payload.layer.id);
        const sourcePath = buildSourcePath(userId, payload.id, payload.layer.id);

        const files = await this.assertRequiredFilesExist(
            userId,
            payload.id,
            payload.layer.id
        );

        // SINGLE v1: stem/source may reuse mix when not uploaded separately.
        const resolvedStemPath = files.hasStem ? stemPath : mixPath;
        const resolvedSourcePath = files.hasSource ? sourcePath : null;

        try {
            await prisma.track.create({
                data: {
                    id: payload.id,
                    userId,
                    kind: payload.kind,
                    status: TrackStatus.DRAFT,
                    title: payload.title,
                    durationMs: payload.durationMs,
                    mixPath,
                    layers: {
                        create: {
                            id: payload.layer.id,
                            sortIndex: 0,
                            kind: payload.layer.kind,
                            name: payload.layer.name,
                            stemPath: resolvedStemPath,
                            sourcePath: resolvedSourcePath,
                            offsetMs: payload.layer.offsetMs,
                            durationMs: payload.layer.durationMs,
                            muted: payload.layer.muted,
                            appliedEffects: payload.layer.appliedEffects,
                            peaks: payload.layer.peaks ?? undefined,
                        },
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

    private async createSignedUrl(storagePath: string): Promise<string> {
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

    /**
     * Ensures mix exists. Stem/source are optional (SINGLE v1 uploads mix only).
     */
    private async assertRequiredFilesExist(
        userId: string,
        trackId: string,
        layerId: string
    ): Promise<{ hasStem: boolean; hasSource: boolean }> {
        const trackPrefix = buildTrackPrefix(userId, trackId);
        const layerPrefix = buildLayerPrefix(userId, trackId, layerId);

        const [trackList, layerList] = await Promise.all([
            supabase.storage.from(STORAGE_CONFIG.bucket).list(trackPrefix),
            supabase.storage.from(STORAGE_CONFIG.bucket).list(layerPrefix),
        ]);

        if (trackList.error || !trackList.data) {
            throw new AppError(
                "Failed to verify mix file in storage",
                400,
                "BAD_REQUEST"
            );
        }

        const trackNames = new Set(trackList.data.map((file) => file.name));

        if (!trackNames.has(STORAGE_CONFIG.files.mix)) {
            throw new AppError(
                "Mix file not found in storage. Upload mix before creating the track.",
                400,
                "BAD_REQUEST"
            );
        }

        const layerNames = new Set(
            !layerList.error && layerList.data
                ? layerList.data.map((file) => file.name)
                : []
        );

        return {
            hasStem: layerNames.has(STORAGE_CONFIG.files.stem),
            hasSource: layerNames.has(STORAGE_CONFIG.files.source),
        };
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
        ];

        // Also try listing layer folders in case of leftover objects.
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
                const sourceUrl = layer.sourcePath
                    ? await this.createSignedUrl(layer.sourcePath)
                    : null;

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
