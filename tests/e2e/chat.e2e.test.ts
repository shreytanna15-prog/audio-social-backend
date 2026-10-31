/**
 * Live chat API e2e against a running backend.
 * Requires:
 *   E2E_BASE_URL (default http://localhost:3015)
 *   E2E_ACCESS_TOKEN — viewer JWT
 *   E2E_TARGET_USER_ID — another user's UUID
 *   E2E_TARGET_ACCESS_TOKEN — target JWT (for accept + reply)
 *
 * Skips automatically when env is missing.
 */
import { describe, expect, it } from "vitest";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3015").replace(
    /\/$/,
    ""
);
const TOKEN = process.env.E2E_ACCESS_TOKEN;
const TARGET = process.env.E2E_TARGET_USER_ID;
const TARGET_TOKEN = process.env.E2E_TARGET_ACCESS_TOKEN;
const enabled = Boolean(TOKEN && TARGET && TARGET_TOKEN);

async function api<T>(
    path: string,
    init: RequestInit = {},
    token = TOKEN
): Promise<{
    status: number;
    body: { success: boolean; data?: T; message?: string; code?: string };
}> {
    const response = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(init.headers ?? {}),
        },
    });
    const body = (await response.json()) as {
        success: boolean;
        data?: T;
        message?: string;
        code?: string;
    };
    return { status: response.status, body };
}

describe.skipIf(!enabled)("chat e2e (live API)", () => {
    const slow = 45_000;

    it(
        "creates request, lists requests, accepts, sends text, lists history",
        async () => {
            const request = await api<{
                conversation: { id: string; status: string };
                message: { id: string; body: string | null };
            }>("/api/conversations/request", {
                method: "POST",
                body: JSON.stringify({
                    userId: TARGET,
                    body: "E2E chat request hello",
                }),
            });
            expect(request.status).toBe(201);
            expect(request.body.success).toBe(true);
            expect(request.body.data?.conversation.status).toBe("PENDING");
            const conversationId = request.body.data!.conversation.id;

            const incoming = await api<
                Array<{ id: string; message: string }>
            >("/api/conversations/requests", {}, TARGET_TOKEN);
            expect(incoming.status).toBe(200);
            expect(
                incoming.body.data?.some((item) => item.id === conversationId)
            ).toBe(true);

            const accept = await api<{ id: string; status: string }>(
                `/api/conversations/${conversationId}/accept`,
                { method: "POST" },
                TARGET_TOKEN
            );
            expect(accept.status).toBe(200);
            expect(accept.body.data?.status).toBe("ACCEPTED");

            const inbox = await api<Array<{ id: string }>>(
                "/api/conversations"
            );
            expect(inbox.status).toBe(200);
            expect(
                inbox.body.data?.some((item) => item.id === conversationId)
            ).toBe(true);

            const sent = await api<{
                id: string;
                type: string;
                body: string | null;
            }>(`/api/conversations/${conversationId}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    type: "TEXT",
                    body: "E2E follow-up message",
                }),
            });
            expect(sent.status).toBe(201);
            expect(sent.body.data?.type).toBe("TEXT");
            expect(sent.body.data?.body).toBe("E2E follow-up message");

            const history = await api<{
                messages: Array<{ id: string; body: string | null }>;
                nextCursor: string | null;
            }>(`/api/conversations/${conversationId}/messages`);
            expect(history.status).toBe(200);
            expect(
                history.body.data?.messages.some(
                    (m) => m.body === "E2E follow-up message"
                )
            ).toBe(true);

            const token = await api<{
                token: string;
                expiresIn: number;
                wsUrl: string | null;
            }>(`/api/conversations/${conversationId}/realtime-token`, {
                method: "POST",
            });
            expect(token.status).toBe(200);
            expect(token.body.data?.token).toBeTruthy();
            expect(token.body.data?.expiresIn).toBeGreaterThan(0);
        },
        slow
    );

    it("rejects messaging yourself", async () => {
        const me = await api<{ id: string }>("/api/user");
        expect(me.status).toBe(200);
        const selfId = me.body.data!.id;

        const result = await api("/api/conversations/request", {
            method: "POST",
            body: JSON.stringify({
                userId: selfId,
                body: "should fail",
            }),
        });
        expect(result.status).toBe(400);
        expect(result.body.success).toBe(false);
    });
});
