import { prisma } from "@/server/config/prisma";
import type { AdminGrowthQuery } from "@/server/modules/admin/admin-metrics.validator";

export type GrowthPoint = {
    date: string;
    usersCreated: number;
    tracksPublished: number;
};

export type GrowthMetrics = {
    range: "7d" | "30d";
    series: GrowthPoint[];
    totals: {
        totalUsers: number;
        totalPublishedTracks: number;
    };
};

function rangeDays(range: "7d" | "30d"): number {
    return range === "30d" ? 30 : 7;
}

function utcDayKeys(days: number): string[] {
    const keys: string[] = [];
    const now = new Date();
    const todayUtc = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    );

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(todayUtc - i * 24 * 60 * 60 * 1000);
        keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
}

function toUtcDayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

class AdminMetricsService {
    public async getGrowth(query: AdminGrowthQuery): Promise<GrowthMetrics> {
        const days = rangeDays(query.range);
        const seriesKeys = utcDayKeys(days);
        const windowStart = new Date(`${seriesKeys[0]}T00:00:00.000Z`);

        const [usersInWindow, tracksInWindow, totalUsers, totalPublishedTracks] =
            await Promise.all([
                prisma.user.findMany({
                    where: { createdAt: { gte: windowStart } },
                    select: { createdAt: true },
                }),
                prisma.track.findMany({
                    where: {
                        status: "PUBLISHED",
                        publishedAt: { gte: windowStart },
                    },
                    select: { publishedAt: true },
                }),
                prisma.user.count(),
                prisma.track.count({ where: { status: "PUBLISHED" } }),
            ]);

        const usersByDay = new Map<string, number>();
        const tracksByDay = new Map<string, number>();
        for (const key of seriesKeys) {
            usersByDay.set(key, 0);
            tracksByDay.set(key, 0);
        }

        for (const user of usersInWindow) {
            const key = toUtcDayKey(user.createdAt);
            if (usersByDay.has(key)) {
                usersByDay.set(key, (usersByDay.get(key) ?? 0) + 1);
            }
        }

        for (const track of tracksInWindow) {
            if (!track.publishedAt) continue;
            const key = toUtcDayKey(track.publishedAt);
            if (tracksByDay.has(key)) {
                tracksByDay.set(key, (tracksByDay.get(key) ?? 0) + 1);
            }
        }

        return {
            range: query.range,
            series: seriesKeys.map((date) => ({
                date,
                usersCreated: usersByDay.get(date) ?? 0,
                tracksPublished: tracksByDay.get(date) ?? 0,
            })),
            totals: {
                totalUsers,
                totalPublishedTracks,
            },
        };
    }
}

export const adminMetricsService = new AdminMetricsService();
