import "server-only";
import {
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/config/env";
import {
    PROFILE_MEDIA,
    type ProfileImageContentType,
} from "@/server/constants/profile-media";
import {
    assertR2Configured as assertR2ConfiguredCore,
    getR2Bucket,
    getR2Client,
    isR2Configured,
} from "@/server/lib/object-storage/r2-client";

export { PROFILE_MEDIA, type ProfileImageContentType };
export { isR2Configured };

export function assertR2Configured(): void {
    assertR2ConfiguredCore("Profile media storage is not configured");
}

const PRESIGN_EXPIRES_SEC = 60 * 15;

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
        Bucket: getR2Bucket(),
        Key: input.path,
        ContentType: input.contentType,
    });
    const signedUrl = await getSignedUrl(getR2Client(), command, {
        expiresIn: PRESIGN_EXPIRES_SEC,
    });
    return { path: input.path, signedUrl };
}

export async function objectExists(path: string): Promise<boolean> {
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
                ? (error as { $metadata: { httpStatusCode: number } }).$metadata
                      .httpStatusCode
                : undefined;
        if (status === 404) return false;
        throw error;
    }
}

export async function deleteObject(path: string): Promise<void> {
    assertR2Configured();
    await getR2Client().send(
        new DeleteObjectCommand({
            Bucket: getR2Bucket(),
            Key: path,
        })
    );
}
