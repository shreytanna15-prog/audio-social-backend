import { SearchRecentKind } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { AppError } from "@/server/utils/global-error";
import { userService } from "@/server/modules/user/user.service";
import type { RecordSearchRecentSchema } from "./search-recent.validator";

const RECENT_CAP = 20;

export type SearchRecentKindValue = "ARTIST" | "SONG" | "ALBUM" | "PLAYLIST";

export type SearchRecentItem = {
    id: string;
    kind: SearchRecentKindValue;
    targetKey: string;
    query: string | null;
    title: string | null;
    subtitle: string | null;
    coverUrl: string | null;
    targetUser: {
        id: string;
        username: string;
        name: string | null;
    } | null;
    updatedAt: string;
};

function mapKind(kind: SearchRecentKind): SearchRecentKindValue {
    return kind as SearchRecentKindValue;
}

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

        return rows.map((row) => this.toItem(row));
    }

    public async record(
        userId: string,
        payload: RecordSearchRecentSchema
    ): Promise<SearchRecentItem[]> {
        if (payload.kind === "ARTIST") {
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
                    userId_kind_targetKey: {
                        userId,
                        kind: SearchRecentKind.ARTIST,
                        targetKey: payload.targetUserId,
                    },
                },
                create: {
                    userId,
                    kind: SearchRecentKind.ARTIST,
                    targetKey: payload.targetUserId,
                    targetUserId: payload.targetUserId,
                    query: payload.query ?? null,
                    title: null,
                    subtitle: null,
                    coverUrl: null,
                },
                update: {
                    query: payload.query ?? null,
                    targetUserId: payload.targetUserId,
                },
            });
        } else {
            const kind =
                payload.kind === "SONG"
                    ? SearchRecentKind.SONG
                    : payload.kind === "ALBUM"
                      ? SearchRecentKind.ALBUM
                      : SearchRecentKind.PLAYLIST;

            await prisma.searchRecent.upsert({
                where: {
                    userId_kind_targetKey: {
                        userId,
                        kind,
                        targetKey: payload.targetId,
                    },
                },
                create: {
                    userId,
                    kind,
                    targetKey: payload.targetId,
                    targetUserId: null,
                    title: payload.title,
                    subtitle: payload.subtitle ?? null,
                    coverUrl: payload.coverUrl ?? null,
                    query: payload.query ?? null,
                },
                update: {
                    title: payload.title,
                    subtitle: payload.subtitle ?? null,
                    coverUrl: payload.coverUrl ?? null,
                    query: payload.query ?? null,
                },
            });
        }

        await this.trimToCap(userId);

        return this.list(userId);
    }

    public async remove(userId: string, id: string): Promise<SearchRecentItem[]> {
        const existing = await prisma.searchRecent.findFirst({
            where: { id, userId },
            select: { id: true },
        });

        if (!existing) {
            throw new AppError(
                "Recent search not found",
                404,
                "RESOURCE_NOT_FOUND"
            );
        }

        await prisma.searchRecent.delete({ where: { id } });

        return this.list(userId);
    }

    public async clear(userId: string): Promise<{ ok: true }> {
        await prisma.searchRecent.deleteMany({ where: { userId } });
        return { ok: true };
    }

    private toItem(row: {
        id: string;
        kind: SearchRecentKind;
        targetKey: string;
        query: string | null;
        title: string | null;
        subtitle: string | null;
        coverUrl: string | null;
        updatedAt: Date;
        targetUser: {
            id: string;
            username: string;
            name: string | null;
        } | null;
    }): SearchRecentItem {
        const kind = mapKind(row.kind);
        const targetUser = row.targetUser;

        if (kind === "ARTIST" && targetUser) {
            return {
                id: row.id,
                kind,
                targetKey: row.targetKey,
                query: row.query,
                title: targetUser.name,
                subtitle: `@${targetUser.username}`,
                coverUrl: null,
                targetUser,
                updatedAt: row.updatedAt.toISOString(),
            };
        }

        return {
            id: row.id,
            kind,
            targetKey: row.targetKey,
            query: row.query,
            title: row.title,
            subtitle: row.subtitle,
            coverUrl: row.coverUrl,
            targetUser: null,
            updatedAt: row.updatedAt.toISOString(),
        };
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
