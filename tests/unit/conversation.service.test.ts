import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import { AppError } from "@/server/utils/global-error";

const VIEWER = "11111111-1111-7111-8111-111111111111";
const TARGET = "22222222-2222-7222-8222-222222222222";
const CONV = "33333333-3333-7333-8333-333333333333";

describe("conversationService (unit)", () => {
    beforeEach(() => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: TARGET,
        } as never);
    });

    it("rejects messaging yourself", async () => {
        await expect(
            conversationService.createRequest(VIEWER, {
                userId: VIEWER,
                body: "hi",
            })
        ).rejects.toMatchObject({
            status: 400,
            code: "BAD_REQUEST",
        } satisfies Partial<AppError>);
    });

    it("404 when target missing", async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        await expect(
            conversationService.createRequest(VIEWER, {
                userId: TARGET,
                body: "hi",
            })
        ).rejects.toMatchObject({
            status: 404,
            code: "RESOURCE_NOT_FOUND",
        });
    });

    it("rejects accept when viewer is initiator", async () => {
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            userLowId: VIEWER < TARGET ? VIEWER : TARGET,
            userHighId: VIEWER < TARGET ? TARGET : VIEWER,
            status: "PENDING",
            initiatedById: VIEWER,
        } as never);

        await expect(
            conversationService.accept(VIEWER, CONV)
        ).rejects.toMatchObject({
            status: 403,
            code: "FORBIDDEN",
        });
    });

    it("rejects text send when not accepted", async () => {
        vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
            id: CONV,
            userLowId: VIEWER < TARGET ? VIEWER : TARGET,
            userHighId: VIEWER < TARGET ? TARGET : VIEWER,
            status: "PENDING",
            initiatedById: VIEWER,
        } as never);

        await expect(
            conversationService.sendText(VIEWER, CONV, {
                type: "TEXT",
                body: "hello",
            })
        ).rejects.toMatchObject({
            status: 403,
            code: "FORBIDDEN",
        });
    });
});
