import { Prisma, TrackStatus } from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { AppError } from "@/server/utils/global-error";
import type { CommentSort, CreateCommentSchema } from "./comment.validator";

export type CommentAuthor = {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
};

export type TrackCommentDto = {
    id: string;
    body: string;
    createdAt: string;
    likeCount: number;
    isLiked: boolean;
    isOwn: boolean;
    author: CommentAuthor;
    replies?: TrackCommentDto[];
};

export type CommentLikeResult = {
    id: string;
    likeCount: number;
    isLiked: boolean;
};

export type DeleteCommentResult = {
    id: string;
    commentCount: number;
};

type CommentRow = {
    id: string;
    userId: string;
    body: string;
    likeCount: number;
    createdAt: Date;
    user: {
        id: string;
        username: string;
        name: string | null;
        avatarPath: string | null;
    };
    likes: { id: string }[];
};

type TopLevelCommentRow = CommentRow & { replies: CommentRow[] };

const authorSelect = {
    id: true,
    username: true,
    name: true,
    avatarPath: true,
} as const;

function rowInclude(viewerId: string) {
    return {
        user: { select: authorSelect },
        likes: { where: { userId: viewerId }, select: { id: true } },
    } as const;
}

const ORDER_BY: Record<CommentSort, Prisma.TrackCommentOrderByWithRelationInput[]> =
    {
        newest: [{ createdAt: "desc" }, { id: "desc" }],
        top: [{ likeCount: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    };

function isPrismaError(error: unknown, code: string): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === code
    );
}

class CommentService {
    public async listComments(
        viewerId: string,
        trackId: string,
        sort: CommentSort
    ): Promise<TrackCommentDto[]> {
        await this.requirePublishedTrack(trackId);

        const rows = (await prisma.trackComment.findMany({
            where: { trackId, parentId: null },
            orderBy: ORDER_BY[sort],
            include: {
                ...rowInclude(viewerId),
                replies: {
                    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                    include: rowInclude(viewerId),
                },
            },
        })) as TopLevelCommentRow[];

        return rows.map((row) => ({
            ...this.toDto(row, viewerId),
            replies: row.replies.map((reply) => this.toDto(reply, viewerId)),
        }));
    }

    public async createComment(
        viewerId: string,
        trackId: string,
        payload: CreateCommentSchema
    ): Promise<TrackCommentDto> {
        await this.requirePublishedTrack(trackId);

        const parentId = payload.parentId ?? null;
        if (parentId) {
            const parent = await prisma.trackComment.findUnique({
                where: { id: parentId },
                select: { id: true, trackId: true, parentId: true },
            });

            if (!parent || parent.trackId !== trackId) {
                throw new AppError(
                    "Parent comment not found on this track",
                    400,
                    "BAD_REQUEST"
                );
            }

            if (parent.parentId !== null) {
                throw new AppError(
                    "Cannot reply to a reply",
                    400,
                    "BAD_REQUEST"
                );
            }
        }

        try {
            const row = await prisma.$transaction(async (tx) => {
                const created = await tx.trackComment.create({
                    data: {
                        trackId,
                        userId: viewerId,
                        parentId,
                        body: payload.body,
                    },
                    include: rowInclude(viewerId),
                });

                await tx.track.update({
                    where: { id: trackId },
                    data: { commentCount: { increment: 1 } },
                });

                return created as CommentRow;
            });

            return this.toDto(row, viewerId);
        } catch (error) {
            // Parent deleted between validation and insert.
            if (isPrismaError(error, "P2003")) {
                throw new AppError(
                    "Parent comment not found on this track",
                    400,
                    "BAD_REQUEST"
                );
            }
            throw error;
        }
    }

    public async deleteComment(
        viewerId: string,
        commentId: string
    ): Promise<DeleteCommentResult> {
        const comment = await prisma.trackComment.findUnique({
            where: { id: commentId },
            select: { id: true, trackId: true, userId: true, parentId: true },
        });

        if (!comment) {
            throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
        }

        if (comment.userId !== viewerId) {
            throw new AppError("Forbidden", 403, "FORBIDDEN");
        }

        try {
            const commentCount = await prisma.$transaction(async (tx) => {
                // Replies cascade-delete with a top-level parent, so they leave the count too.
                const replyCount =
                    comment.parentId === null
                        ? await tx.trackComment.count({
                              where: { parentId: comment.id },
                          })
                        : 0;

                await tx.trackComment.delete({ where: { id: comment.id } });

                return this.decrementCommentCount(
                    tx,
                    comment.trackId,
                    1 + replyCount
                );
            });

            return { id: commentId, commentCount };
        } catch (error) {
            if (isPrismaError(error, "P2025")) {
                throw new AppError(
                    "Comment not found",
                    404,
                    "RESOURCE_NOT_FOUND"
                );
            }
            throw error;
        }
    }

