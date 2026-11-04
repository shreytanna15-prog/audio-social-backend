export const STORAGE_CONFIG = {
    bucket: "recordings",
    contentType: "audio/wav",
    signedPlaybackUrlTtlSeconds: 3600,
    files: {
        mix: "mix.wav",
        stem: "stem.wav",
        source: "source.wav",
        cover: "cover",
    },
    chat: {
        contentType: "audio/mp4",
        extension: "m4a",
    },
} as const;
