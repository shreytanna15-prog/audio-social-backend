import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { followService } from "@/server/modules/follow/follow.service";
import { AppError } from "@/server/utils/global-error";

const VIEWER = "11111111-1111-7111-8111-111111111111";
const TARGET = "22222222-2222-7222-8222-222222222222";

describe("followService (unit)", () => {
    beforeEach(() => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: TARGET,
        } as never);
        vi.mocked(prisma.follow.upsert).mockResolvedValue({} as never);
        vi.mocked(prisma.follow.deleteMany).mockResolvedValue({ count: 1 } as never);
        vi.mocked(prisma.follow.count).mockResolvedValue(3);
        vi.mocked(prisma.follow.findUnique)
            .mockResolvedValueOnce({ id: "f1" } as never)
            .mockResolvedValueOnce(null);
    });

    it("rejects following yourself", async () => {
        await expect(followService.follow(VIEWER, VIEWER)).rejects.toMatchObject({
            message: "Cannot follow yourself",
            status: 400,
            code: "BAD_REQUEST",
        } satisfies Partial<AppError>);
    });

    it("rejects unfollow yourself", async () => {
        await expect(followService.unfollow(VIEWER, VIEWER)).rejects.toMatchObject({
            message: "Cannot unfollow yourself",
            status: 400,
        });
    });

    it("404 when target user missing", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        await expect(followService.follow(VIEWER, TARGET)).rejects.toMatchObject({
            status: 404,
            code: "RESOURCE_NOT_FOUND",
        });
    });

    it("follow is idempotent via upsert and returns counts + flags", async () => {
        vi.mocked(prisma.follow.count)
            .mockResolvedValueOnce(4)
            .mockResolvedValueOnce(1);
        vi.mocked(prisma.follow.findUnique)
            .mockReset()
            .mockResolvedValueOnce({ id: "out" } as never)
            .mockResolvedValueOnce({ id: "in" } as never);

        const result = await followService.follow(VIEWER, TARGET);

        expect(prisma.follow.upsert).toHaveBeenCalledOnce();
        expect(result).toEqual({
            id: TARGET,
            followerCount: 4,
            followingCount: 1,
            isFollowing: true,
            isFollowedBy: true,
            isMutual: true,
        });
    });

    it("unfollow deletes and returns updated relationship", async () => {
        vi.mocked(prisma.follow.count)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(5);
        vi.mocked(prisma.follow.findUnique)
            .mockReset()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        const result = await followService.unfollow(VIEWER, TARGET);

        expect(prisma.follow.deleteMany).toHaveBeenCalledWith({
            where: { followerId: VIEWER, followingId: TARGET },
        });
        expect(result.isFollowing).toBe(false);
        expect(result.followerCount).toBe(2);
    });

    it("getRelationship derives mutual correctly", async () => {
        vi.mocked(prisma.follow.findUnique)
            .mockReset()
            .mockResolvedValueOnce({ id: "a" } as never)
            .mockResolvedValueOnce({ id: "b" } as never);

        await expect(
            followService.getRelationship(VIEWER, TARGET)
        ).resolves.toEqual({
            isFollowing: true,
            isFollowedBy: true,
            isMutual: true,
        });
    });
});
