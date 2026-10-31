import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import * as r2 from "@/server/config/r2";
import { AppError } from "@/server/utils/global-error";
import { __test, toMeDto, userService } from "@/server/modules/user/user.service";
import type { User } from "@/generated/prisma/client";

const USER_ID = "11111111-1111-7111-8111-111111111111";

function baseUser(overrides: Partial<User> = {}): User {
    const now = new Date("2026-01-01T00:00:00.000Z");
    return {
        id: USER_ID,
        email: "me@test.com",
        password: "x",
        username: "meuser",
        name: "Me",
        bio: "Hello",
        avatarPath: null,
        coverPath: null,
        usernameChangedAt: now,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

describe("user profile (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("cooldownMeta unlocks after 7 days", () => {
        const changedAt = new Date(Date.now() - __test.USERNAME_COOLDOWN_MS - 1000);
        const meta = __test.cooldownMeta(changedAt);
        expect(meta.canChangeUsername).toBe(true);
        expect(meta.usernameChangeAvailableAt).toBeNull();
    });

    it("cooldownMeta locks within window", () => {
        const changedAt = new Date(Date.now() - 1000);
        const meta = __test.cooldownMeta(changedAt);
        expect(meta.canChangeUsername).toBe(false);
        expect(meta.usernameChangeAvailableAt).toBeTruthy();
    });

    it("toMeDto resolves public media URLs", () => {
        const dto = toMeDto(
            baseUser({
                avatarPath: "avatars/u/a.jpg",
                coverPath: "covers/u/c.jpg",
            })
        );
        expect(dto.avatarUrl).toBe("https://cdn.example.com/avatars/u/a.jpg");
        expect(dto.coverUrl).toBe("https://cdn.example.com/covers/u/c.jpg");
        expect(dto.bio).toBe("Hello");
        expect(dto.canChangeUsername).toBe(true);
    });

    it("checkUsernameAvailability treats own username as available", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser() as never);
        const result = await userService.checkUsernameAvailability(
            USER_ID,
            "meuser"
        );
        expect(result).toEqual({ username: "meuser", available: true });
    });

    it("checkUsernameAvailability marks taken usernames", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(
            baseUser({ id: "other", username: "taken" }) as never
        );
        const result = await userService.checkUsernameAvailability(
            USER_ID,
            "taken"
        );
        expect(result.available).toBe(false);
    });

    it("patchProfile rejects username during cooldown without applying fields", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(
            baseUser({ usernameChangedAt: new Date() }) as never
        );

        await expect(
            userService.patchProfile(USER_ID, {
                username: "newname",
                bio: "should-not-apply",
            })
        ).rejects.toMatchObject({
            code: "USERNAME_CHANGE_COOLDOWN",
            status: 409,
        } satisfies Partial<AppError>);

        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("patchProfile updates name/bio when username omitted during cooldown", async () => {
        const user = baseUser({ usernameChangedAt: new Date() });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
        vi.mocked(prisma.user.update).mockResolvedValue({
            ...user,
            name: "New",
            bio: "Bio",
        } as never);

        const dto = await userService.patchProfile(USER_ID, {
            name: "New",
            bio: "Bio",
        });

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: USER_ID },
            data: { name: "New", bio: "Bio" },
        });
        expect(dto.name).toBe("New");
        expect(dto.bio).toBe("Bio");
    });

    it("patchProfile resets usernameChangedAt on username change", async () => {
        const user = baseUser({
            usernameChangedAt: new Date(
                Date.now() - __test.USERNAME_COOLDOWN_MS - 1000
            ),
        });
        vi.mocked(prisma.user.findUnique)
            .mockResolvedValueOnce(user as never)
            .mockResolvedValueOnce(null);
        vi.mocked(prisma.user.update).mockResolvedValue({
            ...user,
            username: "freshname",
            usernameChangedAt: new Date(),
        } as never);

        const dto = await userService.patchProfile(USER_ID, {
            username: "freshname",
        });

        expect(prisma.user.update).toHaveBeenCalled();
        const updateArg = vi.mocked(prisma.user.update).mock.calls[0][0];
        expect(updateArg.data).toMatchObject({ username: "freshname" });
        expect(
            (updateArg.data as { usernameChangedAt: Date }).usernameChangedAt
        ).toBeInstanceOf(Date);
        expect(dto.username).toBe("freshname");
    });

    it("createAvatarUploadUrl returns presigned put", async () => {
        const result = await userService.createAvatarUploadUrl(USER_ID, {
            contentType: "image/jpeg",
        });
        expect(result.path).toMatch(
            new RegExp(`^avatars/${USER_ID}/.+\\.jpg$`)
        );
        expect(result.signedUrl).toContain("https://upload.example.com/");
        expect(r2.presignPut).toHaveBeenCalled();
    });

    it("completeAvatarUpload rejects foreign paths", async () => {
        await expect(
            userService.completeAvatarUpload(USER_ID, {
                path: "avatars/other/x.jpg",
                contentType: "image/jpeg",
            })
        ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("completeAvatarUpload sets path and deletes previous", async () => {
        const user = baseUser({ avatarPath: "avatars/u/old.jpg" });
        const nextPath = `avatars/${USER_ID}/new.jpg`;
        vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
        vi.mocked(prisma.user.update).mockResolvedValue({
            ...user,
            avatarPath: nextPath,
        } as never);

        const dto = await userService.completeAvatarUpload(USER_ID, {
            path: nextPath,
            contentType: "image/jpeg",
        });

        expect(r2.objectExists).toHaveBeenCalledWith(nextPath);
        expect(r2.deleteObject).toHaveBeenCalledWith("avatars/u/old.jpg");
        expect(dto.avatarUrl).toBe(`https://cdn.example.com/${nextPath}`);
    });

    it("deleteAvatar clears path", async () => {
        const user = baseUser({ avatarPath: "avatars/u/a.jpg" });
        vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
        vi.mocked(prisma.user.update).mockResolvedValue({
            ...user,
            avatarPath: null,
        } as never);

        const dto = await userService.deleteAvatar(USER_ID);
        expect(dto.avatarUrl).toBeNull();
        expect(r2.deleteObject).toHaveBeenCalledWith("avatars/u/a.jpg");
    });
});
