import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { playlistService } from "@/server/modules/playlist/playlist.service";
import {
    updatePlaylistSchema,
    type UpdatePlaylistSchema,
} from "@/server/modules/playlist/playlist.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(req.nextUrl.pathname, "playlist ID");
        const playlist = await playlistService.getPlaylist(user.id, playlistId);

        return NextResponse.json({
            success: true,
            message: "Playlist fetched successfully",
            data: playlist,
        });
    });

export const PATCH = route()
    .use(withAuth)
    .use(validateBody(updatePlaylistSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(req.nextUrl.pathname, "playlist ID");
        const payload = req.body as UpdatePlaylistSchema;
        const playlist = await playlistService.updatePlaylist(
            user.id,
            playlistId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Playlist updated successfully",
            data: playlist,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(req.nextUrl.pathname, "playlist ID");
        const result = await playlistService.deletePlaylist(
            user.id,
            playlistId
        );

        return NextResponse.json({
            success: true,
            message: "Playlist deleted successfully",
            data: result,
        });
    });
