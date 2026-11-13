import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { albumService } from "@/server/modules/album/album.service";
import { playlistService } from "@/server/modules/playlist/playlist.service";

vi.mock("@/server/config/prisma", () => {
    const model = () => ({
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    });
    const models = {
        playlist: model(),
        playlistTrack: model(),
        album: model(),
        savedPlaylist: model(),
        savedAlbum: model(),
        albumTrack: model(),
        track: model(),
        user: model(),
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
        createSignedUploadUrl: vi.fn(),
        objectExistsAtPath: vi.fn(),
        remove: vi.fn(),
    },
}));

const USER = "11111111-1111-7111-8111-111111111111";
const OTHER = "22222222-2222-7222-8222-222222222222";
const PLAYLIST = "33333333-3333-7333-8333-333333333333";
const ALBUM = "66666666-6666-7666-8666-666666666666";
const OTHER_ALBUM = "77777777-7777-7777-8777-777777777777";
const TRACK_A = "44444444-4444-7444-8444-444444444444";
const TRACK_B = "55555555-5555-7555-8555-555555555555";

const NOW = new Date("2026-11-06T00:00:00.000Z");

function playlistRow(overrides: Record<string, unknown> = {}) {
    return {
        id: PLAYLIST,
        userId: USER,
        title: "Mix",
        description: null,
        coverPath: null,
        visibility: "PRIVATE",
        saveCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    };
}

function albumRow(overrides: Record<string, unknown> = {}) {
    return {
        id: ALBUM,
        userId: USER,
        title: "LP",
        description: null,
        coverPath: null,
        status: "DRAFT",
        releasedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
        _count: { tracks: 0 },
        tracks: [],
        ...overrides,
    };
}

function trackRow(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        userId: OTHER,
        kind: "SINGLE",
        status: "PUBLISHED",
        title: `Track ${id.slice(0, 2)}`,
        caption: null,
        genres: [],
        durationMs: 1000,
        mixPath: `${OTHER}/tracks/${id}/mix.wav`,
        coverPath: `${OTHER}/tracks/${id}/cover.jpg`,
        playCount: 0,
        publishedAt: NOW,
        user: { id: OTHER, username: "artist", name: null },
        ...overrides,
    };
}

