import { z } from "@/server/lib/zod";
import {
    registry,
    successResponseSchema,
} from "@/server/openapi/registry";

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

export const trackIdParamSchema = registry.registerParameter(
    "TrackId",
    z.uuid("Invalid track ID").openapi({
        param: { name: "id", in: "path" },
        example: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
        description: "Track UUID",
    })
);

export const trackKindSchema = z.enum(["SINGLE", "MULTI"]).openapi("TrackKind");

export const trackStatusSchema = z
    .enum(["DRAFT", "PUBLISHED"])
    .openapi("TrackStatus");

export const trackStorageStateSchema = z
    .enum(["LOCAL_ONLY", "SYNCED", "CLOUD_ONLY"])
    .openapi("TrackStorageState");

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

export const signedUploadSchema = registry.register(
    "SignedUpload",
    z.object({
        path: z.string(),
        signedUrl: z.url(),
        token: z.string(),
    })
);

export const createTrackUploadUrlsDataSchema = registry.register(
    "CreateTrackUploadUrlsData",
    z.object({
        trackId: z.uuid(),
        uploads: z.object({
            mix: signedUploadSchema,
            stems: z.array(
                z.object({
                    layerId: z.uuid(),
                    upload: signedUploadSchema,
                })
            ),
        }),
    })
);

export const trackIdDataSchema = registry.register(
    "TrackIdData",
    z.object({
        id: z.uuid(),
    })
);

export const trackListItemSchema = registry.register(
    "TrackListItem",
    z.object({
        id: z.uuid(),
        kind: trackKindSchema,
        status: trackStatusSchema,
        storageState: trackStorageStateSchema,
        title: z.string(),
        durationMs: z.number().int(),
        mixUrl: z.url().nullable(),
        createdAt: z.iso.datetime(),
    })
);

export const trackLayerDetailSchema = registry.register(
    "TrackLayerDetail",
    z.object({
        id: z.uuid(),
        sortIndex: z.number().int(),
        kind: z.enum(["vocal", "beat", "import"]),
        name: z.string(),
        stemUrl: z.url().nullable(),
        sourceUrl: z.url().nullable(),
        offsetMs: z.number().int(),
        durationMs: z.number().int(),
        muted: z.boolean(),
        appliedEffects: z.array(appliedEffectSchema),
        peaks: z.array(z.number()).nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
    })
);

export const trackDetailSchema = registry.register(
    "TrackDetail",
    z.object({
        id: z.uuid(),
        kind: trackKindSchema,
        status: trackStatusSchema,
        storageState: trackStorageStateSchema,
        title: z.string(),
        durationMs: z.number().int(),
        mixUrl: z.url().nullable(),
        publishedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        layers: z.array(trackLayerDetailSchema),
    })
);

export const trackBackupCompleteDataSchema = registry.register(
    "TrackBackupCompleteData",
    z.object({
        id: z.uuid(),
        storageState: trackStorageStateSchema,
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

export const createTrackUploadUrlsSuccessResponseSchema = successResponseSchema(
    createTrackUploadUrlsDataSchema,
    "CreateTrackUploadUrlsSuccessResponse"
);

export const trackIdSuccessResponseSchema = successResponseSchema(
    trackIdDataSchema,
    "TrackIdSuccessResponse"
);

export const trackListSuccessResponseSchema = successResponseSchema(
    z.array(trackListItemSchema),
    "TrackListSuccessResponse"
);

export const trackDetailSuccessResponseSchema = successResponseSchema(
    trackDetailSchema,
    "TrackDetailSuccessResponse"
);

export const trackBackupCompleteSuccessResponseSchema = successResponseSchema(
    trackBackupCompleteDataSchema,
    "TrackBackupCompleteSuccessResponse"
);

export const userIdParamSchema = registry.registerParameter(
    "UserId",
    z.uuid("Invalid user ID").openapi({
        param: { name: "id", in: "path" },
        example: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
        description: "User UUID",
    })
);

export const userSearchResultSchema = registry.register(
    "UserSearchResult",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
    })
);

export const publicUserProfileSchema = registry.register(
    "PublicUserProfile",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        followerCount: z.number().int(),
        followingCount: z.number().int(),
        isFollowing: z.boolean(),
        isFollowedBy: z.boolean(),
        isMutual: z.boolean(),
        isSelf: z.boolean(),
    })
);

export const followActionDataSchema = registry.register(
    "FollowActionData",
    z.object({
        id: z.uuid(),
        followerCount: z.number().int(),
        followingCount: z.number().int(),
        isFollowing: z.boolean(),
        isFollowedBy: z.boolean(),
        isMutual: z.boolean(),
    })
);

export const relationshipDataSchema = registry.register(
    "RelationshipData",
    z.object({
        isFollowing: z.boolean(),
        isFollowedBy: z.boolean(),
        isMutual: z.boolean(),
    })
);

export const searchRecentItemSchema = registry.register(
    "SearchRecentItem",
    z.object({
        id: z.uuid(),
        kind: z.literal("ARTIST"),
        query: z.string().nullable(),
        targetUser: userSearchResultSchema,
        updatedAt: z.iso.datetime(),
    })
);

export const clearSearchRecentDataSchema = registry.register(
    "ClearSearchRecentData",
    z.object({
        ok: z.literal(true),
    })
);

export const userSearchSuccessResponseSchema = successResponseSchema(
    z.array(userSearchResultSchema),
    "UserSearchSuccessResponse"
);

export const publicUserProfileSuccessResponseSchema = successResponseSchema(
    publicUserProfileSchema,
    "PublicUserProfileSuccessResponse"
);

export const followActionSuccessResponseSchema = successResponseSchema(
    followActionDataSchema,
    "FollowActionSuccessResponse"
);

export const relationshipSuccessResponseSchema = successResponseSchema(
    relationshipDataSchema,
    "RelationshipSuccessResponse"
);

export const searchRecentListSuccessResponseSchema = successResponseSchema(
    z.array(searchRecentItemSchema),
    "SearchRecentListSuccessResponse"
);

export const clearSearchRecentSuccessResponseSchema = successResponseSchema(
    clearSearchRecentDataSchema,
    "ClearSearchRecentSuccessResponse"
);
