import { v7 as uuidv7 } from "uuid";
import {
    ConversationStatus,
    MessageType,
    type Conversation,
    type Message,
    type User,
} from "@/generated/prisma/client";
import { env } from "@/server/config/env";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { supabase } from "@/server/config/supabase";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import { generateJwtToken } from "@/server/lib/jwt";
import { notifyRealtime } from "@/server/lib/realtime-notify";
import {
    buildChatPrefix,
    buildChatVoiceNotePath,
} from "@/server/lib/storage-path";
import { AppError } from "@/server/utils/global-error";
import type {
    CreateConversationRequestSchema,
    ListMessagesQuerySchema,
    SendAudioMessageSchema,
    SendTextMessageSchema,
} from "./conversation.validator";

type ParticipantDto = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

type ConversationSummaryDto = {
    id: string;
    status: ConversationStatus;
    participant: ParticipantDto;
    previewKind: "text" | "voice-note";
    previewText: string;
    lastMessageAt: string | null;
    unread: boolean;
};

type RequestItemDto = {
    id: string;
    participant: ParticipantDto;
    message: string;
    requestedAt: string;
};

type MessageDto = {
    id: string;
    conversationId: string;
    senderId: string;
    type: "TEXT" | "AUDIO";
    body: string | null;
    audioUrl: string | null;
    audioPath: string | null;
    durationMs: number | null;
    createdAt: string;
};

type SignedUpload = {
    path: string;
    signedUrl: string;
    token: string;
};

type ConversationWithUsers = Conversation & {
    userLow: Pick<User, "id" | "username" | "name" | "avatarPath">;
    userHigh: Pick<User, "id" | "username" | "name" | "avatarPath">;
};

const userSelect = {
    id: true,
    username: true,
    name: true,
    avatarPath: true,
} as const;

function pairIds(a: string, b: string): { userLowId: string; userHighId: string } {
    return a < b
        ? { userLowId: a, userHighId: b }
        : { userLowId: b, userHighId: a };
}

function otherParticipant(
    conversation: ConversationWithUsers,
    viewerId: string
): ParticipantDto {
    const other =
        conversation.userLowId === viewerId
            ? conversation.userHigh
            : conversation.userLow;
    return {
        id: other.id,
        username: other.username,
        name: other.name,
        avatarUrl: publicUrl(other.avatarPath),
    };
}

function isParticipant(conversation: Conversation, userId: string): boolean {
    return (
        conversation.userLowId === userId || conversation.userHighId === userId
    );
}

function previewFromMessage(message: Message | null): {
    previewKind: "text" | "voice-note";
    previewText: string;
} {
    if (!message) {
        return { previewKind: "text", previewText: "" };
    }
    if (message.type === MessageType.AUDIO) {
        return { previewKind: "voice-note", previewText: "Voice note" };
    }
    return {
        previewKind: "text",
        previewText: message.body?.trim() || "",
    };
}

