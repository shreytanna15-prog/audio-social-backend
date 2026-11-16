import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/global-error";

/**
 * Shared R2 (S3-compatible) client for profile media today and a future
 * tracks/chat ObjectStorage swap. Do not export a live ObjectStorage default
 * from here — tracks/chat remain on Supabase until migration is flipped.
 */

export function isR2Configured(): boolean {
    return Boolean(
        env.R2_ACCOUNT_ID &&
            env.R2_ACCESS_KEY_ID &&
            env.R2_SECRET_ACCESS_KEY &&
            env.R2_BUCKET &&
            env.R2_PUBLIC_BASE_URL
    );
}

export function assertR2Configured(
    message = "Object storage (R2) is not configured"
): void {
    if (!isR2Configured()) {
        throw new AppError(message, 503, "R2_NOT_CONFIGURED");
    }
}

export function getR2Bucket(): string {
    assertR2Configured();
    return env.R2_BUCKET!;
}

export function getR2PublicBaseUrl(): string {
    assertR2Configured();
    return env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "");
}

let client: S3Client | null = null;

export function getR2Client(): S3Client {
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
