import { PlaylistVisibility } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import {
    PLAYLIST_SUMMARY_INCLUDE,
    playlistService,
} from "@/server/modules/playlist/playlist.service";

export type HomePlaylistItem = {
    id: string;
    title: string;
    coverUrl: string | null;
    coverFallbackUrls: string[];
    trackCount: number;
    source: "owned" | "saved";
    owner?: {
        id: string;
        username: string;
        name: string | null;
    };
};

type RankedPlaylist = HomePlaylistItem & { touchedAt: number };

class HomeService {
    public async listHomePlaylists(
        viewerId: string,
        limit: number
    ): Promise<HomePlaylistItem[]> {
        const [ownedRows, savedRows] = await Promise.all([
            prisma.playlist.findMany({
                where: { userId: viewerId },
                include: PLAYLIST_SUMMARY_INCLUDE,
            }),
            prisma.savedPlaylist.findMany({
                where: { userId: viewerId },
                include: {
                    playlist: {
                        include: {
                            ...PLAYLIST_SUMMARY_INCLUDE,
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        const owned: RankedPlaylist[] = await Promise.all(
            ownedRows.map(async (row) => {
                const summary = await playlistService.toSummary(row);
                return {
                    id: summary.id,
                    title: summary.title,
                    coverUrl: summary.coverUrl,
                    coverFallbackUrls: summary.coverFallbackUrls,
                    trackCount: summary.trackCount,
                    source: "owned" as const,
                    touchedAt: row.updatedAt.getTime(),
                };
            })
        );

        const saved: RankedPlaylist[] = [];
        for (const row of savedRows) {
            if (row.playlist.visibility !== PlaylistVisibility.PUBLIC) {
                continue;
            }
            const summary = await playlistService.toSummary(row.playlist);
            saved.push({
                id: summary.id,
                title: summary.title,
                coverUrl: summary.coverUrl,
                coverFallbackUrls: summary.coverFallbackUrls,
                trackCount: summary.trackCount,
                source: "saved",
                owner: {
                    id: row.playlist.user.id,
                    username: row.playlist.user.username,
                    name: row.playlist.user.name,
                },
                touchedAt: row.savedAt.getTime(),
            });
        }

        return [...owned, ...saved]
            .sort((a, b) => b.touchedAt - a.touchedAt)
            .slice(0, limit)
            .map(({ touchedAt: _, ...item }) => item);
    }
}

export const homeService = new HomeService();
