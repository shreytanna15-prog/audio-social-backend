import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { saveService } from "@/server/modules/save/save.service";

vi.mock("@/server/config/prisma", () => {
    const model = () => ({
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
    });
    const models = {
        playlist: model(),
        album: model(),
        savedPlaylist: model(),
        savedAlbum: model(),
    };

    return {
        prisma: {
            ...models,
            $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
                fn(models)
            ),
        },
    };
});

vi.mock("@/server/lib/object-storage", () => ({
    objectStorage: {
        createSignedDownloadUrl: vi.fn(
            async (path: string) => `https://cdn.example.com/${path}`
        ),
    },
}));

const OWNER = "11111111-1111-7111-8111-111111111111";
const VIEWER = "22222222-2222-7222-8222-222222222222";
const PLAYLIST = "33333333-3333-7333-8333-333333333333";
const ALBUM = "44444444-4444-7444-8444-444444444444";

const SAVED_AT = new Date("2026-11-06T00:00:00.000Z");

describe("saveService playlists (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects saving own playlist with 400", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
            id: PLAYLIST,
            userId: OWNER,
            visibility: "PUBLIC",
            saveCount: 0,
        } as never);

        await expect(
            saveService.savePlaylist(OWNER, PLAYLIST)
        ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
        expect(prisma.savedPlaylist.createMany).not.toHaveBeenCalled();
    });

    it("rejects saving another user's private playlist with 404", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
            id: PLAYLIST,
            userId: OWNER,
            visibility: "PRIVATE",
            saveCount: 0,
        } as never);

        await expect(
            saveService.savePlaylist(VIEWER, PLAYLIST)
        ).rejects.toMatchObject({ status: 404 });
        expect(prisma.savedPlaylist.createMany).not.toHaveBeenCalled();
    });

    it("bumps saveCount on first save", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
            id: PLAYLIST,
            userId: OWNER,
            visibility: "PUBLIC",
            saveCount: 1,
        } as never);
        vi.mocked(prisma.savedPlaylist.createMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.playlist.update).mockResolvedValue({
            saveCount: 2,
        } as never);

        await expect(
            saveService.savePlaylist(VIEWER, PLAYLIST)
        ).resolves.toEqual({ id: PLAYLIST, isSaved: true, saveCount: 2 });
    });

    it("does not bump saveCount when already saved", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
            id: PLAYLIST,
            userId: OWNER,
            visibility: "PUBLIC",
            saveCount: 2,
        } as never);
        vi.mocked(prisma.savedPlaylist.createMany).mockResolvedValue({
            count: 0,
        } as never);

        await expect(
            saveService.savePlaylist(VIEWER, PLAYLIST)
        ).resolves.toEqual({ id: PLAYLIST, isSaved: true, saveCount: 2 });
        expect(prisma.playlist.update).not.toHaveBeenCalled();
    });

    it("does not decrement saveCount when unsaving a playlist that was not saved", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue({
            saveCount: 2,
        } as never);
        vi.mocked(prisma.savedPlaylist.deleteMany).mockResolvedValue({
            count: 0,
        } as never);

        await expect(
            saveService.unsavePlaylist(VIEWER, PLAYLIST)
        ).resolves.toEqual({ id: PLAYLIST, isSaved: false, saveCount: 2 });
        expect(prisma.playlist.updateMany).not.toHaveBeenCalled();
    });

    it("decrements saveCount when a save row is deleted", async () => {
        vi.mocked(prisma.playlist.findFirst)
            .mockResolvedValueOnce({ saveCount: 2 } as never)
            .mockResolvedValueOnce({ saveCount: 1 } as never);
        vi.mocked(prisma.savedPlaylist.deleteMany).mockResolvedValue({
            count: 1,
        } as never);

        await expect(
            saveService.unsavePlaylist(VIEWER, PLAYLIST)
        ).resolves.toEqual({ id: PLAYLIST, isSaved: false, saveCount: 1 });
        expect(prisma.playlist.updateMany).toHaveBeenCalledTimes(1);
    });

    it("marks private saved playlists unavailable", async () => {
        vi.mocked(prisma.savedPlaylist.findMany).mockResolvedValue([
            {
                savedAt: SAVED_AT,
                playlist: { id: PLAYLIST, title: "Gone", visibility: "PRIVATE" },
            },
        ] as never);

        await expect(saveService.listSavedPlaylists(VIEWER)).resolves.toEqual([
            {
                savedAt: SAVED_AT.toISOString(),
                available: false,
                playlist: { id: PLAYLIST, title: "Gone" },
            },
        ]);
    });
});

describe("saveService albums (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects saving own album with 400", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue({
            id: ALBUM,
            userId: OWNER,
            status: "RELEASED",
        } as never);

        await expect(saveService.saveAlbum(OWNER, ALBUM)).rejects.toMatchObject({
            status: 400,
            code: "BAD_REQUEST",
        });
        expect(prisma.savedAlbum.createMany).not.toHaveBeenCalled();
    });

    it("rejects saving another user's draft album with 404", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue({
            id: ALBUM,
            userId: OWNER,
            status: "DRAFT",
        } as never);

        await expect(
            saveService.saveAlbum(VIEWER, ALBUM)
        ).rejects.toMatchObject({ status: 404 });
        expect(prisma.savedAlbum.createMany).not.toHaveBeenCalled();
    });

    it("saves a released album idempotently", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue({
            id: ALBUM,
            userId: OWNER,
            status: "RELEASED",
        } as never);

        await expect(saveService.saveAlbum(VIEWER, ALBUM)).resolves.toEqual({
            id: ALBUM,
            isSaved: true,
        });
        expect(prisma.savedAlbum.createMany).toHaveBeenCalledWith({
            data: [{ userId: VIEWER, albumId: ALBUM }],
            skipDuplicates: true,
        });
    });

    it("unsaves without requiring the album to be released", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue({
            id: ALBUM,
        } as never);

        await expect(saveService.unsaveAlbum(VIEWER, ALBUM)).resolves.toEqual({
            id: ALBUM,
            isSaved: false,
        });
        expect(prisma.savedAlbum.deleteMany).toHaveBeenCalledWith({
            where: { userId: VIEWER, albumId: ALBUM },
        });
    });

    it("marks unreleased saved albums unavailable", async () => {
        vi.mocked(prisma.savedAlbum.findMany).mockResolvedValue([
            {
                savedAt: SAVED_AT,
                album: { id: ALBUM, title: "Gone", status: "DRAFT" },
            },
        ] as never);

        await expect(saveService.listSavedAlbums(VIEWER)).resolves.toEqual([
            {
                savedAt: SAVED_AT.toISOString(),
                available: false,
                album: { id: ALBUM, title: "Gone" },
            },
        ]);
    });
});
