import { TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { STORAGE_CONFIG } from "@/server/constants/storage.config";
import { objectStorage } from "@/server/lib/object-storage";
import { buildFeedClipPath } from "@/server/lib/storage-path";
import { AppError } from "@/server/utils/global-error";
import type {
    CreateFeedClipSchema,
    ListFeedQuerySchema,
} from "./feed.validator";

export type FeedClipArtist = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    isFollowing: boolean;
};

export type FeedClipItem = {
    id: string;
    trackId: string;
    title: string;
    caption: string | null;
    clipAudioUrl: string;
    mixUrl: string | null;
    coverUrl: string | null;
    durationMs: number;
    trackDurationMs: number;
    startMs: number;
    endMs: number;
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    artist: FeedClipArtist;
};

export type FeedClipPage = {
    items: FeedClipItem[];
    nextCursor: string | null;
};

export type FeedClipLikeResult = {
    id: string;
    isLiked: boolean;
    likeCount: number;
};

export type FeedClipSummary = {
    id: string;
    trackId: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    likeCount: number;
    clipAudioPath: string;
};

type ClipRow = {
    id: string;
    trackId: string;
    userId: string;
    clipAudioPath: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    likeCount: number;
    createdAt: Date;
    track: {
        title: string;
        caption: string | null;
        coverPath: string | null;
        mixPath: string | null;
        commentCount: number;
        playCount: number;
        status: TrackStatus;
        durationMs: number;
    };
    user: {
        id: string;
        username: string;
        name: string | null;
        avatarPath: string | null;
    };
};

const CLIP_INCLUDE = {
    track: {
        select: {
            title: true,
            caption: true,
            coverPath: true,
            mixPath: true,
            commentCount: true,
            playCount: true,
            status: true,
            durationMs: true,
        },
    },
    user: {
        select: {
            id: true,
            username: true,
            name: true,
            avatarPath: true,
        },
    },
} as const;

class FeedClipService {
    public async createUploadUrl(
        userId: string,
        trackId: string
    ): Promise<{ path: string; signedUrl: string; token?: string }> {
        await this.requireOwnedPublishedTrack(userId, trackId);
        const path = buildFeedClipPath(userId, trackId);
        const upload = await objectStorage.createSignedUploadUrl(
            path,
            STORAGE_CONFIG.chat.contentType
        );
        return {
            path: upload.path,
            signedUrl: upload.signedUrl,
            ...(upload.token ? { token: upload.token } : {}),
        };
    }

    public async createOrReplace(
        userId: string,
        payload: CreateFeedClipSchema
    ): Promise<FeedClipSummary> {
        const track = await this.requireOwnedPublishedTrack(
            userId,
            payload.trackId
        );
        const expectedPath = buildFeedClipPath(userId, track.id);
        if (payload.clipAudioPath !== expectedPath) {
            throw new AppError(
                "clipAudioPath does not match expected feed clip path",
                400,
                "BAD_REQUEST"
            );
        }

        const exists = await objectStorage.objectExistsAtPath(
            payload.clipAudioPath
        );
        if (!exists) {
            throw new AppError(
                "Clip audio not found in storage",
                400,
                "BAD_REQUEST"
            );
        }

        const existing = await prisma.feedClip.findUnique({
            where: { trackId: track.id },
            select: { id: true, clipAudioPath: true },
        });

        const clip = existing
            ? await prisma.feedClip.update({
                  where: { trackId: track.id },
                  data: {
                      clipAudioPath: payload.clipAudioPath,
                      startMs: payload.startMs,
                      endMs: payload.endMs,
                      durationMs: payload.durationMs,
                  },
              })
            : await prisma.feedClip.create({
                  data: {
                      trackId: track.id,
                      userId,
                      clipAudioPath: payload.clipAudioPath,
                      startMs: payload.startMs,
                      endMs: payload.endMs,
                      durationMs: payload.durationMs,
                  },
              });

        if (
            existing &&
            existing.clipAudioPath !== payload.clipAudioPath
        ) {
            await objectStorage.remove([existing.clipAudioPath]);
        }

        return {
            id: clip.id,
            trackId: clip.trackId,
            startMs: clip.startMs,
            endMs: clip.endMs,
            durationMs: clip.durationMs,
            likeCount: clip.likeCount,
            clipAudioPath: clip.clipAudioPath,
        };
    }

    public async getOwnedClipForTrack(
        userId: string,
        trackId: string
    ): Promise<FeedClipSummary | null> {
        const clip = await prisma.feedClip.findFirst({
            where: { trackId, userId },
            select: {
                id: true,
                trackId: true,
                startMs: true,
                endMs: true,
                durationMs: true,
                likeCount: true,
                clipAudioPath: true,
            },
        });
        return clip;
    }

