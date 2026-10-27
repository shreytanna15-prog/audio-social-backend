import { prisma } from "@/server/config/prisma";
import { AppError } from "@/server/utils/global-error";

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

        await prisma.follow.upsert({
            where: {
                followerId_followingId: {
                    followerId: viewerId,
                    followingId: targetUserId,
                },
            },
            create: {
                followerId: viewerId,
                followingId: targetUserId,
            },
            update: {},
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
