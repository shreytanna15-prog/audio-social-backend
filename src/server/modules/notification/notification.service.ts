import {
    NotificationType,
    type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";
import { AppError } from "@/server/utils/global-error";
import type {
    ListNotificationsQuerySchema,
    MarkNotificationsReadSchema,
} from "./notification.validator";

export type NotificationActor = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

export type NotificationTrackSummary = {
    id: string;
    title: string;
    coverUrl: string | null;
};

export type NotificationItem = {
    id: string;
    type: NotificationType;
    createdAt: string;
    readAt: string | null;
    actor: NotificationActor;
    track: NotificationTrackSummary | null;
};

export type NotificationPage = {
    items: NotificationItem[];
    nextCursor: string | null;
};

export type UnreadCountResult = {
    count: number;
};

export type MarkReadResult = {
    markedCount: number;
};

export type CreateNotificationInput = {
    recipientId: string;
    actorId: string;
    type: NotificationType;
    trackId?: string | null;
    commentId?: string | null;
};

class NotificationService {
    public async createQuietly(
        input: CreateNotificationInput
    ): Promise<void> {
        if (input.recipientId === input.actorId) return;

        try {
            await prisma.notification.create({
                data: {
                    recipientId: input.recipientId,
                    actorId: input.actorId,
                    type: input.type,
                    trackId: input.trackId ?? null,
                    commentId: input.commentId ?? null,
                },
            });
        } catch {
            // Fan-out must not fail the primary action (like / follow / comment).
        }
    }

    public async unreadCount(recipientId: string): Promise<number> {
        return prisma.notification.count({
            where: { recipientId, readAt: null },
        });
    }

    public async getUnreadCount(
        recipientId: string
    ): Promise<UnreadCountResult> {
        return { count: await this.unreadCount(recipientId) };
    }

    public async listNotifications(
        recipientId: string,
        query: ListNotificationsQuerySchema
    ): Promise<NotificationPage> {
        const limit = query.limit;
        let cursorCreatedAt: Date | undefined;

        if (query.cursor) {
            const cursorRow = await prisma.notification.findFirst({
                where: { id: query.cursor, recipientId },
                select: { createdAt: true },
            });
            if (!cursorRow) {
                throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
            }
            cursorCreatedAt = cursorRow.createdAt;
        }

        const rows = await prisma.notification.findMany({
            where: {
                recipientId,
                ...(cursorCreatedAt
                    ? {
                          OR: [
                              { createdAt: { lt: cursorCreatedAt } },
                              {
                                  createdAt: cursorCreatedAt,
                                  id: { lt: query.cursor! },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            include: {
                actor: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
                track: {
                    select: {
                        id: true,
                        title: true,
                        coverPath: true,
                    },
                },
            },
        });

        const page = rows.slice(0, limit);
        const items = await Promise.all(
            page.map(async (row) => {
                const coverUrl = row.track?.coverPath
                    ? await objectStorage.createSignedDownloadUrl(
                          row.track.coverPath
                      )
                    : null;

                return {
                    id: row.id,
                    type: row.type,
                    createdAt: row.createdAt.toISOString(),
                    readAt: row.readAt?.toISOString() ?? null,
                    actor: {
                        id: row.actor.id,
                        username: row.actor.username,
                        name: row.actor.name,
                        avatarUrl: publicUrl(row.actor.avatarPath),
                    },
                    track: row.track
                        ? {
                              id: row.track.id,
                              title: row.track.title,
                              coverUrl,
                          }
                        : null,
                } satisfies NotificationItem;
            })
        );

        const nextCursor =
            rows.length > limit ? (page[page.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }

    public async markRead(
        recipientId: string,
        payload: MarkNotificationsReadSchema
    ): Promise<MarkReadResult> {
        const now = new Date();
        const ids = payload.ids?.filter(Boolean);

        const where: Prisma.NotificationWhereInput = {
            recipientId,
            readAt: null,
            ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
        };

        const result = await prisma.notification.updateMany({
            where,
            data: { readAt: now },
        });

        return { markedCount: result.count };
    }
}

export const notificationService = new NotificationService();