    public async deleteClip(
        userId: string,
        clipId: string
    ): Promise<{ id: string }> {
        const clip = await prisma.feedClip.findFirst({
            where: { id: clipId, userId },
            select: { id: true, clipAudioPath: true },
        });

        if (!clip) {
            throw new AppError("Feed clip not found", 404, "RESOURCE_NOT_FOUND");
        }

        await prisma.feedClip.delete({ where: { id: clip.id } });
        await objectStorage.remove([clip.clipAudioPath]);
        return { id: clip.id };
    }

    public async likeClip(
        viewerId: string,
        clipId: string
    ): Promise<FeedClipLikeResult> {
        return prisma.$transaction(async (tx) => {
            const clip = await tx.feedClip.findFirst({
                where: { id: clipId },
                select: { id: true, likeCount: true },
            });

            if (!clip) {
                throw new AppError(
                    "Feed clip not found",
                    404,
                    "RESOURCE_NOT_FOUND"
                );
            }

            const { count } = await tx.feedClipLike.createMany({
                data: [{ userId: viewerId, clipId }],
                skipDuplicates: true,
            });

            if (count === 0) {
                return {
                    id: clipId,
                    isLiked: true,
                    likeCount: clip.likeCount,
                };
            }

            const updated = await tx.feedClip.update({
                where: { id: clipId },
                data: { likeCount: { increment: 1 } },
                select: { likeCount: true },
            });

            return {
                id: clipId,
                isLiked: true,
                likeCount: updated.likeCount,
            };
        });
    }

    public async unlikeClip(
        viewerId: string,
        clipId: string
    ): Promise<FeedClipLikeResult> {
        return prisma.$transaction(async (tx) => {
            const clip = await tx.feedClip.findFirst({
                where: { id: clipId },
                select: { id: true, likeCount: true },
            });

            if (!clip) {
                throw new AppError(
                    "Feed clip not found",
                    404,
                    "RESOURCE_NOT_FOUND"
                );
            }

            const { count } = await tx.feedClipLike.deleteMany({
                where: { userId: viewerId, clipId },
            });

            if (count === 0) {
                return {
                    id: clipId,
                    isLiked: false,
                    likeCount: clip.likeCount,
                };
            }

            await tx.feedClip.updateMany({
                where: { id: clipId, likeCount: { gt: 0 } },
                data: { likeCount: { decrement: 1 } },
            });
            const updated = await tx.feedClip.findFirst({
                where: { id: clipId },
                select: { likeCount: true },
            });

            return {
                id: clipId,
                isLiked: false,
                likeCount: updated?.likeCount ?? 0,
            };
        });
    }

    public async listFeed(
        viewerId: string,
        query: ListFeedQuerySchema
    ): Promise<FeedClipPage> {
        const limit = query.limit;
        const poolSize = Math.max(limit * 4, 24);

        const following = await prisma.follow.findMany({
            where: { followerId: viewerId },
            select: { followingId: true },
        });
        const followingIds = following.map((row) => row.followingId);
        const followingSet = new Set(followingIds);

        const [followedClips, popularClips] = await Promise.all([
            followingIds.length === 0
                ? Promise.resolve([] as ClipRow[])
                : prisma.feedClip.findMany({
                      where: {
                          userId: { in: followingIds },
                          track: { status: TrackStatus.PUBLISHED },
                      },
                      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                      take: poolSize,
                      include: CLIP_INCLUDE,
                  }),
            prisma.feedClip.findMany({
                where: {
                    track: { status: TrackStatus.PUBLISHED },
                    ...(followingIds.length > 0
                        ? { userId: { notIn: followingIds } }
                        : {}),
                },
                orderBy: [
                    { likeCount: "desc" },
                    { track: { playCount: "desc" } },
                    { createdAt: "desc" },
                    { id: "desc" },
                ],
                take: poolSize,
                include: CLIP_INCLUDE,
            }),
        ]);

        // ~40% followed / ~60% popular, then shuffle without consecutive same artist.
        const followedQuota = Math.ceil(limit * 0.4);
        const popularQuota = limit - followedQuota;
        const picked = this.pickInterleaved(
            followedClips as ClipRow[],
            popularClips as ClipRow[],
            followedQuota,
            popularQuota,
            poolSize
        );

        let ordered = this.shuffleAvoidConsecutiveArtists(
            picked,
            `${viewerId}:${Math.floor(Date.now() / 3_600_000)}`
        );

        if (query.cursor) {
            const cursorIndex = ordered.findIndex(
                (clip) => clip.id === query.cursor
            );
            if (cursorIndex === -1) {
                const cursorClip = await prisma.feedClip.findFirst({
                    where: { id: query.cursor },
                    select: { createdAt: true },
                });
                if (!cursorClip) {
                    throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
                }
                ordered = ordered.filter(
                    (clip) =>
                        clip.createdAt.getTime() <
                            cursorClip.createdAt.getTime() ||
                        (clip.createdAt.getTime() ===
                            cursorClip.createdAt.getTime() &&
                            clip.id < query.cursor!)
                );
            } else {
                ordered = ordered.slice(cursorIndex + 1);
            }
        }

        const page = ordered.slice(0, limit);
        const likedRows =
            page.length === 0
                ? []
                : await prisma.feedClipLike.findMany({
                      where: {
                          userId: viewerId,
                          clipId: { in: page.map((clip) => clip.id) },
                      },
                      select: { clipId: true },
                  });
        const likedSet = new Set(likedRows.map((row) => row.clipId));

        const items = await Promise.all(
            page.map((clip) =>
                this.toFeedItem(clip, likedSet.has(clip.id), followingSet)
            )
        );

        const nextCursor =
            ordered.length > limit ? (page[page.length - 1]?.id ?? null) : null;

        return { items, nextCursor };
    }

