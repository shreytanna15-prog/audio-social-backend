import { STORAGE_CONFIG } from "@/server/constants/storage.config";

export function buildPlaybackPath(userId: string, audioId: string): string {
    return `${userId}/${audioId}/${STORAGE_CONFIG.files.playback}`;
}

export function buildSourcePath(userId: string, audioId: string): string {
    return `${userId}/${audioId}/${STORAGE_CONFIG.files.source}`;
}

export function assertPathBelongsToUser(path: string, userId: string, audioId: string): boolean {
    const expectedPlayback = buildPlaybackPath(userId, audioId);
    const expectedSource = buildSourcePath(userId, audioId);
    return path === expectedPlayback || path === expectedSource;
}
