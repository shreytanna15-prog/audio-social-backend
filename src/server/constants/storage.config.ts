export const STORAGE_CONFIG = {
    bucket: "recordings",
    contentType: "audio/mp4",
    signedPlaybackUrlTtlSeconds: 3600,
    files: {
        playback: "original.m4a",
        source: "source.m4a",
    },
} as const;
