import { describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { searchRecentService } from "@/server/modules/search/search-recent.service";

const VIEWER = "11111111-1111-7111-8111-111111111111";
const TARGET = "22222222-2222-7222-8222-222222222222";

describe("searchRecentService (unit)", () => {
    it("list maps target user snapshots", async () => {
        const updatedAt = new Date("2026-10-27T10:00:00.000Z");
        vi.mocked(prisma.searchRecent.findMany).mockResolvedValue([
            {
                id: "r1",
                kind: "ARTIST",
                query: "alice",
                updatedAt,
                targetUser: {
                    id: TARGET,
                    username: "alice",
                    name: "Alice",
                },
            },
        ] as never);

        await expect(searchRecentService.list(VIEWER)).resolves.toEqual([
            {
                id: "r1",
                kind: "ARTIST",
                query: "alice",
                targetUser: {
                    id: TARGET,
                    username: "alice",
                    name: "Alice",
                },
                updatedAt: updatedAt.toISOString(),
            },
        ]);
    });

    it("record rejects self target", async () => {
        await expect(
            searchRecentService.record(VIEWER, {
                kind: "ARTIST",
                targetUserId: VIEWER,
            })
        ).rejects.toMatchObject({
            status: 400,
            code: "BAD_REQUEST",
        });
    });

    it("record upserts, trims excess, returns list", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: TARGET,
        } as never);
        vi.mocked(prisma.searchRecent.upsert).mockResolvedValue({} as never);
        vi.mocked(prisma.searchRecent.findMany)
            .mockResolvedValueOnce([{ id: "old" }] as never)
            .mockResolvedValueOnce([] as never);
        vi.mocked(prisma.searchRecent.deleteMany).mockResolvedValue({
            count: 1,
        } as never);

        const list = await searchRecentService.record(VIEWER, {
            kind: "ARTIST",
            targetUserId: TARGET,
            query: "ali",
        });

        expect(prisma.searchRecent.upsert).toHaveBeenCalled();
        expect(prisma.searchRecent.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["old"] } },
        });
        expect(list).toEqual([]);
    });

    it("clear deletes all for viewer", async () => {
        vi.mocked(prisma.searchRecent.deleteMany).mockResolvedValue({
            count: 3,
        } as never);

        await expect(searchRecentService.clear(VIEWER)).resolves.toEqual({
            ok: true,
        });
        expect(prisma.searchRecent.deleteMany).toHaveBeenCalledWith({
            where: { userId: VIEWER },
        });
    });
});
