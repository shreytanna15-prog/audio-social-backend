import { SearchRecentKind } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { AppError } from "@/server/utils/global-error";
import { userService } from "@/server/modules/user/user.service";
import type { RecordSearchRecentSchema } from "./search-recent.validator";

const RECENT_CAP = 20;

export type SearchRecentItem = {
    id: string;
    kind: "ARTIST";
    query: string | null;
    targetUser: {
        id: string;
        username: string;
        name: string | null;
    };
    updatedAt: string;
};

class SearchRecentService {
    public async list(userId: string): Promise<SearchRecentItem[]> {
        const rows = await prisma.searchRecent.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            take: RECENT_CAP,
            include: {
                targetUser: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                    },
                },
            },
        });

        return rows.map((row) => ({
            id: row.id,
            kind: "ARTIST" as const,
            query: row.query,
            targetUser: row.targetUser,
            updatedAt: row.updatedAt.toISOString(),
        }));
    }

    public async record(
        userId: string,
        payload: RecordSearchRecentSchema
    ): Promise<SearchRecentItem[]> {
        if (payload.targetUserId === userId) {
            throw new AppError(
                "Cannot record yourself as a recent search",
                400,
                "BAD_REQUEST"
            );
        }

        await userService.findById(payload.targetUserId);

        await prisma.searchRecent.upsert({
            where: {
                userId_kind_targetUserId: {
                    userId,
                    kind: SearchRecentKind.ARTIST,
                    targetUserId: payload.targetUserId,
                },
            },
            create: {
                userId,
                kind: SearchRecentKind.ARTIST,
                targetUserId: payload.targetUserId,
                query: payload.query ?? null,
            },
            update: {
                query: payload.query ?? null,
            },
        });

        await this.trimToCap(userId);

        return this.list(userId);
    }

    public async clear(userId: string): Promise<{ ok: true }> {
        await prisma.searchRecent.deleteMany({ where: { userId } });
        return { ok: true };
    }

    private async trimToCap(userId: string): Promise<void> {
        const excess = await prisma.searchRecent.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            skip: RECENT_CAP,
            select: { id: true },
        });

        if (excess.length === 0) {
            return;
        }

        await prisma.searchRecent.deleteMany({
            where: {
                id: { in: excess.map((row) => row.id) },
            },
        });
    }
}

export const searchRecentService = new SearchRecentService();
