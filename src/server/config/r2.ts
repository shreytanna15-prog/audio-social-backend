import "server-only";
import {
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/config/env";
import {
    PROFILE_MEDIA,
    type ProfileImageContentType,
} from "@/server/constants/profile-media";
import { AppError } from "@/server/utils/global-error";

export { PROFILE_MEDIA, type ProfileImageContentType };

const PRESIGN_EXPIRES_SEC = 60 * 15;

function isR2Configured(): boolean {
    return Boolean(
        env.R2_ACCOUNT_ID &&
            env.R2_ACCESS_KEY_ID &&
            env.R2_SECRET_ACCESS_KEY &&
            env.R2_BUCKET &&
            env.R2_PUBLIC_BASE_URL
    );
}

export function assertR2Configured(): void {
    if (!isR2Configured()) {
        throw new AppError(
            "Profile media storage is not configured",
            503,
            "R2_NOT_CONFIGURED"
        );
    }
}

let client: S3Client | null = null;

function getClient(): S3Client {
    assertR2Configured();
    if (!client) {
        client = new S3Client({
            region: "auto",
            endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID!,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
            },
        });
    }
    return client;
}

function extensionFor(contentType: ProfileImageContentType): string {
    switch (contentType) {
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/jpeg":
        case "image/jpg":
        default:
            return "jpg";
    }
}

export function buildAvatarPath(
    userId: string,
    objectId: string,
    contentType: ProfileImageContentType
): string {
    return `avatars/${userId}/${objectId}.${extensionFor(contentType)}`;
}

export function buildCoverPath(
    userId: string,
    objectId: string,
    contentType: ProfileImageContentType
): string {
    return `covers/${userId}/${objectId}.${extensionFor(contentType)}`;
}

export function publicUrl(path: string | null | undefined): string | null {
    if (!path || !env.R2_PUBLIC_BASE_URL) return null;
    const base = env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");
    const key = path.replace(/^\//, "");
    return `${base}/${key}`;
}

export async function presignPut(input: {
    path: string;
    contentType: ProfileImageContentType;
}): Promise<{ path: string; signedUrl: string }> {
    const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET!,
        Key: input.path,
        ContentType: input.contentType,
    });
    const signedUrl = await getSignedUrl(getClient(), command, {
        expiresIn: PRESIGN_EXPIRES_SEC,
    });
    return { path: input.path, signedUrl };
}

export async function objectExists(path: string): Promise<boolean> {
    try {
        await getClient().send(
            new HeadObjectCommand({
                Bucket: env.R2_BUCKET!,
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
                ? (error as { $metadata: { httpStatusCode: number } }).$metadata
                      .httpStatusCode
                : undefined;
        if (status === 404) return false;
        throw error;
    }
}

export async function deleteObject(path: string): Promise<void> {
    assertR2Configured();
    await getClient().send(
        new DeleteObjectCommand({
            Bucket: env.R2_BUCKET!,
            Key: path,
        })
    );
}
