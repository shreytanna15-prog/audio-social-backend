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

export const meSchema = registry.register(
    "Me",
    z.object({
        id: z.uuid(),
        email: z.email(),
        username: z.string(),
        name: z.string().nullable(),
        bio: z.string().nullable(),
        avatarUrl: z.url().nullable(),
        coverUrl: z.url().nullable(),
        preferredGenres: z.array(z.string()),
        canChangeUsername: z.boolean(),
        usernameChangeAvailableAt: z.iso.datetime().nullable(),
        unreadNotificationCount: z.number().int().nonnegative(),
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

const layerSignedUploadSchema = z.object({
    layerId: z.uuid(),
    upload: signedUploadSchema,
});

export const createTrackUploadUrlsDataSchema = registry.register(
    "CreateTrackUploadUrlsData",
    z.object({
        trackId: z.uuid(),
        uploads: z.object({
            mix: signedUploadSchema,
            stems: z.array(layerSignedUploadSchema),
            sources: z.array(layerSignedUploadSchema),
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
        coverUrl: z.url().nullable(),
        playCount: z.number().int(),
        likeCount: z.number().int(),
        isLiked: z.boolean(),
        feedClipId: z.uuid().nullable(),
        publishedAt: z.iso.datetime().nullable(),
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
        coverUrl: z.url().nullable(),
        caption: z.string().nullable(),
        description: z.string().nullable(),
        genres: z.array(z.string()),
        keywords: z.array(z.string()),
        playCount: z.number().int(),
        likeCount: z.number().int(),
        isLiked: z.boolean(),
        commentCount: z.number().int(),
        publishedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        layers: z.array(trackLayerDetailSchema),
    })
);

export const publishedTrackItemSchema = registry.register(
    "PublishedTrackItem",
    z.object({
        id: z.uuid(),
        kind: trackKindSchema,
        title: z.string(),
        caption: z.string().nullable(),
        description: z.string().nullable(),
        genres: z.array(z.string()),
        keywords: z.array(z.string()),
        durationMs: z.number().int(),
        mixUrl: z.url().nullable(),
        coverUrl: z.url().nullable(),
        playCount: z.number().int(),
        likeCount: z.number().int(),
        isLiked: z.boolean(),
        commentCount: z.number().int(),
        publishedAt: z.iso.datetime().nullable(),
        createdAt: z.iso.datetime(),
    })
);

export const projectSummarySchema = registry.register(
    "ProjectSummary",
    z.object({
        id: z.uuid(),
        title: z.string(),
        description: z.string().nullable(),
        trackCount: z.number().int(),
        updatedAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
    })
);

export const projectTrackItemSchema = registry.register(
    "ProjectTrackItem",
    z.object({
        id: z.uuid(),
        kind: trackKindSchema,
        status: trackStatusSchema,
        storageState: trackStorageStateSchema,
        title: z.string(),
        durationMs: z.number().int(),
        mixUrl: z.url().nullable(),
        addedAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
    })
);

export const projectDetailSchema = registry.register(
    "ProjectDetail",
    z.object({
        id: z.uuid(),
        title: z.string(),
        description: z.string().nullable(),
        trackCount: z.number().int(),
        updatedAt: z.iso.datetime(),
        createdAt: z.iso.datetime(),
        tracks: z.array(projectTrackItemSchema),
    })
);

export const trackBackupCompleteDataSchema = registry.register(
    "TrackBackupCompleteData",
    z.object({
        id: z.uuid(),
        storageState: trackStorageStateSchema,
    })
);

export const commentIdParamSchema = registry.registerParameter(
    "CommentId",
    z.uuid("Invalid comment ID").openapi({
        param: { name: "id", in: "path" },
        example: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
        description: "Track comment UUID",
    })
);

export const commentAuthorSchema = registry.register(
    "CommentAuthor",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.string().nullable(),
    })
);

const trackCommentBaseShape = {
    id: z.uuid(),
    body: z.string(),
    createdAt: z.iso.datetime(),
    likeCount: z.number().int(),
    isLiked: z.boolean(),
    isOwn: z.boolean(),
    author: commentAuthorSchema,
};

export const trackCommentReplySchema = registry.register(
    "TrackCommentReply",
    z.object(trackCommentBaseShape)
);

export const trackCommentSchema = registry.register(
    "TrackComment",
    z.object({
        ...trackCommentBaseShape,
        replies: z.array(trackCommentReplySchema).optional(),
    })
);

export const commentLikeDataSchema = registry.register(
    "CommentLikeData",
    z.object({
        id: z.uuid(),
        likeCount: z.number().int(),
        isLiked: z.boolean(),
    })
);

export const deleteCommentDataSchema = registry.register(
    "DeleteCommentData",
    z.object({
        id: z.uuid(),
        commentCount: z.number().int(),
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

export const passwordResetRequestDataSchema = registry.register(
    "PasswordResetRequestData",
    z.object({
        ok: z.literal(true),
        resendAvailableAt: z.iso.datetime().nullable(),
    })
);

export const passwordResetVerifyDataSchema = registry.register(
    "PasswordResetVerifyData",
    z.object({
        resetToken: z.string(),
    })
);

export const passwordResetConfirmDataSchema = registry.register(
    "PasswordResetConfirmData",
    z.object({
        ok: z.literal(true),
    })
);

export const passwordResetRequestSuccessResponseSchema = successResponseSchema(
    passwordResetRequestDataSchema,
    "PasswordResetRequestSuccessResponse"
);

export const passwordResetVerifySuccessResponseSchema = successResponseSchema(
    passwordResetVerifyDataSchema,
    "PasswordResetVerifySuccessResponse"
);

export const passwordResetConfirmSuccessResponseSchema = successResponseSchema(
    passwordResetConfirmDataSchema,
    "PasswordResetConfirmSuccessResponse"
);

export const userSuccessResponseSchema = successResponseSchema(
    userSchema,
    "UserSuccessResponse"
);

export const meSuccessResponseSchema = successResponseSchema(
    meSchema,
    "MeSuccessResponse"
);

export const usernameAvailabilityDataSchema = registry.register(
    "UsernameAvailability",
    z.object({
        username: z.string(),
        available: z.boolean(),
    })
);

export const usernameAvailabilitySuccessResponseSchema = successResponseSchema(
    usernameAvailabilityDataSchema,
    "UsernameAvailabilitySuccessResponse"
);

export const profileMediaUploadDataSchema = registry.register(
    "ProfileMediaUpload",
    z.object({
        path: z.string(),
        signedUrl: z.url(),
    })
);

export const profileMediaUploadSuccessResponseSchema = successResponseSchema(
    profileMediaUploadDataSchema,
    "ProfileMediaUploadSuccessResponse"
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

export const publishedTrackListSuccessResponseSchema = successResponseSchema(
    z.array(publishedTrackItemSchema),
    "PublishedTrackListSuccessResponse"
);

export const publishedTrackSuccessResponseSchema = successResponseSchema(
    publishedTrackItemSchema,
    "PublishedTrackSuccessResponse"
);

export const trackCommentListSuccessResponseSchema = successResponseSchema(
    z.array(trackCommentSchema),
    "TrackCommentListSuccessResponse"
);

export const trackCommentSuccessResponseSchema = successResponseSchema(
    trackCommentSchema,
    "TrackCommentSuccessResponse"
);

export const deleteCommentSuccessResponseSchema = successResponseSchema(
    deleteCommentDataSchema,
    "DeleteCommentSuccessResponse"
);

export const commentLikeSuccessResponseSchema = successResponseSchema(
    commentLikeDataSchema,
    "CommentLikeSuccessResponse"
);

export const projectSummarySuccessResponseSchema = successResponseSchema(
    projectSummarySchema,
    "ProjectSummarySuccessResponse"
);

export const projectListSuccessResponseSchema = successResponseSchema(
    z.array(projectSummarySchema),
    "ProjectListSuccessResponse"
);

export const projectDetailSuccessResponseSchema = successResponseSchema(
    projectDetailSchema,
    "ProjectDetailSuccessResponse"
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
        avatarUrl: z.url().nullable(),
    })
);

export const publicUserProfileSchema = registry.register(
    "PublicUserProfile",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        bio: z.string().nullable(),
        avatarUrl: z.url().nullable(),
        coverUrl: z.url().nullable(),
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
        kind: z.enum(["ARTIST", "SONG", "ALBUM", "PLAYLIST"]),
        targetKey: z.string(),
        query: z.string().nullable(),
        title: z.string().nullable(),
        subtitle: z.string().nullable(),
        coverUrl: z.string().nullable(),
        targetUser: userSearchResultSchema.nullable(),
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

export const followListUserSchema = registry.register(
    "FollowListUser",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
        isFollowing: z.boolean(),
    })
);

export const followListPageSchema = registry.register(
    "FollowListPage",
    z.object({
        items: z.array(followListUserSchema),
        nextCursor: z.uuid().nullable(),
    })
);

export const followListSuccessResponseSchema = successResponseSchema(
    followListPageSchema,
    "FollowListSuccessResponse"
);

export const searchTrackItemSchema = registry.register(
    "SearchTrackItem",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.string().nullable(),
        mixUrl: z.string().nullable(),
        playCount: z.number().int(),
        durationMs: z.number().int(),
        artist: z.object({
            id: z.uuid(),
            username: z.string(),
            name: z.string().nullable(),
            avatarUrl: z.url().nullable(),
        }),
    })
);

export const searchPlaylistItemSchema = registry.register(
    "SearchPlaylistItem",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.string().nullable(),
        trackCount: z.number().int(),
        owner: z.object({
            id: z.uuid(),
            username: z.string(),
            name: z.string().nullable(),
            avatarUrl: z.url().nullable(),
        }),
    })
);

