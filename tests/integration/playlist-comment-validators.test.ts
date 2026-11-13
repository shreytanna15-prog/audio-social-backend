import { describe, expect, it } from "vitest";
import {
    attachPlaylistTracksSchema,
    createPlaylistSchema,
    updatePlaylistSchema,
} from "@/server/modules/playlist/playlist.validator";
import {
    createAlbumSchema,
    updateAlbumSchema,
} from "@/server/modules/album/album.validator";
import {
    createCommentSchema,
    listCommentsQuerySchema,
} from "@/server/modules/comment/comment.validator";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";

const TRACK = "0198e2c0-5c8a-7b3e-9f1d-2a4b6c8d0e1f";

describe("playlist / album / comment validators (integration)", () => {
    it("createPlaylistSchema trims title and defaults visibility", () => {
        expect(
            createPlaylistSchema.parse({
                title: "  Chill  ",
                description: "  vibes ",
            })
        ).toEqual({
            title: "Chill",
            description: "vibes",
            visibility: "PRIVATE",
        });
    });

    it("createPlaylistSchema rejects empty title", () => {
        expect(() => createPlaylistSchema.parse({ title: "   " })).toThrow();
    });

    it("updatePlaylistSchema requires at least one field", () => {
        expect(() => updatePlaylistSchema.parse({})).toThrow();
        expect(
            updatePlaylistSchema.parse({ visibility: "PUBLIC" })
        ).toEqual({ visibility: "PUBLIC" });
    });

    it("attachPlaylistTracksSchema enforces uuid list bounds", () => {
        expect(
            attachPlaylistTracksSchema.parse({ trackIds: [TRACK] })
        ).toEqual({ trackIds: [TRACK] });
        expect(() =>
            attachPlaylistTracksSchema.parse({ trackIds: [] })
        ).toThrow();
        expect(() =>
            attachPlaylistTracksSchema.parse({ trackIds: ["not-uuid"] })
        ).toThrow();
    });

    it("createAlbumSchema clears empty description", () => {
        expect(
            createAlbumSchema.parse({ title: "LP", description: "" })
        ).toEqual({ title: "LP", description: null });
    });

    it("updateAlbumSchema requires a field", () => {
        expect(() => updateAlbumSchema.parse({})).toThrow();
    });

    it("createCommentSchema trims and caps body", () => {
        expect(
            createCommentSchema.parse({ body: "  nice  ", parentId: null })
        ).toEqual({ body: "nice", parentId: null });
        expect(() => createCommentSchema.parse({ body: "" })).toThrow();
        expect(() =>
            createCommentSchema.parse({ body: "x".repeat(301) })
        ).toThrow();
    });

    it("listCommentsQuerySchema defaults sort to newest", () => {
        expect(listCommentsQuerySchema.parse({})).toEqual({ sort: "newest" });
        expect(listCommentsQuerySchema.parse({ sort: "top" })).toEqual({
            sort: "top",
        });
        expect(() =>
            listCommentsQuerySchema.parse({ sort: "hot" })
        ).toThrow();
    });

    it("parsePathUuid reads playlist save route id", () => {
        const id = parsePathUuid(
            `/api/playlists/${TRACK}/save`,
            "playlist ID",
            1
        );
        expect(id).toBe(TRACK);
    });
});
