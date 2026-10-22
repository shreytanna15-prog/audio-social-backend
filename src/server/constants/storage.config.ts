export const STORAGE_CONFIG = {
    bucket: "recordings",
    contentType: "audio/wav",
    signedPlaybackUrlTtlSeconds: 3600,
    files: {
        mix: "mix.wav",
        stem: "stem.wav",
        source: "source.wav",
    },
} as const;
