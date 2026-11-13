import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { projectService } from "@/server/modules/project/project.service";
import { AppError } from "@/server/utils/global-error";

const USER = "11111111-1111-7111-8111-111111111111";
const PROJECT = "33333333-3333-7333-8333-333333333333";
const TRACK_A = "44444444-4444-7444-8444-444444444444";
const TRACK_B = "55555555-5555-7555-8555-555555555555";

describe("projectService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("404 when project missing on attach", async () => {
        vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

        await expect(
            projectService.attachTracks(USER, PROJECT, {
                trackIds: [TRACK_A],
            })
        ).rejects.toMatchObject({
            status: 404,
            code: "RESOURCE_NOT_FOUND",
        } satisfies Partial<AppError>);
    });

    it("attach is idempotent for already-linked tracks", async () => {
        vi.mocked(prisma.project.findFirst).mockResolvedValue({
            id: PROJECT,
            userId: USER,
        } as never);
        vi.mocked(prisma.track.findMany).mockResolvedValue([
            { id: TRACK_A },
            { id: TRACK_B },
        ] as never);
        vi.mocked(prisma.projectTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A },
        ] as never);
        vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
            const tx = {
                projectTrack: {
                    createMany: vi.fn().mockResolvedValue({ count: 1 }),
                },
                project: {
                    update: vi.fn().mockResolvedValue({}),
                },
            };
            return fn(tx as never);
        });

        const result = await projectService.attachTracks(USER, PROJECT, {
            trackIds: [TRACK_A, TRACK_B],
        });

        expect(result.attached).toEqual([TRACK_A, TRACK_B]);
        expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it("unlink is idempotent when join row missing", async () => {
        vi.mocked(prisma.project.findFirst).mockResolvedValue({
            id: PROJECT,
            userId: USER,
        } as never);
        vi.mocked(prisma.projectTrack.deleteMany).mockResolvedValue({
            count: 0,
        } as never);

        const result = await projectService.unlinkTrack(
            USER,
            PROJECT,
            TRACK_A
        );

        expect(result).toEqual({ id: PROJECT, trackId: TRACK_A });
        expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it("createProject returns zero trackCount", async () => {
        const now = new Date("2026-11-06T00:00:00.000Z");
        vi.mocked(prisma.project.create).mockResolvedValue({
            id: PROJECT,
            userId: USER,
            title: "Midnight",
            description: null,
            createdAt: now,
            updatedAt: now,
        } as never);

        const result = await projectService.createProject(USER, {
            title: "Midnight",
            description: null,
        });

        expect(result).toMatchObject({
            id: PROJECT,
            title: "Midnight",
            trackCount: 0,
        });
    });

    it("updateProject 404 when not owned", async () => {
        vi.mocked(prisma.project.findFirst).mockResolvedValue(null);

        await expect(
            projectService.updateProject(USER, PROJECT, { title: "X" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deleteProject without deleteTracks only deletes project", async () => {
        vi.mocked(prisma.project.findFirst).mockResolvedValue({
            id: PROJECT,
            userId: USER,
        } as never);
        vi.mocked(prisma.projectTrack.findMany).mockResolvedValue([
            { trackId: TRACK_A },
        ] as never);
        vi.mocked(prisma.project.delete).mockResolvedValue({} as never);

        const result = await projectService.deleteProject(
            USER,
            PROJECT,
            false
        );

        expect(result).toEqual({ id: PROJECT });
        expect(prisma.project.delete).toHaveBeenCalledWith({
            where: { id: PROJECT },
        });
    });
});

