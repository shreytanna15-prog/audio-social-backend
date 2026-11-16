import { TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import {
    discoverService,
    type DiscoverTrackItem,
} from "@/server/modules/discover/discover.service";

export type RecentlyPlayedItem = DiscoverTrackItem & {
    playedAt: string;
};

class PlayService {
    public async listRecentlyPlayed(
        userId: string,
        limit: number
    ): Promise<RecentlyPlayedItem[]> {
        // Over-fetch then distinct by trackId so we keep the latest play per track.
        const plays = await prisma.trackPlay.findMany({
            where: {
                userId,
                track: { status: TrackStatus.PUBLISHED },
            },
            orderBy: { createdAt: "desc" },
            take: Math.min(limit * 8, 160),
            select: {
                createdAt: true,
                trackId: true,
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

        const seen = new Set<string>();
        const distinct: typeof plays = [];
        for (const play of plays) {
            if (seen.has(play.trackId)) continue;
            seen.add(play.trackId);
            distinct.push(play);
            if (distinct.length >= limit) break;
        }

        return Promise.all(
            distinct.map(async (play) => {
                const item = await discoverService.toTrackItem(play.track);
                return {
                    ...item,
                    playedAt: play.createdAt.toISOString(),
                };
            })
        );
    }
}

export const playService = new PlayService();