describe("playlistService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue(
            playlistRow() as never
        );
    });

    it("rejects attaching an unpublished track", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, status: "DRAFT" },
        ] as never);

        await expect(
            playlistService.attachTracks(USER, PLAYLIST, {
                trackIds: [TRACK_A],
            })
        ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
        expect(prisma.playlistTrack.createMany).not.toHaveBeenCalled();
    });

    it("404 when an attached track does not exist", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([] as never);

        await expect(
            playlistService.attachTracks(USER, PLAYLIST, {
                trackIds: [TRACK_A],
            })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("404 when attaching to a playlist the user does not own", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue(null);

        await expect(
            playlistService.attachTracks(OTHER, PLAYLIST, {
                trackIds: [TRACK_A],
            })
        ).rejects.toMatchObject({ status: 404 });
        expect(prisma.playlist.findFirst).toHaveBeenCalledWith({
            where: { id: PLAYLIST, userId: OTHER },
        });
    });

    it("appends new tracks after the last position and skips duplicates", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, status: "PUBLISHED" },
            { id: TRACK_B, status: "PUBLISHED" },
        ] as never);
        vi.mocked(prisma.playlistTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A, position: 4 },
        ] as never);

        const result = await playlistService.attachTracks(USER, PLAYLIST, {
            trackIds: [TRACK_A, TRACK_B],
        });

        expect(result.attached).toEqual([TRACK_A, TRACK_B]);
        expect(prisma.playlistTrack.createMany).toHaveBeenCalledWith({
            data: [{ playlistId: PLAYLIST, trackId: TRACK_B, position: 5 }],
            skipDuplicates: true,
        });
        expect(prisma.playlist.update).toHaveBeenCalledOnce();
    });

    it("private playlists are not visible to other viewers", async () => {
        vi.mocked(prisma.playlist.findFirst).mockResolvedValue(null);

        await expect(
            playlistService.getPlaylist(OTHER, PLAYLIST)
        ).rejects.toMatchObject({ status: 404 });
        expect(prisma.playlist.findFirst).toHaveBeenCalledWith({
            where: {
                id: PLAYLIST,
                OR: [{ userId: OTHER }, { visibility: "PUBLIC" }],
            },
        });
    });

    it("detail marks unpublished members unavailable and builds collage urls", async () => {
        vi.mocked(prisma.playlistTrack.findMany).mockResolvedValue([
            {
                position: 0,
                addedAt: NOW,
                track: trackRow(TRACK_A, { status: "DRAFT" }),
            },
            { position: 1, addedAt: NOW, track: trackRow(TRACK_B) },
        ] as never);

        const detail = await playlistService.getPlaylist(USER, PLAYLIST);

        expect(detail.isOwner).toBe(true);
        expect(detail.tracks[0]).toMatchObject({
            id: TRACK_A,
            available: false,
        });
        expect(detail.tracks[0]).not.toHaveProperty("mixUrl");
        expect(detail.tracks[1]).toMatchObject({
            id: TRACK_B,
            available: true,
        });
        expect(detail.coverFallbackUrls).toHaveLength(1);
    });

    it("public list only queries PUBLIC playlists", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: OTHER,
        } as never);
        vi.mocked(prisma.playlist.findMany).mockResolvedValue([] as never);

        await playlistService.listPublicByUser(OTHER);

        expect(prisma.playlist.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: OTHER, visibility: "PUBLIC" },
            })
        );
    });

    it("reorder rejects ids that are not a permutation of members", async () => {
        vi.mocked(prisma.playlistTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A },
            { trackId: TRACK_B },
        ] as never);

        await expect(
            playlistService.reorderTracks(USER, PLAYLIST, {
                trackIds: [TRACK_A, TRACK_A],
            })
        ).rejects.toMatchObject({ status: 400 });
        expect(prisma.playlistTrack.update).not.toHaveBeenCalled();
    });

    it("reorder rewrites dense positions", async () => {
        vi.mocked(prisma.playlistTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A },
            { trackId: TRACK_B },
        ] as never);

        await playlistService.reorderTracks(USER, PLAYLIST, {
            trackIds: [TRACK_B, TRACK_A],
        });

        expect(prisma.playlistTrack.update).toHaveBeenNthCalledWith(1, {
            where: {
                playlistId_trackId: { playlistId: PLAYLIST, trackId: TRACK_B },
            },
            data: { position: 0 },
        });
        expect(prisma.playlistTrack.update).toHaveBeenNthCalledWith(2, {
            where: {
                playlistId_trackId: { playlistId: PLAYLIST, trackId: TRACK_A },
            },
            data: { position: 1 },
        });
    });

    it("unlink renumbers remaining tracks", async () => {
        vi.mocked(prisma.playlistTrack.deleteMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.playlistTrack.findMany).mockResolvedValue([
            { trackId: TRACK_B },
        ] as never);

        await playlistService.unlinkTrack(USER, PLAYLIST, TRACK_A);

        expect(prisma.playlistTrack.update).toHaveBeenCalledWith({
            where: {
                playlistId_trackId: { playlistId: PLAYLIST, trackId: TRACK_B },
            },
            data: { position: 0 },
        });
    });
});

