import { STORAGE_CONFIG } from "@/server/constants/storage.config";

export function buildTrackPrefix(userId: string, trackId: string): string {
    return `${userId}/tracks/${trackId}`;
}

export function buildMixPath(userId: string, trackId: string): string {
    return `${buildTrackPrefix(userId, trackId)}/${STORAGE_CONFIG.files.mix}`;
}

export function buildLayerPrefix(
    userId: string,
    trackId: string,
    layerId: string
): string {
    return `${buildTrackPrefix(userId, trackId)}/layers/${layerId}`;
}

export function buildStemPath(
    userId: string,
    trackId: string,
    layerId: string
): string {
    return `${buildLayerPrefix(userId, trackId, layerId)}/${STORAGE_CONFIG.files.stem}`;
}

export function buildSourcePath(
    userId: string,
    trackId: string,
    layerId: string
): string {
    return `${buildLayerPrefix(userId, trackId, layerId)}/${STORAGE_CONFIG.files.source}`;
}

export function buildChatPrefix(userId: string, conversationId: string): string {
    return `chat/${userId}/${conversationId}`;
}

export function buildChatVoiceNotePath(
    userId: string,
    conversationId: string,
    messageId: string
): string {
    return `${buildChatPrefix(userId, conversationId)}/${messageId}.${STORAGE_CONFIG.chat.extension}`;
}