export const searchAlbumItemSchema = registry.register(
    "SearchAlbumItem",
    z.object({
        id: z.uuid(),
        title: z.string(),
        coverUrl: z.string().nullable(),
        trackCount: z.number().int(),
        releasedAt: z.iso.datetime().nullable(),
        artist: z.object({
            id: z.uuid(),
            username: z.string(),
            name: z.string().nullable(),
            avatarUrl: z.url().nullable(),
        }),
    })
);

const firstMusicTrackSchema = z.object({
    id: z.uuid(),
    title: z.string(),
    mixUrl: z.url().nullable(),
    coverUrl: z.url().nullable(),
    artistName: z.string(),
});

export const musicSearchItemSchema = registry.register(
    "MusicSearchItem",
    z.discriminatedUnion("type", [
        z.object({
            type: z.literal("song"),
            id: z.uuid(),
            title: z.string(),
            subtitle: z.string(),
            coverUrl: z.url().nullable(),
            mixUrl: z.url().nullable(),
            playCount: z.number().int(),
            artist: z.object({
                id: z.uuid(),
                username: z.string(),
                name: z.string().nullable(),
            }),
        }),
        z.object({
            type: z.literal("playlist"),
            id: z.uuid(),
            title: z.string(),
            subtitle: z.string(),
            coverUrl: z.url().nullable(),
            trackCount: z.number().int(),
            saveCount: z.number().int(),
            firstTrack: firstMusicTrackSchema.nullable(),
        }),
        z.object({
            type: z.literal("album"),
            id: z.uuid(),
            title: z.string(),
            subtitle: z.string(),
            coverUrl: z.url().nullable(),
            trackCount: z.number().int(),
            firstTrack: firstMusicTrackSchema.nullable(),
        }),
    ])
);

