import { v7 as uuidv7 } from "uuid";
import { Audio, AudioStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { supabase } from "@/server/config/supabase";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import { buildPlaybackPath, buildSourcePath } from "@/server/lib/storage-path";
import { AppError } from "@/server/utils/global-error";
import type {
    CreateAudioSchema,
    ListAudiosQuerySchema,
    UpdateAudioSchema,
} from "./audio.validator";

type SignedUpload = {
    path: string;
    signedUrl: string;
    token: string;
};

type CreateUploadUrlsResponse = {
    audioId: string;
    uploads: {
        playback: SignedUpload;
        source: SignedUpload;
    };
};

type PlaybackUploadUrlResponse = {
    audioId: string;
    upload: SignedUpload;
};

export type AudioListItem = {
    id: string;
    status: string;
    title: string;
    duration: number;
    playbackUrl: string;
    createdAt: string;
};

export type AudioDetail = {
    id: string;
    title: string;
    duration: number;
    status: string;
    appliedEffects: unknown;
    playbackUrl: string;
    sourceUrl: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

class AudioService {
    public async createUploadUrls(userId: string): Promise<CreateUploadUrlsResponse> {
        const audioId = uuidv7();
        const playbackPath = buildPlaybackPath(userId, audioId);
        const sourcePath = buildSourcePath(userId, audioId);

        const [playback, source] = await Promise.all([
            this.createSignedUploadUrl(playbackPath),
            this.createSignedUploadUrl(sourcePath),
        ]);

        return {
            audioId,
            uploads: { playback, source },
        };
    }

    public async getPlaybackUploadUrl(
        userId: string,
        audioId: string
    ): Promise<PlaybackUploadUrlResponse> {
        const audio = await prisma.audio.findFirst({
            where: { id: audioId, userId },
        });

        if (!audio) {
            throw new AppError("Audio not found", 404, "RESOURCE_NOT_FOUND");
        }

        const playbackPath = buildPlaybackPath(userId, audioId);
        const upload = await this.createSignedUploadUrl(playbackPath);

        return { audioId, upload };
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

    public async createAudio(
        userId: string,
        payload: CreateAudioSchema
    ): Promise<{ id: string }> {
        const playbackPath = buildPlaybackPath(userId, payload.id);
        const sourcePath = buildSourcePath(userId, payload.id);

        await this.assertStorageFilesExist(userId, payload.id);

        try {
            await prisma.audio.create({
                data: {
                    id: payload.id,
                    userId,
                    title: payload.title,
                    duration: payload.duration,
                    playbackPath,
                    sourcePath,
                    appliedEffects: payload.appliedEffects,
                },
            });

            return { id: payload.id };
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                throw new AppError("Audio already exists", 409, "CONFLICT");
            }
            throw error;
        }
    }

    public async listAudios(
        userId: string,
        query: ListAudiosQuerySchema
    ): Promise<AudioListItem[]> {
        const audios = await prisma.audio.findMany({
            where: {
                userId,
                ...(query.status ? { status: query.status as AudioStatus } : {}),
            },
            orderBy: { createdAt: "desc" },
        });

        return Promise.all(audios.map((audio) => this.toListItem(audio)));
    }

    public async getAudioById(userId: string, audioId: string): Promise<AudioDetail> {
        const audio = await prisma.audio.findFirst({
            where: { id: audioId, userId },
        });

        if (!audio) {
            throw new AppError("Audio not found", 404, "RESOURCE_NOT_FOUND");
        }

        return this.toDetail(audio);
    }

    public async updateAudio(
        userId: string,
        audioId: string,
        payload: UpdateAudioSchema
    ): Promise<AudioDetail> {
        const audio = await prisma.audio.findFirst({
            where: { id: audioId, userId },
        });

        if (!audio) {
            throw new AppError("Audio not found", 404, "RESOURCE_NOT_FOUND");
        }

        if (payload.appliedEffects !== undefined) {
            await this.assertPlaybackFileExists(userId, audioId);
        }

        const updated = await prisma.audio.update({
            where: { id: audioId },
            data: {
                ...(payload.title !== undefined && { title: payload.title }),
                ...(payload.duration !== undefined && { duration: payload.duration }),
                ...(payload.appliedEffects !== undefined && {
                    appliedEffects: payload.appliedEffects,
                }),
            },
        });

        return this.toDetail(updated);
    }

    public async deleteAudio(
        userId: string,
        audioId: string
    ): Promise<{ id: string }> {
        const audio = await prisma.audio.findFirst({
            where: { id: audioId, userId },
        });

        if (!audio) {
            throw new AppError("Audio not found", 404, "RESOURCE_NOT_FOUND");
        }

        const { error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .remove([audio.playbackPath, audio.sourcePath]);

        if (error) {
            throw new AppError(
                error.message ?? "Failed to delete audio files from storage",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }

        await prisma.audio.delete({
            where: { id: audioId },
        });

        return { id: audioId };
    }

    private async toListItem(audio: Audio): Promise<AudioListItem> {
        const playbackUrl = await this.createSignedUrl(audio.playbackPath);

        return {
            id: audio.id,
            status: audio.status,
            title: audio.title,
            duration: audio.duration,
            playbackUrl,
            createdAt: audio.createdAt.toISOString(),
        };
    }

    private async toDetail(audio: Audio): Promise<AudioDetail> {
        const [playbackUrl, sourceUrl] = await Promise.all([
            this.createSignedUrl(audio.playbackPath),
            this.createSignedUrl(audio.sourcePath),
        ]);

        return {
            id: audio.id,
            title: audio.title,
            duration: audio.duration,
            status: audio.status,
            appliedEffects: audio.appliedEffects,
            playbackUrl,
            sourceUrl,
            publishedAt: audio.publishedAt?.toISOString() ?? null,
            createdAt: audio.createdAt.toISOString(),
            updatedAt: audio.updatedAt.toISOString(),
        };
    }

    private async assertStorageFilesExist(
        userId: string,
        audioId: string
    ): Promise<void> {
        const { data: files, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .list(`${userId}/${audioId}`);

        if (error || !files) {
            throw new AppError(
                "Failed to verify audio files in storage",
                400,
                "BAD_REQUEST"
            );
        }

        const fileNames = new Set(files.map((file) => file.name));
        const hasPlayback = fileNames.has(STORAGE_CONFIG.files.playback);
        const hasSource = fileNames.has(STORAGE_CONFIG.files.source);

        if (!hasPlayback || !hasSource) {
            throw new AppError(
                "Audio files not found in storage. Upload both files before creating the record.",
                400,
                "BAD_REQUEST"
            );
        }
    }

    private async assertPlaybackFileExists(
        userId: string,
        audioId: string
    ): Promise<void> {
        const { data: files, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .list(`${userId}/${audioId}`);

        if (error || !files) {
            throw new AppError(
                "Failed to verify playback file in storage",
                400,
                "BAD_REQUEST"
            );
        }

        const hasPlayback = files.some(
            (file) => file.name === STORAGE_CONFIG.files.playback
        );

        if (!hasPlayback) {
            throw new AppError(
                "Playback file not found in storage. Upload the updated audio before saving.",
                400,
                "BAD_REQUEST"
            );
        }
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
}

export const audioService = new AudioService();
