import { z } from "@/server/lib/zod";
import {
    registry,
    successResponseSchema,
} from "@/server/openapi/registry";

export const audioIdParamSchema = registry.registerParameter(
    "AudioId",
    z.uuid("Invalid audio ID").openapi({
        param: { name: "id", in: "path" },
        example: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
        description: "Audio UUID",
    })
);

export const userSchema = registry.register(
    "User",
    z.object({
        id: z.uuid(),
        email: z.email(),
        username: z.string(),
        name: z.string().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
    })
);

export const tokensSchema = registry.register(
    "Tokens",
    z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
    })
);

export const authDataSchema = registry.register(
    "AuthData",
    z.object({
        user: userSchema,
        tokens: tokensSchema,
    })
);

export const audioStatusSchema = z
    .enum(["DRAFT", "PUBLISHED"])
    .openapi("AudioStatus");

export const appliedEffectSchema = registry.register(
    "AppliedEffect",
    z.object({
        id: z.enum(["denoise", "enhance", "reverb", "echo", "modulate"]),
        params: z.record(
            z.string(),
            z.union([z.string(), z.number(), z.boolean()])
        ),
    })
);

export const audioListItemSchema = registry.register(
    "AudioListItem",
    z.object({
        id: z.uuid(),
        status: audioStatusSchema,
        title: z.string(),
        duration: z.number().int(),
        playbackUrl: z.url(),
        createdAt: z.iso.datetime(),
    })
);

export const audioDetailSchema = registry.register(
    "AudioDetail",
    z.object({
        id: z.uuid(),
        title: z.string(),
        duration: z.number().int(),
        status: audioStatusSchema,
        appliedEffects: z.array(appliedEffectSchema),
        playbackUrl: z.url(),
        sourceUrl: z.url(),
        publishedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
    })
);

export const signedUploadSchema = registry.register(
    "SignedUpload",
    z.object({
        path: z.string(),
        signedUrl: z.url(),
        token: z.string(),
    })
);

export const createUploadUrlsDataSchema = registry.register(
    "CreateUploadUrlsData",
    z.object({
        audioId: z.uuid(),
        uploads: z.object({
            playback: signedUploadSchema,
            source: signedUploadSchema,
        }),
    })
);

export const playbackUploadUrlDataSchema = registry.register(
    "PlaybackUploadUrlData",
    z.object({
        audioId: z.uuid(),
        upload: signedUploadSchema,
    })
);

export const audioIdDataSchema = registry.register(
    "AudioIdData",
    z.object({
        id: z.uuid(),
    })
);

export const authSuccessResponseSchema = successResponseSchema(
    authDataSchema,
    "AuthSuccessResponse"
);

export const tokensSuccessResponseSchema = successResponseSchema(
    tokensSchema,
    "TokensSuccessResponse"
);

export const userSuccessResponseSchema = successResponseSchema(
    userSchema,
    "UserSuccessResponse"
);

export const audioListSuccessResponseSchema = successResponseSchema(
    z.array(audioListItemSchema),
    "AudioListSuccessResponse"
);

export const audioDetailSuccessResponseSchema = successResponseSchema(
    audioDetailSchema,
    "AudioDetailSuccessResponse"
);

export const audioIdSuccessResponseSchema = successResponseSchema(
    audioIdDataSchema,
    "AudioIdSuccessResponse"
);

export const createUploadUrlsSuccessResponseSchema = successResponseSchema(
    createUploadUrlsDataSchema,
    "CreateUploadUrlsSuccessResponse"
);

export const playbackUploadUrlSuccessResponseSchema = successResponseSchema(
    playbackUploadUrlDataSchema,
    "PlaybackUploadUrlSuccessResponse"
);
