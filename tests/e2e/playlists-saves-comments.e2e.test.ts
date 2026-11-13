/**
 * Live API e2e for playlists, albums, saves, likes list, comments.
 *
 * Requires:
 *   E2E_BASE_URL (default http://localhost:3015)
 *   E2E_ACCESS_TOKEN — owner JWT
 *   E2E_VIEWER_TOKEN — second user JWT (for save + comment as non-owner)
 *   E2E_PUBLISHED_TRACK_ID — optional; skips comment/like attach steps if missing
 */
import { describe, expect, it } from "vitest";

const BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3015").replace(
    /\/$/,
    ""
);
const OWNER_TOKEN = process.env.E2E_ACCESS_TOKEN;
const VIEWER_TOKEN = process.env.E2E_VIEWER_TOKEN;
const TRACK_ID = process.env.E2E_PUBLISHED_TRACK_ID;
const enabled = Boolean(OWNER_TOKEN && VIEWER_TOKEN);

async function api<T>(
    path: string,
    init: RequestInit = {},
    token = OWNER_TOKEN
): Promise<{
    status: number;
    body: { success: boolean; data?: T; message?: string };
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
    };
    return { status: response.status, body };
}

describe.skipIf(!enabled)("playlists + saves + comments e2e (live API)", () => {
    const slow = 45_000;

    it(
        "creates public playlist, viewer saves/unsaves, owner deletes",
        async () => {
            const title = `E2E Playlist ${Date.now()}`;
            const created = await api<{
                id: string;
                title: string;
                visibility: string;
                saveCount: number;
            }>("/api/playlists", {
                method: "POST",
                body: JSON.stringify({
                    title,
                    description: "e2e",
                    visibility: "PUBLIC",
                }),
            });
            expect(created.status).toBe(201);
            expect(created.body.data?.title).toBe(title);
            expect(created.body.data?.visibility).toBe("PUBLIC");
            const playlistId = created.body.data!.id;

            const list = await api<Array<{ id: string }>>("/api/playlists");
            expect(list.status).toBe(200);
            expect(list.body.data?.some((row) => row.id === playlistId)).toBe(
                true
            );

            const detail = await api<{ id: string; isSaved: boolean }>(
                `/api/playlists/${playlistId}`,
                {},
                VIEWER_TOKEN
            );
            expect(detail.status).toBe(200);
            expect(detail.body.data?.isSaved).toBe(false);

            const save = await api<{ isSaved: boolean; saveCount: number }>(
                `/api/playlists/${playlistId}/save`,
                { method: "POST" },
                VIEWER_TOKEN
            );
            expect(save.status).toBe(200);
            expect(save.body.data?.isSaved).toBe(true);
            expect(save.body.data?.saveCount).toBeGreaterThanOrEqual(1);

            const savedList = await api<
                Array<{ playlist: { id: string } }>
            >("/api/saves/playlists", {}, VIEWER_TOKEN);
            expect(savedList.status).toBe(200);
            expect(
                savedList.body.data?.some(
                    (row) => row.playlist.id === playlistId
                )
            ).toBe(true);

            const ownSave = await api(
                `/api/playlists/${playlistId}/save`,
                { method: "POST" },
                OWNER_TOKEN
            );
            expect(ownSave.status).toBe(400);

            const unsave = await api<{ isSaved: boolean }>(
                `/api/playlists/${playlistId}/save`,
                { method: "DELETE" },
                VIEWER_TOKEN
            );
            expect(unsave.status).toBe(200);
            expect(unsave.body.data?.isSaved).toBe(false);

            const deleted = await api(`/api/playlists/${playlistId}`, {
                method: "DELETE",
            });
            expect(deleted.status).toBe(200);
        },
        slow
    );

    it(
        "creates album, patches title, deletes",
        async () => {
            const title = `E2E Album ${Date.now()}`;
            const created = await api<{ id: string; title: string; status: string }>(
                "/api/albums",
                {
                    method: "POST",
                    body: JSON.stringify({ title, description: "e2e album" }),
                }
            );
            expect(created.status).toBe(201);
            expect(created.body.data?.title).toBe(title);
            const albumId = created.body.data!.id;

            const patched = await api<{ title: string }>(
                `/api/albums/${albumId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ title: `${title} edited` }),
                }
            );
            expect(patched.status).toBe(200);
            expect(patched.body.data?.title).toBe(`${title} edited`);

            const deleted = await api(`/api/albums/${albumId}`, {
                method: "DELETE",
            });
            expect(deleted.status).toBe(200);
        },
        slow
    );

    it.skipIf(!TRACK_ID)(
        "likes track, comments, lists comments, deletes own comment",
        async () => {
            const like = await api(`/api/tracks/${TRACK_ID}/like`, {
                method: "POST",
            });
            expect([200, 201]).toContain(like.status);

            const likes = await api<Array<{ track: { id: string } }>>(
                "/api/likes/tracks"
            );
            expect(likes.status).toBe(200);
            expect(
                likes.body.data?.some((row) => row.track.id === TRACK_ID)
            ).toBe(true);

            const body = `e2e comment ${Date.now()}`;
            const created = await api<{ id: string; body: string }>(
                `/api/tracks/${TRACK_ID}/comments`,
                {
                    method: "POST",
                    body: JSON.stringify({ body }),
                },
                VIEWER_TOKEN
            );
            expect(created.status).toBe(201);
            expect(created.body.data?.body).toBe(body);
            const commentId = created.body.data!.id;

            const listed = await api<Array<{ id: string }>>(
                `/api/tracks/${TRACK_ID}/comments?sort=newest`
            );
            expect(listed.status).toBe(200);
            expect(listed.body.data?.some((row) => row.id === commentId)).toBe(
                true
            );

            const deleted = await api(
                `/api/comments/${commentId}`,
                { method: "DELETE" },
                VIEWER_TOKEN
            );
            expect(deleted.status).toBe(200);

            const unlike = await api(`/api/tracks/${TRACK_ID}/like`, {
                method: "DELETE",
            });
            expect(unlike.status).toBe(200);
        },
        slow
    );
});
