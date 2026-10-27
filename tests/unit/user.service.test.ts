import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { userService } from "@/server/modules/user/user.service";
import { followService } from "@/server/modules/follow/follow.service";

const VIEWER = "11111111-1111-7111-8111-111111111111";
const TARGET = "22222222-2222-7222-8222-222222222222";

describe("userService (unit)", () => {
    it("searchUsers ranks username prefix matches first", async () => {
        vi.mocked(prisma.user.findMany).mockResolvedValue([
            { id: "1", username: "zzblue", name: "Blue" },
            { id: "2", username: "alice", name: "Alice Blue" },
            { id: "3", username: "bluejay", name: null },
        ] as never);

        const results = await userService.searchUsers(VIEWER, {
            q: "blue",
            limit: 20,
        });

        expect(results.map((u) => u.username)).toEqual([
            "bluejay",
            "alice",
            "zzblue",
        ]);
    });

    it("searchUsers respects limit after ranking", async () => {
        vi.mocked(prisma.user.findMany).mockResolvedValue([
            { id: "1", username: "a1", name: null },
            { id: "2", username: "a2", name: null },
            { id: "3", username: "a3", name: null },
        ] as never);

        const results = await userService.searchUsers(VIEWER, {
            q: "a",
            limit: 2,
        });

        expect(results).toHaveLength(2);
    });

    it("getPublicProfile marks isSelf and skips relationship lookup", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: VIEWER,
            username: "me",
            name: "Me",
            email: "me@test.com",
            password: "x",
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);

        const countsSpy = vi
            .spyOn(followService, "getCounts")
            .mockResolvedValue({ followerCount: 1, followingCount: 2 });
        const relSpy = vi.spyOn(followService, "getRelationship");

        const profile = await userService.getPublicProfile(VIEWER, VIEWER);

        expect(profile.isSelf).toBe(true);
        expect(profile.isFollowing).toBe(false);
        expect(relSpy).not.toHaveBeenCalled();
        expect(countsSpy).toHaveBeenCalledWith(VIEWER);

        countsSpy.mockRestore();
        relSpy.mockRestore();
    });

    it("getPublicProfile merges relationship for other users", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: TARGET,
            username: "artist",
            name: "Artist",
            email: "a@test.com",
            password: "x",
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);

        const countsSpy = vi
            .spyOn(followService, "getCounts")
            .mockResolvedValue({ followerCount: 9, followingCount: 4 });
        const relSpy = vi.spyOn(followService, "getRelationship").mockResolvedValue({
            isFollowing: true,
            isFollowedBy: false,
            isMutual: false,
        });

        const profile = await userService.getPublicProfile(VIEWER, TARGET);

        expect(profile).toMatchObject({
            id: TARGET,
            username: "artist",
            followerCount: 9,
            isFollowing: true,
            isSelf: false,
        });
        expect(relSpy).toHaveBeenCalledWith(VIEWER, TARGET);

        countsSpy.mockRestore();
        relSpy.mockRestore();
    });
});
