import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { commentService } from "@/server/modules/comment/comment.service";
import {
    createCommentSchema,
    listCommentsQuerySchema,
} from "@/server/modules/comment/comment.validator";

const VIEWER = "11111111-1111-7111-8111-111111111111";
const OTHER = "22222222-2222-7222-8222-222222222222";
const TRACK = "33333333-3333-7333-8333-333333333333";
const OTHER_TRACK = "44444444-4444-7444-8444-444444444444";
const TOP = "55555555-5555-7555-8555-555555555555";
const REPLY = "66666666-6666-7666-8666-666666666666";

function commentRow(overrides: Record<string, unknown> = {}) {
    return {
        id: TOP,
        userId: VIEWER,
        body: "hello",
        likeCount: 0,
        createdAt: new Date("2026-11-07T00:00:00.000Z"),
        user: { id: VIEWER, username: "v", name: null, avatarPath: null },
        likes: [],
        ...overrides,
    };
}

describe("commentService.createComment (unit)", () => {
    beforeEach(() => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue({
            id: TRACK,
        } as never);
        vi.mocked(prisma.trackComment.create).mockResolvedValue(
            commentRow() as never
        );
        vi.mocked(prisma.track.update).mockResolvedValue({} as never);
    });

    it("rejects reply-to-reply with 400", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: REPLY,
            trackId: TRACK,
            parentId: TOP,
        } as never);

        await expect(
            commentService.createComment(VIEWER, TRACK, {
                body: "nested",
                parentId: REPLY,
            })
        ).rejects.toMatchObject({
            status: 400,
            code: "BAD_REQUEST",
            message: "Cannot reply to a reply",
        });

        expect(prisma.trackComment.create).not.toHaveBeenCalled();
        expect(prisma.track.update).not.toHaveBeenCalled();
    });

    it("rejects a parent from a different track with 400", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            trackId: OTHER_TRACK,
            parentId: null,
        } as never);

        await expect(
            commentService.createComment(VIEWER, TRACK, {
                body: "wrong track",
                parentId: TOP,
            })
        ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
    });

    it("404 when track is not PUBLISHED", async () => {
        vi.mocked(prisma.track.findFirst).mockResolvedValue(null);

        await expect(
            commentService.createComment(VIEWER, TRACK, { body: "hi" })
        ).rejects.toMatchObject({ status: 404, code: "RESOURCE_NOT_FOUND" });
        expect(prisma.track.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: TRACK, status: "PUBLISHED" },
            })
        );
    });

    it("creates a reply to a top-level comment and bumps commentCount by 1", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            trackId: TRACK,
            parentId: null,
        } as never);
        vi.mocked(prisma.trackComment.create).mockResolvedValue(
            commentRow({ id: REPLY }) as never
        );

        const dto = await commentService.createComment(VIEWER, TRACK, {
            body: "reply",
            parentId: TOP,
        });

        expect(prisma.trackComment.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    trackId: TRACK,
                    userId: VIEWER,
                    parentId: TOP,
                    body: "reply",
                },
            })
        );
        expect(prisma.track.update).toHaveBeenCalledWith({
            where: { id: TRACK },
            data: { commentCount: { increment: 1 } },
        });
        expect(dto).toMatchObject({ id: REPLY, isOwn: true, isLiked: false });
    });
});