    public async likeComment(
        viewerId: string,
        commentId: string
    ): Promise<CommentLikeResult> {
        await this.requirePublishedComment(commentId);

        try {
            const likeCount = await prisma.$transaction(async (tx) => {
                const inserted = await tx.trackCommentLike.createMany({
                    data: [{ commentId, userId: viewerId }],
                    skipDuplicates: true,
                });

                if (inserted.count > 0) {
                    const updated = await tx.trackComment.update({
                        where: { id: commentId },
                        data: { likeCount: { increment: 1 } },
                        select: { likeCount: true },
                    });
                    return updated.likeCount;
                }

                return this.readLikeCount(tx, commentId);
            });

            return { id: commentId, likeCount, isLiked: true };
        } catch (error) {
            if (isPrismaError(error, "P2003") || isPrismaError(error, "P2025")) {
                throw new AppError(
                    "Comment not found",
                    404,
                    "RESOURCE_NOT_FOUND"
                );
            }
            throw error;
        }
    }

    public async unlikeComment(
        viewerId: string,
        commentId: string
    ): Promise<CommentLikeResult> {
        await this.requirePublishedComment(commentId);

        try {
            const likeCount = await prisma.$transaction(async (tx) => {
                const removed = await tx.trackCommentLike.deleteMany({
                    where: { commentId, userId: viewerId },
                });

                if (removed.count > 0) {
                    const updated = await tx.trackComment.update({
                        where: { id: commentId },
                        data: { likeCount: { decrement: 1 } },
                        select: { likeCount: true },
                    });
                    return updated.likeCount;
                }

                return this.readLikeCount(tx, commentId);
            });

            return { id: commentId, likeCount, isLiked: false };
        } catch (error) {
            if (isPrismaError(error, "P2025")) {
                throw new AppError(
                    "Comment not found",
                    404,
                    "RESOURCE_NOT_FOUND"
                );
            }
            throw error;
        }
    }

    private async decrementCommentCount(
        tx: Prisma.TransactionClient,
        trackId: string,
        amount: number
    ): Promise<number> {
        const updated = await tx.track.update({
            where: { id: trackId },
            data: { commentCount: { decrement: amount } },
            select: { commentCount: true },
        });

        if (updated.commentCount >= 0) {
            return updated.commentCount;
        }

        await tx.track.update({
            where: { id: trackId },
            data: { commentCount: 0 },
        });
        return 0;
    }

    private async readLikeCount(
        tx: Prisma.TransactionClient,
        commentId: string
    ): Promise<number> {
        const comment = await tx.trackComment.findUnique({
            where: { id: commentId },
            select: { likeCount: true },
        });

        if (!comment) {
            throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
        }

        return comment.likeCount;
    }

    private async requirePublishedTrack(trackId: string): Promise<void> {
        const track = await prisma.track.findFirst({
            where: { id: trackId, status: TrackStatus.PUBLISHED },
            select: { id: true },
        });

        if (!track) {
            throw new AppError("Track not found", 404, "RESOURCE_NOT_FOUND");
        }
    }

    private async requirePublishedComment(commentId: string): Promise<void> {
        const comment = await prisma.trackComment.findUnique({
            where: { id: commentId },
            select: { id: true, track: { select: { status: true } } },
        });

        if (!comment || comment.track.status !== TrackStatus.PUBLISHED) {
            throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
        }
    }

    private toDto(row: CommentRow, viewerId: string): TrackCommentDto {
        return {
            id: row.id,
            body: row.body,
            createdAt: row.createdAt.toISOString(),
            likeCount: row.likeCount,
            isLiked: row.likes.length > 0,
            isOwn: row.userId === viewerId,
            author: {
                id: row.user.id,
                username: row.user.username,
                name: row.user.name,
                avatarUrl: publicUrl(row.user.avatarPath),
            },
        };
    }
}

export const commentService = new CommentService();