describe("albumService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(prisma.album.findFirst).mockResolvedValue(
            albumRow() as never
        );
    });

    it("rejects attaching an unpublished track", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, userId: USER, status: "DRAFT" },
        ] as never);

        await expect(
            albumService.attachTracks(USER, ALBUM, { trackIds: [TRACK_A] })
        ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
        expect(prisma.albumTrack.createMany).not.toHaveBeenCalled();
    });

    it("rejects attaching another artist's track", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, userId: OTHER, status: "PUBLISHED" },
        ] as never);

        await expect(
            albumService.attachTracks(USER, ALBUM, { trackIds: [TRACK_A] })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("409 when a track already belongs to another album", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, userId: USER, status: "PUBLISHED" },
        ] as never);
        vi.mocked(prisma.albumTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A, albumId: OTHER_ALBUM },
        ] as never);

        await expect(
            albumService.attachTracks(USER, ALBUM, { trackIds: [TRACK_A] })
        ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
        expect(prisma.albumTrack.createMany).not.toHaveBeenCalled();
    });

    it("409 when the global trackId unique races", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, userId: USER, status: "PUBLISHED" },
        ] as never);
        vi.mocked(prisma.albumTrack.findMany).mockResolvedValue([] as never);
        vi.mocked(prisma.albumTrack.createMany).mockRejectedValueOnce(
            new Prisma.PrismaClientKnownRequestError("unique", {
                code: "P2002",
                clientVersion: "test",
            })
        );

        await expect(
            albumService.attachTracks(USER, ALBUM, { trackIds: [TRACK_A] })
        ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
    });

    it("re-attaching a track already on this album is a no-op", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, userId: USER, status: "PUBLISHED" },
        ] as never);
        vi.mocked(prisma.albumTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A, albumId: ALBUM },
        ] as never);

        const result = await albumService.attachTracks(USER, ALBUM, {
            trackIds: [TRACK_A],
        });

        expect(result.attached).toEqual([TRACK_A]);
        expect(prisma.albumTrack.createMany).not.toHaveBeenCalled();
    });

    it("attaches new tracks at the next position", async () => {
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A, userId: USER, status: "PUBLISHED" },
        ] as never);
        vi.mocked(prisma.albumTrack.findMany)
            .mockResolvedValueOnce([] as never)
            .mockResolvedValueOnce([{ position: 0 }, { position: 1 }] as never);

        await albumService.attachTracks(USER, ALBUM, { trackIds: [TRACK_A] });

        expect(prisma.albumTrack.createMany).toHaveBeenCalledWith({
            data: [{ albumId: ALBUM, trackId: TRACK_A, position: 2 }],
        });
    });

    it("rejects releasing an empty album", async () => {
        vi.mocked(prisma.albumTrack.count).mockResolvedValue(0);

        await expect(
            albumService.releaseAlbum(USER, ALBUM)
        ).rejects.toMatchObject({ status: 400 });
        expect(prisma.album.update).not.toHaveBeenCalled();
    });

    it("release sets releasedAt only on first release", async () => {
        vi.mocked(prisma.albumTrack.count).mockResolvedValue(2);
        vi.mocked(prisma.album.update).mockResolvedValue(
            albumRow({ status: "RELEASED", releasedAt: NOW }) as never
        );

        const summary = await albumService.releaseAlbum(USER, ALBUM);

        expect(summary).toMatchObject({
            status: "RELEASED",
            releasedAt: NOW.toISOString(),
        });
        const data = vi.mocked(prisma.album.update).mock.calls[0][0].data;
        expect(data.status).toBe("RELEASED");
        expect(data.releasedAt).toBeInstanceOf(Date);
    });

    it("unrelease keeps releasedAt", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue(
            albumRow({ status: "RELEASED", releasedAt: NOW }) as never
        );
        vi.mocked(prisma.album.update).mockResolvedValue(
            albumRow({ status: "DRAFT", releasedAt: NOW }) as never
        );

        await albumService.unreleaseAlbum(USER, ALBUM);

        expect(prisma.album.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { status: "DRAFT" } })
        );
    });

    it("draft albums are not visible to other viewers", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue(null);

        await expect(albumService.getAlbum(OTHER, ALBUM)).rejects.toMatchObject(
            { status: 404 }
        );
        expect(prisma.album.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: ALBUM,
                    OR: [{ userId: OTHER }, { status: "RELEASED" }],
                },
            })
        );
    });

    it("public list only queries RELEASED albums", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: OTHER,
        } as never);
        vi.mocked(prisma.album.findMany).mockResolvedValue([] as never);

        await albumService.listReleasedByUser(OTHER);

        expect(prisma.album.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: OTHER, status: "RELEASED" },
            })
        );
    });

    it("summary falls back to the first track cover without a custom cover", async () => {
        vi.mocked(prisma.album.findFirst).mockResolvedValue(
            albumRow({
                _count: { tracks: 1 },
                tracks: [{ track: { coverPath: "u/tracks/t/cover.jpg" } }],
            }) as never
        );
        vi.mocked(prisma.albumTrack.findMany).mockResolvedValue([] as never);

        const detail = await albumService.getAlbum(USER, ALBUM);

        expect(detail.coverUrl).toBeNull();
        expect(detail.coverFallbackUrl).toBe(
            "https://cdn.example.com/u/tracks/t/cover.jpg"
        );
    });
});