class ConversationService {
    public async createRequest(
        viewerId: string,
        payload: CreateConversationRequestSchema
    ): Promise<{
        conversation: ConversationSummaryDto;
        message: MessageDto;
    }> {
        if (viewerId === payload.userId) {
            throw new AppError(
                "Cannot message yourself",
                400,
                "BAD_REQUEST"
            );
        }

        await this.assertUserExists(payload.userId);

        const { userLowId, userHighId } = pairIds(viewerId, payload.userId);
        const existing = await prisma.conversation.findUnique({
            where: { userLowId_userHighId: { userLowId, userHighId } },
            include: {
                userLow: { select: userSelect },
                userHigh: { select: userSelect },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        if (existing?.status === ConversationStatus.ACCEPTED) {
            throw new AppError(
                "Conversation already accepted. Send a message instead.",
                400,
                "BAD_REQUEST"
            );
        }

        if (
            existing?.status === ConversationStatus.PENDING &&
            existing.initiatedById === viewerId
        ) {
            const latest = existing.messages[0];
            if (!latest) {
                throw new AppError(
                    "Pending conversation is missing a request message",
                    500,
                    "INTERNAL_SERVER_ERROR"
                );
            }
            return {
                conversation: this.toSummary(existing, viewerId, latest),
                message: await this.toMessageDto(latest),
            };
        }

        const now = new Date();
        const messageId = uuidv7();

        const conversation = await prisma.$transaction(async (tx) => {
            const row = existing
                ? await tx.conversation.update({
                      where: { id: existing.id },
                      data: {
                          status: ConversationStatus.PENDING,
                          initiatedById: viewerId,
                          lastMessageAt: now,
                      },
                      include: {
                          userLow: { select: userSelect },
                          userHigh: { select: userSelect },
                      },
                  })
                : await tx.conversation.create({
                      data: {
                          userLowId,
                          userHighId,
                          status: ConversationStatus.PENDING,
                          initiatedById: viewerId,
                          lastMessageAt: now,
                      },
                      include: {
                          userLow: { select: userSelect },
                          userHigh: { select: userSelect },
                      },
                  });

            const message = await tx.message.create({
                data: {
                    id: messageId,
                    conversationId: row.id,
                    senderId: viewerId,
                    type: MessageType.TEXT,
                    body: payload.body,
                },
            });

            return { row, message };
        });

        return {
            conversation: this.toSummary(
                conversation.row,
                viewerId,
                conversation.message
            ),
            message: await this.toMessageDto(conversation.message),
        };
    }

    public async listInbox(viewerId: string): Promise<ConversationSummaryDto[]> {
        const rows = await prisma.conversation.findMany({
            where: {
                status: ConversationStatus.ACCEPTED,
                OR: [{ userLowId: viewerId }, { userHighId: viewerId }],
            },
            include: {
                userLow: { select: userSelect },
                userHigh: { select: userSelect },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        });

        return rows.map((row) =>
            this.toSummary(row, viewerId, row.messages[0] ?? null)
        );
    }

    public async listRequests(viewerId: string): Promise<RequestItemDto[]> {
        const rows = await prisma.conversation.findMany({
            where: {
                status: ConversationStatus.PENDING,
                initiatedById: { not: viewerId },
                OR: [{ userLowId: viewerId }, { userHighId: viewerId }],
            },
            include: {
                userLow: { select: userSelect },
                userHigh: { select: userSelect },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
        });

        return rows.map((row) => {
            const latest = row.messages[0];
            return {
                id: row.id,
                participant: otherParticipant(row, viewerId),
                message: latest?.body?.trim() || "",
                requestedAt: (
                    latest?.createdAt ??
                    row.lastMessageAt ??
                    row.createdAt
                ).toISOString(),
            };
        });
    }

    public async accept(
        viewerId: string,
        conversationId: string
    ): Promise<ConversationSummaryDto> {
        const conversation = await this.getConversationOrThrow(conversationId);

        this.assertCanRespondToRequest(conversation, viewerId);

        const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: ConversationStatus.ACCEPTED },
            include: {
                userLow: { select: userSelect },
                userHigh: { select: userSelect },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        void notifyRealtime({
            type: "conversation.accepted",
            conversationId,
        });

        return this.toSummary(
            updated,
            viewerId,
            updated.messages[0] ?? null
        );
    }

    public async decline(
        viewerId: string,
        conversationId: string
    ): Promise<ConversationSummaryDto> {
        const conversation = await this.getConversationOrThrow(conversationId);

        this.assertCanRespondToRequest(conversation, viewerId);

        const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: { status: ConversationStatus.DECLINED },
            include: {
                userLow: { select: userSelect },
                userHigh: { select: userSelect },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        void notifyRealtime({
            type: "conversation.declined",
            conversationId,
        });

        return this.toSummary(
            updated,
            viewerId,
            updated.messages[0] ?? null
        );
    }

    public async listMessages(
        viewerId: string,
        conversationId: string,
        query: ListMessagesQuerySchema
    ): Promise<{ messages: MessageDto[]; nextCursor: string | null }> {
        const conversation = await this.getConversationOrThrow(conversationId);
        if (!isParticipant(conversation, viewerId)) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }

        if (conversation.status === ConversationStatus.DECLINED) {
            throw new AppError(
                "Conversation is declined",
                403,
                "FORBIDDEN"
            );
        }

        const limit = query.limit;
        const rows = await prisma.message.findMany({
            where: {
                conversationId,
                ...(query.cursor
                    ? {
                          createdAt: {
                              gt: await this.cursorCreatedAt(
                                  conversationId,
                                  query.cursor
                              ),
                          },
                      }
                    : {}),
            },
            orderBy: { createdAt: "asc" },
            take: limit + 1,
        });

        const page = rows.slice(0, limit);
        const messages = await Promise.all(
            page.map((message) => this.toMessageDto(message))
        );
        const nextCursor =
            rows.length > limit ? page[page.length - 1]?.id ?? null : null;

        return { messages, nextCursor };
    }

    public async sendText(
        viewerId: string,
        conversationId: string,
        payload: SendTextMessageSchema
    ): Promise<MessageDto> {
        const conversation = await this.requireAcceptedParticipant(
            viewerId,
            conversationId
        );

        const message = await prisma.$transaction(async (tx) => {
            const created = await tx.message.create({
                data: {
                    conversationId: conversation.id,
                    senderId: viewerId,
                    type: MessageType.TEXT,
                    body: payload.body,
                },
            });
            await tx.conversation.update({
                where: { id: conversation.id },
                data: { lastMessageAt: created.createdAt },
            });
            return created;
        });

        const dto = await this.toMessageDto(message);
        void notifyRealtime({
            type: "message.created",
            conversationId,
            message: dto,
        });
        return dto;
    }

    public async createAudioUploadUrl(
        viewerId: string,
        conversationId: string
    ): Promise<{ messageId: string; upload: SignedUpload }> {
        await this.requireAcceptedParticipant(viewerId, conversationId);

        const messageId = uuidv7();
        const path = buildChatVoiceNotePath(
            viewerId,
            conversationId,
            messageId
        );
        const upload = await this.createSignedUploadUrl(path);
        return { messageId, upload };
    }

    public async sendAudio(
        viewerId: string,
        conversationId: string,
        payload: SendAudioMessageSchema
    ): Promise<MessageDto> {
        await this.requireAcceptedParticipant(viewerId, conversationId);

        const expectedPrefix = buildChatPrefix(viewerId, conversationId);
        if (
            !payload.path.startsWith(`${expectedPrefix}/`) ||
            payload.path.includes("..")
        ) {
            throw new AppError("Invalid audio path", 400, "BAD_REQUEST");
        }

        const fileName = payload.path.split("/").pop();
        if (!fileName) {
            throw new AppError("Invalid audio path", 400, "BAD_REQUEST");
        }

        const exists = await this.objectExists(expectedPrefix, fileName);
        if (!exists) {
            throw new AppError(
                "Audio object not found. Upload first.",
                400,
                "BAD_REQUEST"
            );
        }

        const messageId = fileName.replace(
            new RegExp(`\\.${STORAGE_CONFIG.chat.extension}$`),
            ""
        );

        const message = await prisma.$transaction(async (tx) => {
            const created = await tx.message.create({
                data: {
                    id: messageId,
                    conversationId,
                    senderId: viewerId,
                    type: MessageType.AUDIO,
                    audioPath: payload.path,
                    durationMs: payload.durationMs,
                },
            });
            await tx.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: created.createdAt },
            });
            return created;
        });

        const dto = await this.toMessageDto(message);
        void notifyRealtime({
            type: "message.created",
            conversationId,
            message: dto,
        });
        return dto;
    }

    public async createRealtimeToken(
        viewerId: string,
        conversationId: string
    ): Promise<{ token: string; expiresIn: number; wsUrl: string | null }> {
        const conversation = await this.getConversationOrThrow(conversationId);
        if (!isParticipant(conversation, viewerId)) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }
        if (conversation.status === ConversationStatus.DECLINED) {
            throw new AppError(
                "Conversation is declined",
                403,
                "FORBIDDEN"
            );
        }

        const expiresIn = 60 * 10;
        const secret =
            env.REALTIME_TOKEN_SECRET || env.JWT_ACCESS_SECRET;
        const token = generateJwtToken(
            {
                conversationId,
                userId: viewerId,
                purpose: "chat-realtime",
            },
            secret,
            expiresIn
        );

        return {
            token,
            expiresIn,
            wsUrl: env.REALTIME_WORKER_URL
                ? `${env.REALTIME_WORKER_URL.replace(/\/$/, "")}/ws`
                : null,
        };
    }

    public async getConversationSummaryForViewer(
        viewerId: string,
        conversationId: string
    ): Promise<ConversationSummaryDto | null> {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                userLow: { select: userSelect },
                userHigh: { select: userSelect },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });
        if (!conversation || !isParticipant(conversation, viewerId)) {
            return null;
        }
        return this.toSummary(
            conversation,
            viewerId,
            conversation.messages[0] ?? null
        );
    }

    private async requireAcceptedParticipant(
        viewerId: string,
        conversationId: string
    ): Promise<Conversation> {
        const conversation = await this.getConversationOrThrow(conversationId);
        if (!isParticipant(conversation, viewerId)) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }
        if (conversation.status !== ConversationStatus.ACCEPTED) {
            throw new AppError(
                "Conversation must be accepted before messaging",
                403,
                "FORBIDDEN"
            );
        }
        return conversation;
    }

    private assertCanRespondToRequest(
        conversation: Conversation,
        viewerId: string
    ): void {
        if (!isParticipant(conversation, viewerId)) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }
        if (conversation.status !== ConversationStatus.PENDING) {
            throw new AppError(
                "Conversation is not pending",
                400,
                "BAD_REQUEST"
            );
        }
        if (conversation.initiatedById === viewerId) {
            throw new AppError(
                "Only the recipient can accept or decline",
                403,
                "FORBIDDEN"
            );
        }
    }

    private async getConversationOrThrow(
        conversationId: string
    ): Promise<Conversation> {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new AppError(
                "Conversation not found",
                404,
                "RESOURCE_NOT_FOUND"
            );
        }
        return conversation;
    }

    private async assertUserExists(userId: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }
    }

    private async cursorCreatedAt(
        conversationId: string,
        cursor: string
    ): Promise<Date> {
        const row = await prisma.message.findFirst({
            where: { id: cursor, conversationId },
            select: { createdAt: true },
        });
        if (!row) {
            throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
        }
        return row.createdAt;
    }

    private toSummary(
        conversation: ConversationWithUsers,
        viewerId: string,
        latest: Message | null
    ): ConversationSummaryDto {
        const preview = previewFromMessage(latest);
        return {
            id: conversation.id,
            status: conversation.status,
            participant: otherParticipant(conversation, viewerId),
            previewKind: preview.previewKind,
            previewText: preview.previewText,
            lastMessageAt:
                conversation.lastMessageAt?.toISOString() ??
                latest?.createdAt.toISOString() ??
                null,
            unread: false,
        };
    }

    private async toMessageDto(message: Message): Promise<MessageDto> {
        return {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            type: message.type,
            body: message.body,
            audioPath: message.audioPath,
            audioUrl: await this.createSignedUrl(message.audioPath),
            durationMs: message.durationMs,
            createdAt: message.createdAt.toISOString(),
        };
    }

    private async createSignedUploadUrl(path: string): Promise<SignedUpload> {
        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .createSignedUploadUrl(path, { upsert: true });

        if (error || !data) {
            throw new AppError(
                error?.message ?? "Failed to create upload URL",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }

        return {
            path,
            signedUrl: data.signedUrl,
            token: data.token,
        };
    }

    private async createSignedUrl(
        storagePath: string | null
    ): Promise<string | null> {
        if (!storagePath) {
            return null;
        }

        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .createSignedUrl(
                storagePath,
                STORAGE_CONFIG.signedPlaybackUrlTtlSeconds
            );

        if (error || !data?.signedUrl) {
            throw new AppError(
                error?.message ?? "Failed to create signed URL",
                500,
                "INTERNAL_SERVER_ERROR"
            );
        }

        return data.signedUrl;
    }

    private async objectExists(
        prefix: string,
        fileName: string
    ): Promise<boolean> {
        const { data, error } = await supabase.storage
            .from(STORAGE_CONFIG.bucket)
            .list(prefix);

        if (error || !data) {
            return false;
        }

        return data.some((file) => file.name === fileName);
    }
}

export const conversationService = new ConversationService();
