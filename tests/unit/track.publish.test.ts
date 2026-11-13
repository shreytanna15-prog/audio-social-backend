import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { trackService } from "@/server/modules/track/track.service";
import { AppError } from "@/server/utils/global-error";

const USER = "11111111-1111-7111-8111-111111111111";
const TRACK = "66666666-6666-7666-8666-666666666666";

vi.mock("@/server/lib/object-storage", () => ({
    objectStorage: {
        createSignedUploadUrl: vi.fn(),
        createSignedDownloadUrl: vi.fn().mockResolvedValue("https://cdn.example/x"),
        objectExists: vi.fn(),
        objectExistsAtPath: vi.fn(),
        remove: vi.fn(),
    },
}));

describe("trackService publish (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects publish when not SYNCED", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: USER,
            status: "DRAFT",
            storageState: "LOCAL_ONLY",
            mixPath: null,
            coverPath: "u/tracks/t/cover.jpg",
        } as never);

        await expect(
            trackService.publishTrack(USER, TRACK, {
                genres: ["pop"],
                keywords: [],
                caption: null,
                description: null,
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Track must be SYNCED with a mix before publish",
        } satisfies Partial<AppError>);
    });

    it("rejects publish when cover missing", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: USER,
            status: "DRAFT",
            storageState: "SYNCED",
            mixPath: "u/tracks/t/mix.wav",
            coverPath: null,
        } as never);

        await expect(
            trackService.publishTrack(USER, TRACK, {
                genres: ["pop"],
                keywords: [],
                caption: null,
                description: null,
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Cover image is required before publish",
        });
    });

    it("rejects patch-style cover change while published", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: USER,
            status: "PUBLISHED",
            coverPath: "u/tracks/t/cover.jpg",
        } as never);

        await expect(
            trackService.createCoverUploadUrl(USER, TRACK, {
                contentType: "image/jpeg",
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Published tracks are frozen. Unpublish to edit.",
        });
    });
});