export const musicSearchListSuccessResponseSchema = successResponseSchema(
    z.array(musicSearchItemSchema),
    "MusicSearchListSuccessResponse"
);

export const searchTrackListSuccessResponseSchema = successResponseSchema(
    z.array(searchTrackItemSchema),
    "SearchTrackListSuccessResponse"
);

export const searchPlaylistListSuccessResponseSchema = successResponseSchema(
    z.array(searchPlaylistItemSchema),
    "SearchPlaylistListSuccessResponse"
);

export const searchAlbumListSuccessResponseSchema = successResponseSchema(
    z.array(searchAlbumItemSchema),
    "SearchAlbumListSuccessResponse"
);

export const searchRecentListSuccessResponseSchema = successResponseSchema(
    z.array(searchRecentItemSchema),
    "SearchRecentListSuccessResponse"
);

export const clearSearchRecentSuccessResponseSchema = successResponseSchema(
    clearSearchRecentDataSchema,
    "ClearSearchRecentSuccessResponse"
);

export const conversationIdParamSchema = registry.registerParameter(
    "ConversationId",
    z.uuid("Invalid conversation ID").openapi({
        param: { name: "id", in: "path" },
        example: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
        description: "Conversation UUID",
    })
);

export const chatParticipantSchema = registry.register(
    "ChatParticipant",
    z.object({
        id: z.uuid(),
        username: z.string(),
        name: z.string().nullable(),
        avatarUrl: z.url().nullable(),
    })
);

