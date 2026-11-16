import { v7 as uuidv7 } from "uuid";
import type { User } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import {
    assertR2Configured,
    buildAvatarPath,
    buildCoverPath,
    deleteObject,
    objectExists,
    PROFILE_MEDIA,
    presignPut,
    publicUrl,
    type ProfileImageContentType,
} from "@/server/config/r2";
import { AppError } from "@/server/utils/global-error";
import { followService } from "@/server/modules/follow/follow.service";
import type { SearchUsersQuerySchema } from "./user.validator";
import type {
    PatchProfileSchema,
    ProfileMediaCompleteSchema,
    ProfileMediaUploadUrlSchema,
} from "./profile.validator";

const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type MeDto = {
    id: string;
    email: string;
    username: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    preferredGenres: string[];
    canChangeUsername: boolean;
    usernameChangeAvailableAt: string | null;
    unreadNotificationCount: number;
    createdAt: string;
    updatedAt: string;
};

export type UserSearchResult = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

export type PublicUserProfile = {
    id: string;
    username: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    followerCount: number;
    followingCount: number;
    isFollowing: boolean;
    isFollowedBy: boolean;
    isMutual: boolean;
    isSelf: boolean;
};

export type ProfileMediaUpload = {
    path: string;
    signedUrl: string;
};

export type ProfileMediaResult = {
    path: string;
    avatarUrl?: string | null;
    coverUrl?: string | null;
};

function cooldownMeta(usernameChangedAt: Date): {
    canChangeUsername: boolean;
    usernameChangeAvailableAt: string | null;
} {
    const availableAt = new Date(
        usernameChangedAt.getTime() + USERNAME_COOLDOWN_MS
    );
    const canChangeUsername = Date.now() >= availableAt.getTime();
    return {
        canChangeUsername,
        usernameChangeAvailableAt: canChangeUsername
            ? null
            : availableAt.toISOString(),
    };
}

export function toMeDto(
    user: User,
    unreadNotificationCount = 0
): MeDto {
    const { canChangeUsername, usernameChangeAvailableAt } = cooldownMeta(
        user.usernameChangedAt
    );
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatarUrl: publicUrl(user.avatarPath),
        coverUrl: publicUrl(user.coverPath),
        preferredGenres: user.preferredGenres ?? [],
        canChangeUsername,
        usernameChangeAvailableAt,
        unreadNotificationCount,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}

