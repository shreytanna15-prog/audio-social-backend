import "server-only";
import {
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import { AppError } from "@/server/utils/global-error";
import {
    getR2Bucket,
    getR2Client,
} from "./r2-client";
import type { ObjectStorage, SignedUpload } from "./types";

const PRESIGN_UPLOAD_EXPIRES_SEC = 60 * 15;

/**
 * R2 implementation of the tracks/chat ObjectStorage interface.
 * Not wired as the default export — keep Supabase until migration is intentional.
 */
export class R2ObjectStorage implements ObjectStorage {
    public async createSignedUploadUrl(
        path: string,
        contentType?: string
    ): Promise<SignedUpload> {
        const command = new PutObjectCommand({
            Bucket: getR2Bucket(),
            Key: path,
            ...(contentType ? { ContentType: contentType } : {}),
        });
        const signedUrl = await getSignedUrl(getR2Client(), command, {
            expiresIn: PRESIGN_UPLOAD_EXPIRES_SEC,
        });
        return { path, signedUrl };
    }

    public async createSignedDownloadUrl(
        path: string,
        ttlSeconds = STORAGE_CONFIG.signedPlaybackUrlTtlSeconds
    ): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: getR2Bucket(),
            Key: path,
        });
        return getSignedUrl(getR2Client(), command, {
            expiresIn: ttlSeconds,
        });
    }

    public async objectExists(
        prefix: string,
        fileName: string
    ): Promise<boolean> {
        const normalized = prefix.replace(/\/$/, "");
        const listed = await getR2Client().send(
            new ListObjectsV2Command({
                Bucket: getR2Bucket(),
                Prefix: `${normalized}/`,
                MaxKeys: 100,
            })
        );
        const target = `${normalized}/${fileName}`;
        return Boolean(
            listed.Contents?.some((item) => item.Key === target)
        );
    }

    public async objectExistsAtPath(path: string): Promise<boolean> {
        try {
            await getR2Client().send(
                new HeadObjectCommand({
                    Bucket: getR2Bucket(),
                    Key: path,
                })
            );
            return true;
        } catch (error) {
            const status =
                typeof error === "object" &&
                error !== null &&
                "$metadata" in error &&
                typeof (error as { $metadata?: { httpStatusCode?: number } })
                    .$metadata?.httpStatusCode === "number"
                    ? (error as { $metadata: { httpStatusCode: number } })
                          .$metadata.httpStatusCode
                    : undefined;
            if (status === 404) return false;
            throw error;
        }
    }

    public async remove(paths: string[]): Promise<void> {
        const uniquePaths = [...new Set(paths.filter(Boolean))];
        if (uniquePaths.length === 0) return;

        const result = await getR2Client().send(
            new DeleteObjectsCommand({
                Bucket: getR2Bucket(),
                Delete: {
                    Objects: uniquePaths.map((Key) => ({ Key })),
                    Quiet: true,
                },
            })
        );

        if (result.Errors && result.Errors.length > 0) {
            throw new AppError(
                result.Errors[0]?.Message ??
                    "Failed to delete objects from storage",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }
    }
}

/** Ready-to-wire instance; import only when flipping away from Supabase. */
export const r2ObjectStorage: ObjectStorage = new R2ObjectStorage();
