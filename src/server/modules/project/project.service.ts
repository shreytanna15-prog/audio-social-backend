import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { objectStorage } from "@/server/lib/object-storage";
import { AppError } from "@/server/utils/global-error";
import { trackService } from "@/server/modules/track/track.service";
import type {
    AttachProjectTracksSchema,
    CreateProjectSchema,
    UpdateProjectSchema,
} from "./project.validator";

export type ProjectSummary = {
    id: string;
    title: string;
    description: string | null;
    trackCount: number;
    updatedAt: string;
    createdAt: string;
};

export type ProjectTrackItem = {
    id: string;
    kind: string;
    status: string;
    storageState: string;
    title: string;
    durationMs: number;
    mixUrl: string | null;
    addedAt: string;
    createdAt: string;
};

export type ProjectDetail = ProjectSummary & {
    tracks: ProjectTrackItem[];
};

class ProjectService {
    public async createProject(
        userId: string,
        payload: CreateProjectSchema
    ): Promise<ProjectSummary> {
        const project = await prisma.project.create({
            data: {
                userId,
                title: payload.title,
                description: payload.description ?? null,
            },
        });

        return {
            id: project.id,
            title: project.title,
            description: project.description,
            trackCount: 0,
            updatedAt: project.updatedAt.toISOString(),
            createdAt: project.createdAt.toISOString(),
        };
    }

    public async listProjects(userId: string): Promise<ProjectSummary[]> {
        const projects = await prisma.project.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: { _count: { select: { tracks: true } } },
        });

        return projects.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            trackCount: project._count.tracks,
            updatedAt: project.updatedAt.toISOString(),
            createdAt: project.createdAt.toISOString(),
        }));
    }

    public async getLatestProject(
        userId: string
    ): Promise<ProjectSummary | null> {
        const project = await prisma.project.findFirst({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            include: { _count: { select: { tracks: true } } },
        });

        if (!project) {
            return null;
        }

        return {
            id: project.id,
            title: project.title,
            description: project.description,
            trackCount: project._count.tracks,
            updatedAt: project.updatedAt.toISOString(),
            createdAt: project.createdAt.toISOString(),
        };
    }

    public async getProject(
        userId: string,
        projectId: string
    ): Promise<ProjectDetail> {
        const project = await this.requireOwnedProject(userId, projectId, true);

        const links = await prisma.projectTrack.findMany({
            where: { projectId },
            orderBy: { addedAt: "desc" },
            include: { track: true },
        });

        const tracks = await Promise.all(
            links.map(async (link) => {
                const mixUrl = link.track.mixPath
                    ? await objectStorage.createSignedDownloadUrl(
                          link.track.mixPath
                      )
                    : null;

                return {
                    id: link.track.id,
                    kind: link.track.kind,
                    status: link.track.status,
                    storageState: link.track.storageState,
                    title: link.track.title,
                    durationMs: link.track.durationMs,
                    mixUrl,
                    addedAt: link.addedAt.toISOString(),
                    createdAt: link.track.createdAt.toISOString(),
                };
            })
        );

        return {
            id: project.id,
            title: project.title,
            description: project.description,
            trackCount: tracks.length,
            updatedAt: project.updatedAt.toISOString(),
            createdAt: project.createdAt.toISOString(),
            tracks,
        };
    }

    public async updateProject(
        userId: string,
        projectId: string,
        payload: UpdateProjectSchema
    ): Promise<ProjectSummary> {
        await this.requireOwnedProject(userId, projectId);

        const project = await prisma.project.update({
            where: { id: projectId },
            data: {
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
            },
            include: { _count: { select: { tracks: true } } },
        });

        return {
            id: project.id,
            title: project.title,
            description: project.description,
            trackCount: project._count.tracks,
            updatedAt: project.updatedAt.toISOString(),
            createdAt: project.createdAt.toISOString(),
        };
    }

    public async deleteProject(
        userId: string,
        projectId: string,
        deleteTracks: boolean
    ): Promise<{ id: string; deletedTrackIds?: string[] }> {
        const project = await this.requireOwnedProject(userId, projectId);

        const links = await prisma.projectTrack.findMany({
            where: { projectId: project.id },
            select: { trackId: true },
        });
        const trackIds = links.map((link) => link.trackId);

        const deletedTrackIds: string[] = [];

        if (deleteTracks && trackIds.length > 0) {
            for (const trackId of trackIds) {
                await trackService.deleteTrack(userId, trackId);
                deletedTrackIds.push(trackId);
            }
        }

        await prisma.project.delete({ where: { id: projectId } });

        return deleteTracks
            ? { id: projectId, deletedTrackIds }
            : { id: projectId };
    }

    public async attachTracks(
        userId: string,
        projectId: string,
        payload: AttachProjectTracksSchema
    ): Promise<{ attached: string[] }> {
        await this.requireOwnedProject(userId, projectId);

        const uniqueIds = [...new Set(payload.trackIds)];
        const tracks = await prisma.track.findMany({
            where: { id: { in: uniqueIds }, userId },
            select: { id: true },
        });

        if (tracks.length !== uniqueIds.length) {
            throw new AppError(
                "One or more tracks were not found",
                404,
                "RESOURCE_NOT_FOUND"
            );
        }

        const existing = await prisma.projectTrack.findMany({
            where: {
                projectId,
                trackId: { in: uniqueIds },
            },
            select: { trackId: true },
        });
        const existingSet = new Set(existing.map((row) => row.trackId));
        const toInsert = uniqueIds.filter((id) => !existingSet.has(id));

        if (toInsert.length > 0) {
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.projectTrack.createMany({
                        data: toInsert.map((trackId) => ({
                            projectId,
                            trackId,
                        })),
                        skipDuplicates: true,
                    });
                    await tx.project.update({
                        where: { id: projectId },
                        data: { updatedAt: new Date() },
                    });
                });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002"
                ) {
                    // race: treat as idempotent success
                } else {
                    throw error;
                }
            }
        }

        return { attached: uniqueIds };
    }

    public async unlinkTrack(
        userId: string,
        projectId: string,
        trackId: string
    ): Promise<{ id: string; trackId: string }> {
        await this.requireOwnedProject(userId, projectId);

        const result = await prisma.projectTrack.deleteMany({
            where: { projectId, trackId },
        });

        if (result.count > 0) {
            await prisma.project.update({
                where: { id: projectId },
                data: { updatedAt: new Date() },
            });
        }

        return { id: projectId, trackId };
    }

    public async attachTrackTransactional(
        tx: Prisma.TransactionClient,
        userId: string,
        projectId: string,
        trackId: string
    ): Promise<void> {
        const project = await tx.project.findFirst({
            where: { id: projectId, userId },
            select: { id: true },
        });

        if (!project) {
            throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
        }

        await tx.projectTrack.upsert({
            where: {
                projectId_trackId: { projectId, trackId },
            },
            create: { projectId, trackId },
            update: {},
        });

        await tx.project.update({
            where: { id: projectId },
            data: { updatedAt: new Date() },
        });
    }

    private async requireOwnedProject(
        userId: string,
        projectId: string,
        _withCount = false
    ) {
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId },
        });

        if (!project) {
            throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
        }

        return project;
    }
}

export const projectService = new ProjectService();
