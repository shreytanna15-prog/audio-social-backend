import { TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { objectStorage } from "@/server/lib/object-storage";
import { AppError } from "@/server/utils/global-error";

export type LikeActionResult = {
    id: string;
    isLiked: boolean;
    likeCount: number;
};

export type LikedTrackArtist = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

export type LikedTrackSummary = {
    id: string;
    title: string;
    kind?: string;
    durationMs?: number;
    coverUrl?: string | null;
    mixUrl?: string | null;
    likeCount?: number;
    isLiked?: true;
    artist?: LikedTrackArtist;
};

export type LikedTrackItem = {
    likedAt: string;
    available: boolean;
    track: LikedTrackSummary | null;
};

class LikeService {
    public async likeTrack(
        viewerId: string,
        trackId: string
    ): Promise<LikeActionResult> {
        return prisma.$transaction(async (tx) => {
            const track = await tx.track.findFirst({
                where: { id: trackId },
                select: { id: true, userId: true, status: true, likeCount: true },
            });

            if (!track) {
                throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
            }

            if (track.status !== TrackStatus.PUBLISHED) {
                if (track.userId === viewerId) {
                    throw new AppError(
                        "Only PUBLISHED tracks can be liked",
                        400,
                        "BAD_REQUEST"
                    );
                }
                throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
            }

            const { count } = await tx.likedTrack.createMany({
                data: [{ userId: viewerId, trackId }],
                skipDuplicates: true,
            });

            if (count === 0) {
                return { id: trackId, isLiked: true, likeCount: track.likeCount };
            }

            const updated = await tx.track.update({
                where: { id: trackId },
                data: { likeCount: { increment: 1 } },
                select: { likeCount: true },
            });

            return { id: trackId, isLiked: true, likeCount: updated.likeCount };
        });
    }

    public async unlikeTrack(
        viewerId: string,
        trackId: string
    ): Promise<LikeActionResult> {
        return prisma.$transaction(async (tx) => {
            const track = await tx.track.findFirst({
                where: { id: trackId },
                select: { likeCount: true },
            });

            if (!track) {
                throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
            }

            const { count } = await tx.likedTrack.deleteMany({
                where: { userId: viewerId, trackId },
            });

            if (count === 0) {
                return { id: trackId, isLiked: false, likeCount: track.likeCount };
            }

            await tx.track.updateMany({
                where: { id: trackId, likeCount: { gt: 0 } },
                data: { likeCount: { decrement: 1 } },
            });
            const updated = await tx.track.findFirst({
                where: { id: trackId },
                select: { likeCount: true },
            });

            return {
                id: trackId,
                isLiked: false,
                likeCount: updated?.likeCount ?? 0,
            };
        });
    }

    public async listLikedTracks(viewerId: string): Promise<LikedTrackItem[]> {
        const rows = await prisma.likedTrack.findMany({
            where: { userId: viewerId },
            orderBy: { likedAt: "desc" },
            include: {
                track: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true,
                                avatarPath: true,
                            },
                        },
                    },
                },
            },
        });

        return Promise.all(
            rows.map(async ({ likedAt, track }): Promise<LikedTrackItem> => {
                if (track.status !== TrackStatus.PUBLISHED) {
                    return {
                        likedAt: likedAt.toISOString(),
                        available: false,
                        track: { id: track.id, title: track.title },
                    };
                }

                const [mixUrl, coverUrl] = await Promise.all([
                    track.mixPath
                        ? objectStorage.createSignedDownloadUrl(track.mixPath)
                        : Promise.resolve(null),
                    track.coverPath
                        ? objectStorage.createSignedDownloadUrl(track.coverPath)
                        : Promise.resolve(null),
                ]);

                return {
                    likedAt: likedAt.toISOString(),
                    available: true,
                    track: {
                        id: track.id,
                        title: track.title,
                        kind: track.kind,
                        durationMs: track.durationMs,
                        coverUrl,
                        mixUrl,
                        likeCount: track.likeCount,
                        isLiked: true,
                        artist: {
                            id: track.user.id,
                            username: track.user.username,
                            name: track.user.name,
                            avatarUrl: publicUrl(track.user.avatarPath),
                        },
                    },
                };
            })
        );
    }
}

export const likeService = new LikeService();
