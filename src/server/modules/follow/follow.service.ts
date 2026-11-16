import { NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { notificationService } from "@/server/modules/notification/notification.service";
import { AppError } from "@/server/utils/global-error";
import type { FollowListQuerySchema } from "./follow.validator";

export type RelationshipFlags = {
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
};

export type FollowCounts = {
    followerCount: number;
    followingCount: number;
};

export type FollowActionResult = FollowCounts &
    RelationshipFlags & {
        id: string;
    };

export type FollowListUser = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    isFollowing: boolean;
};

export type FollowListPage = {
    items: FollowListUser[];
    nextCursor: string | null;
};

class FollowService {
    public async getRelationship(
        viewerId: string,
        targetUserId: string
    ): Promise<RelationshipFlags> {
        const [outgoing, incoming] = await Promise.all([
            prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: viewerId,
                        followingId: targetUserId,
                    },
                },
                select: { id: true },
            }),
            prisma.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: targetUserId,
                        followingId: viewerId,
                    },
                },
                select: { id: true },
            }),
        ]);

        const isFollowing = outgoing != null;
        const isFollowedBy = incoming != null;

        return {
            isFollowing,
            isFollowedBy,
            isMutual: isFollowing && isFollowedBy,
        };
    }

    public async getCounts(userId: string): Promise<FollowCounts> {
        const [followerCount, followingCount] = await Promise.all([
            prisma.follow.count({ where: { followingId: userId } }),
            prisma.follow.count({ where: { followerId: userId } }),
        ]);

        return { followerCount, followingCount };
    }

    public async follow(
        viewerId: string,
        targetUserId: string
    ): Promise<FollowActionResult> {
        if (viewerId === targetUserId) {
            throw new AppError("Cannot follow yourself", 400, "BAD_REQUEST");
        }

        await this.assertUserExists(targetUserId);

        const { count } = await prisma.follow.createMany({
            data: [{ followerId: viewerId, followingId: targetUserId }],
            skipDuplicates: true,
        });

        if (count > 0) {
            await notificationService.createQuietly({
                recipientId: targetUserId,
                actorId: viewerId,
                type: NotificationType.FOLLOW,
            });
        }

        const [counts, relationship] = await Promise.all([
            this.getCounts(targetUserId),
            this.getRelationship(viewerId, targetUserId),
        ]);

        return {
            id: targetUserId,
            ...counts,
            ...relationship,
        };
    }

    public async unfollow(
        viewerId: string,
        targetUserId: string
    ): Promise<FollowActionResult> {
        if (viewerId === targetUserId) {
            throw new AppError("Cannot unfollow yourself", 400, "BAD_REQUEST");
        }

        await this.assertUserExists(targetUserId);

        await prisma.follow.deleteMany({
            where: {
                followerId: viewerId,
                followingId: targetUserId,
            },
        });

        const [counts, relationship] = await Promise.all([
            this.getCounts(targetUserId),
            this.getRelationship(viewerId, targetUserId),
        ]);

        return {
            id: targetUserId,
            ...counts,
            ...relationship,
        };
    }

    public async listFollowers(
        viewerId: string,
        targetUserId: string,
        query: FollowListQuerySchema
    ): Promise<FollowListPage> {
        await this.assertUserExists(targetUserId);

        const limit = query.limit;
        const cursorCreatedAt = query.cursor
            ? await this.followCursorCreatedAt(query.cursor, {
                  followingId: targetUserId,
              })
            : null;

        const rows = await prisma.follow.findMany({
            where: {
                followingId: targetUserId,
                ...(cursorCreatedAt
                    ? { createdAt: { lt: cursorCreatedAt } }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
            },
        });

        const page = rows.slice(0, limit);
        const userIds = page.map((row) => row.follower.id);
        const followingSet = await this.viewerFollowingSet(viewerId, userIds);

        return {
            items: page.map((row) => ({
                id: row.follower.id,
                username: row.follower.username,
                name: row.follower.name,
                avatarUrl: publicUrl(row.follower.avatarPath),
                isFollowing: followingSet.has(row.follower.id),
            })),
            nextCursor:
                rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
        };
    }

    public async listFollowing(
        viewerId: string,
        targetUserId: string,
        query: FollowListQuerySchema
    ): Promise<FollowListPage> {
        await this.assertUserExists(targetUserId);

        const limit = query.limit;
        const cursorCreatedAt = query.cursor
            ? await this.followCursorCreatedAt(query.cursor, {
                  followerId: targetUserId,
              })
            : null;

        const rows = await prisma.follow.findMany({
            where: {
                followerId: targetUserId,
                ...(cursorCreatedAt
                    ? { createdAt: { lt: cursorCreatedAt } }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
            },
        });

        const page = rows.slice(0, limit);
        const userIds = page.map((row) => row.following.id);
        const followingSet = await this.viewerFollowingSet(viewerId, userIds);

        return {
            items: page.map((row) => ({
                id: row.following.id,
                username: row.following.username,
                name: row.following.name,
                avatarUrl: publicUrl(row.following.avatarPath),
                isFollowing: followingSet.has(row.following.id),
            })),
            nextCursor:
                rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
        };
    }

    private async viewerFollowingSet(
        viewerId: string,
        userIds: string[]
    ): Promise<Set<string>> {
        if (userIds.length === 0) {
            return new Set();
        }

        const rows = await prisma.follow.findMany({
            where: {
                followerId: viewerId,
                followingId: { in: userIds },
            },
            select: { followingId: true },
        });

        return new Set(rows.map((row) => row.followingId));
    }

    private async followCursorCreatedAt(
        cursor: string,
        scope: { followerId: string } | { followingId: string }
    ): Promise<Date> {
        const row = await prisma.follow.findFirst({
            where: { id: cursor, ...scope },
            select: { createdAt: true },
        });

        if (!row) {
            throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
        }

        return row.createdAt;
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
}

export const followService = new FollowService();
