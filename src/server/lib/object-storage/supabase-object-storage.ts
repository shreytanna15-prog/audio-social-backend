import { supabase } from "@/server/config/supabase";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import { AppError } from "@/server/utils/global-error";
import type { ObjectStorage, SignedUpload } from "./types";

class SupabaseObjectStorage implements ObjectStorage {
    public async createSignedUploadUrl(
        path: string,
        _contentType?: string
    ): Promise<SignedUpload> {
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

    public async createSignedDownloadUrl(
        path: string,
        ttlSeconds = STORAGE_CONFIG.signedPlaybackUrlTtlSeconds
    ): Promise<string> {
        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .createSignedUrl(path, ttlSeconds);

        if (error || !data?.signedUrl) {
            throw new AppError(
                error?.message ?? "Failed to create signed URL",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }

        return data.signedUrl;
    }

    public async objectExists(
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

    public async objectExistsAtPath(path: string): Promise<boolean> {
        const slash = path.lastIndexOf("/");
        if (slash < 0) {
            return false;
        }
        return this.objectExists(path.slice(0, slash), path.slice(slash + 1));
    }

    public async remove(paths: string[]): Promise<void> {
        const uniquePaths = [...new Set(paths.filter(Boolean))];
        if (uniquePaths.length === 0) {
            return;
        }

        const { error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .remove(uniquePaths);

        if (error) {
            throw new AppError(
                error.message ?? "Failed to delete objects from storage",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }
    }
}

export const objectStorage: ObjectStorage = new SupabaseObjectStorage();
