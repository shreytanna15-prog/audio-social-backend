import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { trackService } from "@/server/modules/track/track.service";
import { AppError } from "@/server/utils/global-error";

vi.mock("@/server/config/supabase", () => ({
    supabase: {
        storage: {
            from: () => ({
                createSignedUploadUrl: vi.fn().mockResolvedValue({
                    data: { signedUrl: "https://up.example/x", token: "t" },
                    error: null,
                }),
                createSignedUrl: vi.fn().mockResolvedValue({
                    data: { signedUrl: "https://cdn.example/x" },
                    error: null,
                }),
                list: vi.fn().mockResolvedValue({ data: [], error: null }),
                remove: vi.fn().mockResolvedValue({ error: null }),
            }),
        },
    },
}));

vi.mock("@/server/lib/object-storage", () => ({
    objectStorage: {
        createSignedUploadUrl: vi.fn(),
        createSignedDownloadUrl: vi
            .fn()
            .mockResolvedValue("https://cdn.example/x"),
        objectExists: vi.fn(),
        objectExistsAtPath: vi.fn(),
        remove: vi.fn(),
    },
}));

const USER = "11111111-1111-7111-8111-111111111111";
const TRACK = "66666666-6666-7666-8666-666666666666";
const PROJECT = "33333333-3333-7333-8333-333333333333";
const LAYER = "77777777-7777-7777-8777-777777777777";

const layer = {
    id: LAYER,
    kind: "vocal" as const,
    name: "Vocals",
    durationMs: 1000,
    offsetMs: 0,
    muted: false,
    sortIndex: 0,
    appliedEffects: [],
};

describe("trackService draft/backup (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("createTrack fails when projectId is not owned", async () => {
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
            const tx = {
                project: {
                    findFirst: vi.fn().mockResolvedValue(null),
                },
                track: { create: vi.fn() },
                projectTrack: { upsert: vi.fn() },
            };
            return fn(tx as never);
        });

        await expect(
            trackService.createTrack(USER, {
                id: TRACK,
                kind: "SINGLE",
                title: "Take",
                durationMs: 1000,
                layers: [layer],
                projectId: PROJECT,
            })
        ).rejects.toMatchObject({
            status: 404,
            message: "Project not found",
        } satisfies Partial<AppError>);
    });

    it("createTrack attaches projectId in the same transaction", async () => {
        const create = vi.fn().mockResolvedValue({});
        const upsert = vi.fn().mockResolvedValue({});
        const projectUpdate = vi.fn().mockResolvedValue({});

        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
            const tx = {
                track: { create },
                projectTrack: { upsert },
                project: {
                    findFirst: vi.fn().mockResolvedValue({ id: PROJECT }),
                    update: projectUpdate,
                },
            };
            return fn(tx as never);
        });

        const result = await trackService.createTrack(USER, {
            id: TRACK,
            kind: "SINGLE",
            title: "Take",
            durationMs: 1000,
            layers: [layer],
            projectId: PROJECT,
        });

        expect(result).toEqual({ id: TRACK });
        expect(create).toHaveBeenCalled();
        expect(upsert).toHaveBeenCalled();
        expect(projectUpdate).toHaveBeenCalled();
    });

    it("updateTrack rejects PUBLISHED tracks", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: USER,
            status: "PUBLISHED",
            storageState: "SYNCED",
            layers: [],
        } as never);

        await expect(
            trackService.updateTrack(USER, TRACK, { title: "Nope" })
        ).rejects.toMatchObject({
            status: 400,
            message: "Only DRAFT tracks can be updated",
        });
    });

    it("abortIncompleteBackup rejects when mixPath already set", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
            userId: USER,
            storageState: "LOCAL_ONLY",
            mixPath: "u/tracks/t/mix.wav",
        } as never);

        await expect(
            trackService.abortIncompleteBackup(USER, TRACK)
        ).rejects.toMatchObject({
            status: 400,
        });
    });
});
