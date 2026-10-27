import { describe, expect, it } from "vitest";
import { searchUsersQuerySchema } from "@/server/modules/user/user.validator";
import { recordSearchRecentSchema } from "@/server/modules/search/search-recent.validator";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";

describe("validators + path parsing (integration)", () => {
    it("searchUsersQuerySchema coerces limit and defaults", () => {
        expect(searchUsersQuerySchema.parse({ q: "  alice  " })).toEqual({
            q: "alice",
            limit: 20,
        });
        expect(
            searchUsersQuerySchema.parse({ q: "bob", limit: "5" })
        ).toEqual({
            q: "bob",
            limit: 5,
        });
    });

    it("searchUsersQuerySchema rejects empty q and oversized limit", () => {
        expect(() => searchUsersQuerySchema.parse({ q: "   " })).toThrow();
        expect(() =>
            searchUsersQuerySchema.parse({ q: "a", limit: "99" })
        ).toThrow();
    });

    it("recordSearchRecentSchema accepts ARTIST and media kinds", () => {
        const artist = recordSearchRecentSchema.parse({
            kind: "ARTIST",
            targetUserId: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
            query: " aura ",
        });
        expect(artist.query).toBe("aura");

        const song = recordSearchRecentSchema.parse({
            kind: "SONG",
            targetId: "track_123",
            title: "Midnight Groove",
            subtitle: "Mira Shah",
        });
        expect(song.kind).toBe("SONG");
        if (song.kind === "SONG") {
            expect(song.title).toBe("Midnight Groove");
        }

        expect(() =>
            recordSearchRecentSchema.parse({
                kind: "SONG",
                targetUserId: "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f",
            })
        ).toThrow();
    });

    it("parsePathUuid reads nested follow route id", () => {
        const id = parsePathUuid(
            "/api/users/0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f/follow",
            "user ID",
            1
        );
        expect(id).toBe("0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f");
    });

    it("parsePathUuid rejects invalid uuid", () => {
        expect(() =>
            parsePathUuid("/api/users/not-a-uuid", "user ID")
        ).toThrowError(/Invalid user ID/);
    });
});