    private async requireOwnedPublishedTrack(userId: string, trackId: string) {
        const track = await prisma.track.findFirst({
            where: { id: trackId, userId },
            select: { id: true, status: true },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }

        if (track.status !== TrackStatus.PUBLISHED) {
            throw new AppError(
                "Only PUBLISHED tracks can have feed clips",
                400,
                "BAD_REQUEST"
            );
        }

        return track;
    }

    private pickInterleaved(
        followed: ClipRow[],
        popular: ClipRow[],
        followedQuota: number,
        popularQuota: number,
        maxPool: number
    ): ClipRow[] {
        const seen = new Set<string>();
        const out: ClipRow[] = [];

        const take = (rows: ClipRow[], n: number) => {
            for (const row of rows) {
                if (out.length >= maxPool || n <= 0) break;
                if (seen.has(row.id)) continue;
                seen.add(row.id);
                out.push(row);
                n -= 1;
            }
        };

        take(followed, followedQuota);
        take(popular, popularQuota);
        take(followed, maxPool - out.length);
        take(popular, maxPool - out.length);
        return out;
    }

    private shuffleAvoidConsecutiveArtists(
        clips: ClipRow[],
        seed: string
    ): ClipRow[] {
        const rng = this.mulberry32(this.hashSeed(seed));
        const shuffled = [...clips];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
        }

        const result: ClipRow[] = [];
        const remaining = [...shuffled];
        while (remaining.length > 0) {
            const prevArtist = result[result.length - 1]?.userId;
            let index = remaining.findIndex(
                (clip) => clip.userId !== prevArtist
            );
            if (index === -1) index = 0;
            result.push(remaining.splice(index, 1)[0]!);
        }
        return result;
    }

    private hashSeed(seed: string): number {
        let h = 2166136261;
        for (let i = 0; i < seed.length; i += 1) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    private mulberry32(seed: number): () => number {
        let t = seed;
        return () => {
            t += 0x6d2b79f5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    private async toFeedItem(
        clip: ClipRow,
        isLiked: boolean,
        followingSet: Set<string>
    ): Promise<FeedClipItem> {
        const [clipAudioUrl, coverUrl, mixUrl] = await Promise.all([
            objectStorage.createSignedDownloadUrl(clip.clipAudioPath),
            clip.track.coverPath
                ? objectStorage.createSignedDownloadUrl(clip.track.coverPath)
                : Promise.resolve(null),
            clip.track.mixPath
                ? objectStorage.createSignedDownloadUrl(clip.track.mixPath)
                : Promise.resolve(null),
        ]);

        return {
            id: clip.id,
            trackId: clip.trackId,
            title: clip.track.title,
            caption: clip.track.caption,
            clipAudioUrl,
            mixUrl,
            coverUrl,
            durationMs: clip.durationMs,
            trackDurationMs: clip.track.durationMs,
            startMs: clip.startMs,
            endMs: clip.endMs,
            likeCount: clip.likeCount,
            commentCount: clip.track.commentCount,
            isLiked,
            artist: {
                id: clip.user.id,
                username: clip.user.username,
                name: clip.user.name,
                avatarUrl: publicUrl(clip.user.avatarPath),
                isFollowing: followingSet.has(clip.user.id),
            },
        };
    }
}

export const feedClipService = new FeedClipService();
