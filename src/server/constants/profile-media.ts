export const PROFILE_MEDIA = {
    maxBytes: 5 * 1024 * 1024,
    contentTypes: [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    ] as const,
} as const;

export type ProfileImageContentType =
    (typeof PROFILE_MEDIA.contentTypes)[number];
