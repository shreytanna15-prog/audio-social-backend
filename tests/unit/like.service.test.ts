import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { likeService } from "@/server/modules/save/like.service";

const OWNER = "11111111-1111-7111-8111-111111111111";
const VIEWER = "22222222-2222-7222-8222-222222222222";
const TRACK = "66666666-6666-7666-8666-666666666666";

vi.mock("@/server/lib/object-storage", () => ({
    objectStorage: {
        createSignedDownloadUrl: vi
            .fn()
            .mockResolvedValue("https://cdn.example/x"),
    },
}));

describe("likeService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects like when track is another user's draft with 404", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: OWNER,
            status: "DRAFT",
            likeCount: 0,
        } as never);

        await expect(likeService.likeTrack(VIEWER, TRACK)).rejects.toMatchObject({
            status: 404,
        });
        expect(prisma.likedTrack.createMany).not.toHaveBeenCalled();
    });

    it("rejects like when track is the viewer's own draft with 400", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: OWNER,
            status: "DRAFT",
            likeCount: 0,
        } as never);

        await expect(likeService.likeTrack(OWNER, TRACK)).rejects.toMatchObject({
            status: 400,
        });
    });

    it("bumps likeCount on first like", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: OWNER,
            status: "PUBLISHED",
            likeCount: 2,
        } as never);
        vi.mocked(prisma.likedTrack.createMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.track.update).mockResolvedValue({
            likeCount: 3,
        } as never);

        await expect(likeService.likeTrack(VIEWER, TRACK)).resolves.toEqual({
            id: TRACK,
            isLiked: true,
            likeCount: 3,
        });
        expect(prisma.track.update).toHaveBeenCalledTimes(1);
    });

    it("does not bump likeCount when already liked", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: OWNER,
            status: "PUBLISHED",
            likeCount: 3,
        } as never);
        vi.mocked(prisma.likedTrack.createMany).mockResolvedValue({
            count: 0,
        } as never);

        await expect(likeService.likeTrack(VIEWER, TRACK)).resolves.toEqual({
            id: TRACK,
            isLiked: true,
            likeCount: 3,
        });
        expect(prisma.track.update).not.toHaveBeenCalled();
    });

    it("does not decrement likeCount when unliking a track that was not liked", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            likeCount: 3,
        } as never);
        vi.mocked(prisma.likedTrack.deleteMany).mockResolvedValue({
            count: 0,
        } as never);

        await expect(likeService.unlikeTrack(VIEWER, TRACK)).resolves.toEqual({
            id: TRACK,
            isLiked: false,
            likeCount: 3,
        });
        expect(prisma.track.updateMany).not.toHaveBeenCalled();
    });

    it("decrements likeCount when a like row is deleted", async () => {
        vi.mocked(prisma.track.findFirst)
            .mockResolvedValueOnce({ likeCount: 3 } as never)
            .mockResolvedValueOnce({ likeCount: 2 } as never);
        vi.mocked(prisma.likedTrack.deleteMany).mockResolvedValue({
            count: 1,
        } as never);

        await expect(likeService.unlikeTrack(VIEWER, TRACK)).resolves.toEqual({
            id: TRACK,
            isLiked: false,
            likeCount: 2,
        });
        expect(prisma.track.updateMany).toHaveBeenCalledTimes(1);
    });

    it("marks unpublished liked tracks unavailable", async () => {
        const likedAt = new Date("2026-01-01T00:00:00.000Z");
        vi.mocked(prisma.likedTrack.findMany).mockResolvedValue([
            {
                likedAt,
                track: { id: TRACK, title: "Gone", status: "DRAFT" },
            },
        ] as never);

        await expect(likeService.listLikedTracks(VIEWER)).resolves.toEqual([
            {
                likedAt: likedAt.toISOString(),
                available: false,
                track: { id: TRACK, title: "Gone" },
            },
        ]);
    });
});