function assertOwnMediaPath(
    path: string,
    userId: string,
    kind: "avatars" | "covers"
): void {
    const prefix = `${kind}/${userId}/`;
    if (!path.startsWith(prefix) || path.includes("..")) {
        throw new AppError("Invalid media path", 400, "VALIDATION_ERROR");
    }
}

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

    public async getMe(userId: string): Promise<MeDto> {
        const user = await this.findById(userId);
        return this.toMeDtoWithUnread(user);
    }

    private async toMeDtoWithUnread(user: User): Promise<MeDto> {
        const unreadNotificationCount = await prisma.notification.count({
            where: { recipientId: user.id, readAt: null },
        });
        return toMeDto(user, unreadNotificationCount);
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
                avatarPath: true,
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

        return ranked.slice(0, limit).map((user) => ({
            id: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: publicUrl(user.avatarPath),
        }));
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
            bio: user.bio,
            avatarUrl: publicUrl(user.avatarPath),
            coverUrl: publicUrl(user.coverPath),
            followerCount: counts.followerCount,
            followingCount: counts.followingCount,
            isFollowing: relationship.isFollowing,
            isFollowedBy: relationship.isFollowedBy,
            isMutual: relationship.isMutual,
            isSelf,
        };
    }

    public async checkUsernameAvailability(
        viewerId: string,
        username: string
    ): Promise<{ username: string; available: boolean }> {
        const existing = await this.findByUsername(username);
        const available = !existing || existing.id === viewerId;
        return { username, available };
    }

    public async patchProfile(
        userId: string,
        payload: PatchProfileSchema
    ): Promise<MeDto> {
        const user = await this.findById(userId);
        const data: {
            name?: string | null;
            bio?: string | null;
            username?: string;
            usernameChangedAt?: Date;
            preferredGenres?: string[];
        } = {};

        if (payload.username !== undefined) {
            const { canChangeUsername } = cooldownMeta(user.usernameChangedAt);
            if (!canChangeUsername) {
                throw new AppError(
                    "Username can only be changed once every 7 days",
                    409,
                    "USERNAME_CHANGE_COOLDOWN"
                );
            }
            if (payload.username !== user.username) {
                const taken = await this.findByUsername(payload.username);
                if (taken && taken.id !== userId) {
                    throw new AppError(
                        "Username is already taken",
                        409,
                        "USERNAME_TAKEN"
                    );
                }
                data.username = payload.username;
                data.usernameChangedAt = new Date();
            }
        }

        if (payload.name !== undefined) {
            data.name = payload.name;
        }
        if (payload.bio !== undefined) {
            data.bio = payload.bio;
        }
        if (payload.preferredGenres !== undefined) {
            data.preferredGenres = [...new Set(payload.preferredGenres)].slice(
                0,
                6
            );
        }

        if (Object.keys(data).length === 0) {
            return this.toMeDtoWithUnread(user);
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data,
        });
        return this.toMeDtoWithUnread(updated);
    }

    public async createAvatarUploadUrl(
        userId: string,
        payload: ProfileMediaUploadUrlSchema
    ): Promise<ProfileMediaUpload> {
        assertR2Configured();
        this.assertContentType(payload.contentType);
        const path = buildAvatarPath(
            userId,
            uuidv7(),
            payload.contentType
        );
        return presignPut({ path, contentType: payload.contentType });
    }

    public async completeAvatarUpload(
        userId: string,
        payload: ProfileMediaCompleteSchema
    ): Promise<MeDto> {
        assertR2Configured();
        this.assertContentType(payload.contentType);
        assertOwnMediaPath(payload.path, userId, "avatars");

        const exists = await objectExists(payload.path);
        if (!exists) {
            throw new AppError(
                "Uploaded avatar was not found",
                400,
                "UPLOAD_NOT_FOUND"
            );
        }

        const user = await this.findById(userId);
        const previous = user.avatarPath;
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { avatarPath: payload.path },
        });

        if (previous && previous !== payload.path) {
            try {
                await deleteObject(previous);
            } catch {
                // Best-effort cleanup of previous object
            }
        }

        return this.toMeDtoWithUnread(updated);
    }

    public async deleteAvatar(userId: string): Promise<MeDto> {
        const user = await this.findById(userId);
        if (!user.avatarPath) {
            return this.toMeDtoWithUnread(user);
        }

        const previous = user.avatarPath;
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { avatarPath: null },
        });

        if (isR2Path(previous)) {
            try {
                assertR2Configured();
                await deleteObject(previous);
            } catch {
                // Best-effort
            }
        }

        return this.toMeDtoWithUnread(updated);
    }

    public async createCoverUploadUrl(
        userId: string,
        payload: ProfileMediaUploadUrlSchema
    ): Promise<ProfileMediaUpload> {
        assertR2Configured();
        this.assertContentType(payload.contentType);
        const path = buildCoverPath(userId, uuidv7(), payload.contentType);
        return presignPut({ path, contentType: payload.contentType });
    }

    public async completeCoverUpload(
        userId: string,
        payload: ProfileMediaCompleteSchema
    ): Promise<MeDto> {
        assertR2Configured();
        this.assertContentType(payload.contentType);
        assertOwnMediaPath(payload.path, userId, "covers");

        const exists = await objectExists(payload.path);
        if (!exists) {
            throw new AppError(
                "Uploaded cover was not found",
                400,
                "UPLOAD_NOT_FOUND"
            );
        }

        const user = await this.findById(userId);
        const previous = user.coverPath;
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { coverPath: payload.path },
        });

        if (previous && previous !== payload.path) {
            try {
                await deleteObject(previous);
            } catch {
                // Best-effort
            }
        }

        return this.toMeDtoWithUnread(updated);
    }

    public async deleteCover(userId: string): Promise<MeDto> {
        const user = await this.findById(userId);
        if (!user.coverPath) {
            return this.toMeDtoWithUnread(user);
        }

        const previous = user.coverPath;
        const updated = await prisma.user.update({
            where: { id: userId },
            data: { coverPath: null },
        });

        if (isR2Path(previous)) {
            try {
                assertR2Configured();
                await deleteObject(previous);
            } catch {
                // Best-effort
            }
        }

        return this.toMeDtoWithUnread(updated);
    }

    private assertContentType(contentType: string): asserts contentType is ProfileImageContentType {
        if (
            !(PROFILE_MEDIA.contentTypes as readonly string[]).includes(
                contentType
            )
        ) {
            throw new AppError(
                "Unsupported image type",
                400,
                "VALIDATION_ERROR"
            );
        }
    }
}

function isR2Path(path: string): boolean {
    return path.startsWith("avatars/") || path.startsWith("covers/");
}

export const userService = new UserService();

/** Exported for unit tests */
export const __test = {
    cooldownMeta,
    USERNAME_COOLDOWN_MS,
};
