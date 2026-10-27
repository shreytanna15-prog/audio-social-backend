/**
 * Live API e2e against a running backend.
 * Requires:
 *   E2E_BASE_URL (default http://localhost:3015)
 *   E2E_ACCESS_TOKEN  — viewer JWT
 *   E2E_TARGET_USER_ID — another user's UUID
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
const enabled = Boolean(TOKEN && TARGET);

async function api<T>(
    path: string,
    init: RequestInit = {}
): Promise<{ status: number; body: { success: boolean; data?: T; message?: string } }> {
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

describe.skipIf(!enabled)("follow + search e2e (live API)", () => {
    // Next.js compiles routes on first hit in dev — allow cold starts.
    const slow = 30_000;

    it("searches artists", async () => {
        const { status, body } = await api<
            Array<{ id: string; username: string }>
        >("/api/users/search?q=a&limit=5");
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it(
        "loads public profile, follows, unfollows, and records recent",
        async () => {
            const profile = await api<{
                id: string;
                isFollowing: boolean;
                followerCount: number;
            }>(`/api/users/${TARGET}`);
            expect(profile.status).toBe(200);
            expect(profile.body.data?.id).toBe(TARGET);

            const follow = await api(`/api/users/${TARGET}/follow`, {
                method: "POST",
            });
            expect(follow.status).toBe(200);
            expect(follow.body.data).toMatchObject({
                id: TARGET,
                isFollowing: true,
            });

            const recent = await api("/api/search/recent", {
                method: "POST",
                body: JSON.stringify({
                    kind: "ARTIST",
                    targetUserId: TARGET,
                    query: "e2e",
                }),
            });
            expect(recent.status).toBe(200);
            expect(
                (
                    recent.body.data as Array<{ targetUser: { id: string } }>
                ).some((row) => row.targetUser.id === TARGET)
            ).toBe(true);

            const unfollow = await api(`/api/users/${TARGET}/follow`, {
                method: "DELETE",
            });
            expect(unfollow.status).toBe(200);
            expect(unfollow.body.data).toMatchObject({ isFollowing: false });

            const clear = await api("/api/search/recent", {
                method: "DELETE",
            });
            expect(clear.status).toBe(200);
        },
        slow
    );

    it("rejects follow self with 400 when target is viewer", async () => {
        const me = await api<{ id: string }>("/api/user");
        expect(me.status).toBe(200);
        const selfId = me.body.data?.id;
        expect(selfId).toBeTruthy();

        const { status, body } = await api(`/api/users/${selfId}/follow`, {
            method: "POST",
        });
        expect(status).toBe(400);
        expect(body.success).toBe(false);
    });
});