export const conversationSummarySchema = registry.register(
    "ConversationSummary",
    z.object({
        id: z.uuid(),
        status: z.enum(["PENDING", "ACCEPTED", "DECLINED"]),
        participant: chatParticipantSchema,
        previewKind: z.enum(["text", "voice-note"]),
        previewText: z.string(),
        lastMessageAt: z.iso.datetime().nullable(),
        unread: z.boolean(),
    })
);

export const messageRequestItemSchema = registry.register(
    "MessageRequestItem",
    z.object({
        id: z.uuid(),
        participant: chatParticipantSchema,
        message: z.string(),
        requestedAt: z.iso.datetime(),
    })
);

export const chatMessageSchema = registry.register(
    "ChatMessage",
    z.object({
        id: z.uuid(),
        conversationId: z.uuid(),
        senderId: z.uuid(),
        type: z.enum(["TEXT", "AUDIO"]),
        body: z.string().nullable(),
        audioUrl: z.url().nullable(),
        audioPath: z.string().nullable(),
        durationMs: z.number().int().nullable(),
        createdAt: z.iso.datetime(),
    })
);

export const createConversationRequestDataSchema = registry.register(
    "CreateConversationRequestData",
    z.object({
        conversation: conversationSummarySchema,
        message: chatMessageSchema,
    })
);

export const listMessagesDataSchema = registry.register(
    "ListMessagesData",
    z.object({
        messages: z.array(chatMessageSchema),
        nextCursor: z.uuid().nullable(),
    })
);

export const audioUploadUrlDataSchema = registry.register(
    "ChatAudioUploadUrlData",
    z.object({
        messageId: z.uuid(),
        upload: signedUploadSchema,
    })
);

export const realtimeTokenDataSchema = registry.register(
    "RealtimeTokenData",
    z.object({
        token: z.string(),
        expiresIn: z.number().int(),
        wsUrl: z.string().nullable(),
    })
);

export const createConversationRequestSuccessResponseSchema =
    successResponseSchema(
        createConversationRequestDataSchema,
        "CreateConversationRequestSuccessResponse"
    );

export const conversationListSuccessResponseSchema = successResponseSchema(
    z.array(conversationSummarySchema),
    "ConversationListSuccessResponse"
);

export const messageRequestListSuccessResponseSchema = successResponseSchema(
    z.array(messageRequestItemSchema),
    "MessageRequestListSuccessResponse"
);

export const conversationSummarySuccessResponseSchema = successResponseSchema(
    conversationSummarySchema,
    "ConversationSummarySuccessResponse"
);

export const listMessagesSuccessResponseSchema = successResponseSchema(
    listMessagesDataSchema,
    "ListMessagesSuccessResponse"
);

export const chatMessageSuccessResponseSchema = successResponseSchema(
    chatMessageSchema,
    "ChatMessageSuccessResponse"
);

export const audioUploadUrlSuccessResponseSchema = successResponseSchema(
    audioUploadUrlDataSchema,
    "ChatAudioUploadUrlSuccessResponse"
);

export const realtimeTokenSuccessResponseSchema = successResponseSchema(
    realtimeTokenDataSchema,
    "RealtimeTokenSuccessResponse"
);
