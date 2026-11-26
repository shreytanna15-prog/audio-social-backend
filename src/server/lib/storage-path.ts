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

function normalizeExtension(extension: string): string {
    return extension.replace(/^\./, "").toLowerCase();
}

/** Track publish cover. Extension supplied by client (jpg/png/webp). */
export function buildCoverPath(
    userId: string,
    trackId: string,
    extension: string
): string {
    return `${buildTrackPrefix(userId, trackId)}/${STORAGE_CONFIG.files.cover}.${normalizeExtension(extension)}`;
}

/** Client-trimmed feed clip (AAC/M4A). */
export function buildFeedClipPath(userId: string, trackId: string): string {
    return `${buildTrackPrefix(userId, trackId)}/feed-clip.${STORAGE_CONFIG.chat.extension}`;
}

export function buildPlaylistCoverPath(
    userId: string,
    playlistId: string,
    extension: string
): string {
    return `${userId}/playlists/${playlistId}/${STORAGE_CONFIG.files.cover}.${normalizeExtension(extension)}`;
}

export function buildAlbumCoverPath(
    userId: string,
    albumId: string,
    extension: string
): string {
    return `${userId}/albums/${albumId}/${STORAGE_CONFIG.files.cover}.${normalizeExtension(extension)}`;
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
