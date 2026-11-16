import { TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import {
    discoverService,
    type DiscoverTrackItem,
} from "./discover.service";

const PLAY_HISTORY_LIMIT = 50;
const TASTE_TOP_GENRES = 8;
const COLD_START_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const CANDIDATE_POOL = 80;

export type MadeForYouTrackItem = DiscoverTrackItem & {
    reason: "taste" | "fresh";
};

class TasteService {
    public async listMadeForYou(
        viewerId: string,
        limit: number
    ): Promise<MadeForYouTrackItem[]> {
        const tasteGenres = await this.buildTasteGenres(viewerId);

        if (tasteGenres.length === 0) {
            return this.listFreshFallback(viewerId, limit);
        }

        const candidates = await prisma.track.findMany({
            where: {
                status: TrackStatus.PUBLISHED,
                userId: { not: viewerId },
                genres: { hasSome: tasteGenres },
            },
            take: CANDIDATE_POOL,
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
        });

        if (candidates.length === 0) {
            return this.listFreshFallback(viewerId, limit);
        }

        const tasteSet = new Set(tasteGenres);
        const ranked = [...candidates].sort((a, b) => {
            const overlapA = a.genres.filter((g) => tasteSet.has(g)).length;
            const overlapB = b.genres.filter((g) => tasteSet.has(g)).length;
            if (overlapB !== overlapA) {
                return overlapB - overlapA;
            }
            if (b.playCount !== a.playCount) {
                return b.playCount - a.playCount;
            }
            const aPub = a.publishedAt?.getTime() ?? 0;
            const bPub = b.publishedAt?.getTime() ?? 0;
            return bPub - aPub;
        });

        const selected = ranked.slice(0, limit);
        const items = await Promise.all(
            selected.map((track) => discoverService.toTrackItem(track))
        );

        return items.map((item) => ({ ...item, reason: "taste" as const }));
    }

    private async buildTasteGenres(viewerId: string): Promise<string[]> {
        const user = await prisma.user.findUnique({
            where: { id: viewerId },
            select: { preferredGenres: true },
        });

        const frequency = new Map<string, number>();

        const bump = (genre: string, weight: number) => {
            frequency.set(genre, (frequency.get(genre) ?? 0) + weight);
        };

        for (const genre of user?.preferredGenres ?? []) {
            bump(genre, 3);
        }

        const plays = await prisma.trackPlay.findMany({
            where: { userId: viewerId },
            orderBy: { createdAt: "desc" },
            take: PLAY_HISTORY_LIMIT,
            select: {
                track: { select: { genres: true } },
            },
        });

        plays.forEach((play, index) => {
            // Newer plays weigh slightly more.
            const weight = 2 + (index < 10 ? 1 : 0);
            for (const genre of play.track.genres) {
                bump(genre, weight);
            }
        });

        if (frequency.size < 3) {
            const likes = await prisma.likedTrack.findMany({
                where: { userId: viewerId },
                orderBy: { likedAt: "desc" },
                take: 30,
                select: {
                    track: { select: { genres: true } },
                },
            });

            for (const like of likes) {
                for (const genre of like.track.genres) {
                    bump(genre, 1);
                }
            }
        }

        return [...frequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, TASTE_TOP_GENRES)
            .map(([genre]) => genre);
    }

    private async listFreshFallback(
        viewerId: string,
        limit: number
    ): Promise<MadeForYouTrackItem[]> {
        const since = new Date(Date.now() - COLD_START_WINDOW_MS);

        const tracks = await prisma.track.findMany({
            where: {
                status: TrackStatus.PUBLISHED,
                userId: { not: viewerId },
                publishedAt: { gte: since },
            },
            orderBy: { publishedAt: "desc" },
            take: limit,
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
        });

        const items = await Promise.all(
            tracks.map((track) => discoverService.toTrackItem(track))
        );

        return items.map((item) => ({ ...item, reason: "fresh" as const }));
    }
}

export const tasteService = new TasteService();