describe("commentService.deleteComment (unit)", () => {
    beforeEach(() => {
        vi.mocked(prisma.trackComment.delete).mockResolvedValue({} as never);
    });

    it("403 when viewer is not the author", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            trackId: TRACK,
            userId: OTHER,
            parentId: null,
        } as never);

        await expect(
            commentService.deleteComment(VIEWER, TOP)
        ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
        expect(prisma.trackComment.delete).not.toHaveBeenCalled();
    });

    it("top-level delete decrements by 1 + reply count", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            trackId: TRACK,
            userId: VIEWER,
            parentId: null,
        } as never);
        vi.mocked(prisma.trackComment.count).mockResolvedValue(2);
        vi.mocked(prisma.track.update).mockResolvedValue({
            commentCount: 4,
        } as never);

        const result = await commentService.deleteComment(VIEWER, TOP);

        expect(prisma.trackComment.count).toHaveBeenCalledWith({
            where: { parentId: TOP },
        });
        expect(prisma.track.update).toHaveBeenCalledWith({
            where: { id: TRACK },
            data: { commentCount: { decrement: 3 } },
            select: { commentCount: true },
        });
        expect(result).toEqual({ id: TOP, commentCount: 4 });
    });

    it("reply delete decrements by 1 without counting replies", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: REPLY,
            trackId: TRACK,
            userId: VIEWER,
            parentId: TOP,
        } as never);
        vi.mocked(prisma.track.update).mockResolvedValue({
            commentCount: 5,
        } as never);

        await commentService.deleteComment(VIEWER, REPLY);

        expect(prisma.trackComment.count).not.toHaveBeenCalled();
        expect(prisma.track.update).toHaveBeenCalledWith({
            where: { id: TRACK },
            data: { commentCount: { decrement: 1 } },
            select: { commentCount: true },
        });
    });

    it("floors commentCount at 0 when the denormalized count drifted", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            trackId: TRACK,
            userId: VIEWER,
            parentId: null,
        } as never);
        vi.mocked(prisma.trackComment.count).mockResolvedValue(2);
        vi.mocked(prisma.track.update)
            .mockResolvedValueOnce({ commentCount: -1 } as never)
            .mockResolvedValueOnce({} as never);

        const result = await commentService.deleteComment(VIEWER, TOP);

        expect(prisma.track.update).toHaveBeenLastCalledWith({
            where: { id: TRACK },
            data: { commentCount: 0 },
        });
        expect(result.commentCount).toBe(0);
    });
});

describe("commentService likes (unit)", () => {
    beforeEach(() => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            track: { status: "PUBLISHED" },
        } as never);
    });

    it("like bumps likeCount only on a real insert", async () => {
        vi.mocked(prisma.trackCommentLike.createMany).mockResolvedValue({
            count: 1,
        } as never);
        vi.mocked(prisma.trackComment.update).mockResolvedValue({
            likeCount: 1,
        } as never);

        await expect(commentService.likeComment(VIEWER, TOP)).resolves.toEqual({
            id: TOP,
            likeCount: 1,
            isLiked: true,
        });
    });

    it("repeat like is a no-op on likeCount", async () => {
        vi.mocked(prisma.trackCommentLike.createMany).mockResolvedValue({
            count: 0,
        } as never);
        vi.mocked(prisma.trackComment.findUnique)
            .mockReset()
            .mockResolvedValueOnce({
                id: TOP,
                track: { status: "PUBLISHED" },
            } as never)
            .mockResolvedValueOnce({ likeCount: 1 } as never);

        const result = await commentService.likeComment(VIEWER, TOP);

        expect(prisma.trackComment.update).not.toHaveBeenCalled();
        expect(result.likeCount).toBe(1);
    });

    it("unlike without an existing like does not decrement", async () => {
        vi.mocked(prisma.trackCommentLike.deleteMany).mockResolvedValue({
            count: 0,
        } as never);
        vi.mocked(prisma.trackComment.findUnique)
            .mockReset()
            .mockResolvedValueOnce({
                id: TOP,
                track: { status: "PUBLISHED" },
            } as never)
            .mockResolvedValueOnce({ likeCount: 0 } as never);

        const result = await commentService.unlikeComment(VIEWER, TOP);

        expect(prisma.trackComment.update).not.toHaveBeenCalled();
        expect(result).toEqual({ id: TOP, likeCount: 0, isLiked: false });
    });

    it("404 when the comment's track is unpublished", async () => {
        vi.mocked(prisma.trackComment.findUnique).mockResolvedValue({
            id: TOP,
            track: { status: "DRAFT" },
        } as never);

        await expect(
            commentService.likeComment(VIEWER, TOP)
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe("comment validators", () => {
    it("trims and enforces 1-300 body", () => {
        expect(createCommentSchema.safeParse({ body: "   " }).success).toBe(
            false
        );
        expect(
            createCommentSchema.safeParse({ body: "a".repeat(301) }).success
        ).toBe(false);
        expect(createCommentSchema.parse({ body: "  hi  " }).body).toBe("hi");
    });

    it("defaults sort to newest and rejects unknown sorts", () => {
        expect(listCommentsQuerySchema.parse({}).sort).toBe("newest");
        expect(listCommentsQuerySchema.safeParse({ sort: "hot" }).success).toBe(
            false
        );
    });
});
