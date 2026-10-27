import type { User } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { AppError } from "@/server/utils/global-error";
import { followService } from "@/server/modules/follow/follow.service";
import type { SearchUsersQuerySchema } from "./user.validator";

export type UserSearchResult = {
    id: string;
    username: string;
    name: string | null;
};

export type PublicUserProfile = {
    id: string;
    username: string;
    name: string | null;
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
    isSelf: boolean;
};

class UserService {
    public async findByEmail(email: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { email },
        });
    }

    public async findByUsername(username: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { username },
        });
    }

    public async findById(id: string): Promise<User> {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        return user;
    }

    public async searchUsers(
        viewerId: string,
        query: SearchUsersQuerySchema
    ): Promise<UserSearchResult[]> {
        const q = query.q.trim();
        const limit = query.limit;

        const users = await prisma.user.findMany({
            where: {
                id: { not: viewerId },
                OR: [
                    {
                        username: {
                            contains: q,
                            mode: "insensitive",
                        },
                    },
                    {
                        name: {
                            contains: q,
                            mode: "insensitive",
                        },
                    },
                ],
            },
            select: {
                id: true,
                username: true,
                name: true,
            },
            take: limit * 3,
            orderBy: { username: "asc" },
        });

        const lowerQ = q.toLowerCase();
        const ranked = [...users].sort((a, b) => {
            const aPrefix = a.username.toLowerCase().startsWith(lowerQ) ? 0 : 1;
            const bPrefix = b.username.toLowerCase().startsWith(lowerQ) ? 0 : 1;
            if (aPrefix !== bPrefix) {
                return aPrefix - bPrefix;
            }
            return a.username.localeCompare(b.username);
        });

        return ranked.slice(0, limit);
    }

    public async getPublicProfile(
        viewerId: string,
        targetUserId: string
    ): Promise<PublicUserProfile> {
        const user = await this.findById(targetUserId);
        const isSelf = viewerId === targetUserId;

        const [counts, relationship] = await Promise.all([
            followService.getCounts(targetUserId),
            isSelf
                ? Promise.resolve({
                      isFollowing: false,
                      isFollowedBy: false,
                      isMutual: false,
                  })
                : followService.getRelationship(viewerId, targetUserId),
        ]);

        return {
            id: user.id,
            username: user.username,
            name: user.name,
            followerCount: counts.followerCount,
            followingCount: counts.followingCount,
            isFollowing: relationship.isFollowing,
            isFollowedBy: relationship.isFollowedBy,
            isMutual: relationship.isMutual,
            isSelf,
        };
    }
}

export const userService = new UserService();
