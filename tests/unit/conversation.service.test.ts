import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import { AppError } from "@/server/utils/global-error";

vi.mock("@/server/lib/realtime-notify", () => ({
    notifyRealtime: vi.fn(),
}));

vi.mock("@/server/config/supabase", () => ({
    supabase: {
        storage: {
            from: () => ({
                createSignedUploadUrl: vi.fn(),
                createSignedUrl: vi.fn(),
                list: vi.fn(),
                remove: vi.fn(),
            }),
        },
    },
}));

const A = "aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb";
const CONV = "cccccccc-cccc-7ccc-8ccc-cccccccccccc";

describe("conversationService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("createRequest rejects messaging yourself", async () => {
        await expect(
            conversationService.createRequest(A, {
                userId: A,
                body: "hi",
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Cannot message yourself",
        } satisfies Partial<AppError>);
    });

    it("createRequest 404 when target missing", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        await expect(
            conversationService.createRequest(A, {
                userId: B,
                body: "hey",
            })
        ).rejects.toMatchObject({
            status: 404,
            code: "RESOURCE_NOT_FOUND",
        });
    });

    it("createRequest rejects when conversation already accepted", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: B } as never);
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            status: "ACCEPTED",
            userLowId: A,
            userHighId: B,
            initiatedById: A,
            messages: [],
            userLow: { id: A, username: "a", name: null, avatarPath: null },
            userHigh: { id: B, username: "b", name: null, avatarPath: null },
        } as never);

        await expect(
            conversationService.createRequest(A, {
                userId: B,
                body: "again",
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Conversation already accepted. Send a message instead.",
        });
    });

    it("accept rejects non-recipient", async () => {
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            status: "PENDING",
            userLowId: A,
            userHighId: B,
            initiatedById: A,
            userLow: { id: A, username: "a", name: null, avatarPath: null },
            userHigh: { id: B, username: "b", name: null, avatarPath: null },
            messages: [{ id: "m1", type: "TEXT", body: "hi", createdAt: new Date() }],
        } as never);

        await expect(conversationService.accept(A, CONV)).rejects.toMatchObject({
            status: 403,
        });
    });

    it("accept marks conversation ACCEPTED for recipient", async () => {
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            status: "PENDING",
            userLowId: A,
            userHighId: B,
            initiatedById: A,
            userLow: { id: A, username: "a", name: null, avatarPath: null },
            userHigh: { id: B, username: "b", name: null, avatarPath: null },
            messages: [
                {
                    id: "m1",
                    type: "TEXT",
                    body: "hi",
                    senderId: A,
                    conversationId: CONV,
                    audioPath: null,
                    durationMs: null,
                    createdAt: new Date(),
                },
            ],
        } as never);
        vi.mocked(prisma.conversation.update).mockResolvedValue({
            id: CONV,
            status: "ACCEPTED",
            userLowId: A,
            userHighId: B,
            initiatedById: A,
            lastMessageAt: new Date(),
            userLow: { id: A, username: "a", name: null, avatarPath: null },
            userHigh: { id: B, username: "b", name: null, avatarPath: null },
            messages: [
                {
                    id: "m1",
                    type: "TEXT",
                    body: "hi",
                    senderId: A,
                    conversationId: CONV,
                    audioPath: null,
                    durationMs: null,
                    createdAt: new Date(),
                },
            ],
        } as never);

        const result = await conversationService.accept(B, CONV);
        expect(prisma.conversation.update).toHaveBeenCalled();
        expect(result.status).toBe("ACCEPTED");
    });

    it("decline rejects initiator", async () => {
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            status: "PENDING",
            userLowId: A,
            userHighId: B,
            initiatedById: A,
            userLow: { id: A, username: "a", name: null, avatarPath: null },
            userHigh: { id: B, username: "b", name: null, avatarPath: null },
            messages: [],
        } as never);

        await expect(conversationService.decline(A, CONV)).rejects.toMatchObject({
            status: 403,
        });
    });

    it("sendText requires ACCEPTED conversation", async () => {
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            status: "PENDING",
            userLowId: A,
            userHighId: B,
            initiatedById: A,
        } as never);

        await expect(
            conversationService.sendText(A, CONV, { body: "hello" })
        ).rejects.toMatchObject({
            status: 403,
            message: "Conversation must be accepted before messaging",
        });
    });

    it("listInbox includes accepted and outgoing pending only", async () => {
        const now = new Date();
        vi.mocked(prisma.conversation.findMany).mockResolvedValue([
            {
                id: "accepted-1",
                status: "ACCEPTED",
                userLowId: A,
                userHighId: B,
                initiatedById: A,
                lastMessageAt: now,
                updatedAt: now,
                userLow: { id: A, username: "a", name: null, avatarPath: null },
                userHigh: {
                    id: B,
                    username: "b",
                    name: "Bob",
                    avatarPath: null,
                },
                messages: [
                    {
                        id: "m1",
                        type: "TEXT",
                        body: "hey",
                        senderId: A,
                        conversationId: "accepted-1",
                        audioPath: null,
                        durationMs: null,
                        createdAt: now,
                    },
                ],
            },
            {
                id: "pending-out",
                status: "PENDING",
                userLowId: A,
                userHighId: B,
                initiatedById: A,
                lastMessageAt: now,
                updatedAt: now,
                userLow: { id: A, username: "a", name: null, avatarPath: null },
                userHigh: {
                    id: B,
                    username: "b",
                    name: "Bob",
                    avatarPath: null,
                },
                messages: [
                    {
                        id: "m2",
                        type: "TEXT",
                        body: "request",
                        senderId: A,
                        conversationId: "pending-out",
                        audioPath: null,
                        durationMs: null,
                        createdAt: now,
                    },
                ],
            },
        ] as never);

        const rows = await conversationService.listInbox(A);
        expect(prisma.conversation.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.arrayContaining([
                        expect.objectContaining({
                            status: "ACCEPTED",
                        }),
                        expect.objectContaining({
                            status: "PENDING",
                            initiatedById: A,
                        }),
                    ]),
                }),
            })
        );
        expect(rows).toHaveLength(2);
        expect(rows.map((row) => row.status).sort()).toEqual([
            "ACCEPTED",
            "PENDING",
        ]);
    });
});

