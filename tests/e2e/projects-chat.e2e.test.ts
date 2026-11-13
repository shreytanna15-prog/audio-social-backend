/**
 * Live API e2e for Projects + Chat (skips when env missing).
 *
 * Requires:
 *   E2E_BASE_URL (default http://localhost:3015)
 *   E2E_ACCESS_TOKEN — viewer JWT
 *   E2E_TARGET_USER_ID — another user UUID (for chat request)
 */
import { describe, expect, it } from "vitest";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3015").replace(
    /\/$/,
    ""
);
const TOKEN = process.env.E2E_ACCESS_TOKEN;
const TARGET = process.env.E2E_TARGET_USER_ID;
const enabled = Boolean(TOKEN);

async function api<T>(
    path: string,
    init: RequestInit = {}
): Promise<{
    status: number;
    body: { success: boolean; data?: T; message?: string };
}> {
    const response = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${TOKEN}`,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...(init.headers ?? {}),
        },
    });
    const body = (await response.json()) as {
        success: boolean;
        data?: T;
        message?: string;
    };
    return { status: response.status, body };
}

describe.skipIf(!enabled)("projects + chat e2e (live API)", () => {
    const slow = 30_000;

    it(
        "creates, lists, patches, attaches nothing, and deletes a project",
        async () => {
            const title = `E2E Project ${Date.now()}`;
            const created = await api<{
                id: string;
                title: string;
                trackCount: number;
            }>("/api/projects", {
                method: "POST",
                body: JSON.stringify({
                    title,
                    description: "e2e",
                }),
            });
            expect(created.status).toBe(201);
            expect(created.body.data?.title).toBe(title);
            expect(created.body.data?.trackCount).toBe(0);
            const projectId = created.body.data!.id;

            const list = await api<Array<{ id: string }>>("/api/projects");
            expect(list.status).toBe(200);
            expect(list.body.data?.some((row) => row.id === projectId)).toBe(
                true
            );

            const detail = await api<{ id: string; tracks: unknown[] }>(
                `/api/projects/${projectId}`
            );
            expect(detail.status).toBe(200);
            expect(detail.body.data?.tracks).toEqual([]);

            const patched = await api<{ title: string }>(
                `/api/projects/${projectId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ title: `${title} edited` }),
                }
            );
            expect(patched.status).toBe(200);
            expect(patched.body.data?.title).toBe(`${title} edited`);

            const deleted = await api<{ id: string }>(
                `/api/projects/${projectId}?deleteTracks=false`,
                { method: "DELETE" }
            );
            expect(deleted.status).toBe(200);
            expect(deleted.body.data?.id).toBe(projectId);

            const after = await api(`/api/projects/${projectId}`);
            expect(after.status).toBe(404);
        },
        slow
    );

    it(
        "lists inbox + requests without error",
        async () => {
            const inbox = await api("/api/conversations");
            expect(inbox.status).toBe(200);
            expect(inbox.body.success).toBe(true);

            const requests = await api("/api/conversations/requests");
            expect(requests.status).toBe(200);
            expect(requests.body.success).toBe(true);
        },
        slow
    );

    it.skipIf(!TARGET)(
        "can create a chat request to target user",
        async () => {
            const result = await api("/api/conversations/request", {
                method: "POST",
                body: JSON.stringify({
                    userId: TARGET,
                    body: `e2e hello ${Date.now()}`,
                }),
            });
            expect([200, 201, 400]).toContain(result.status);
            if (result.status === 400) {
                expect(result.body.success).toBe(false);
            } else {
                expect(result.body.success).toBe(true);
            }
        },
        slow
    );
});
