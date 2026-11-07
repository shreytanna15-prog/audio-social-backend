import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { playlistService } from "@/server/modules/playlist/playlist.service";
import {
    createPlaylistSchema,
    type CreatePlaylistSchema,
} from "@/server/modules/playlist/playlist.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const playlists = await playlistService.listPlaylists(user.id);

        return NextResponse.json({
            success: true,
            message: "Playlists fetched successfully",
            data: playlists,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(createPlaylistSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreatePlaylistSchema;
        const playlist = await playlistService.createPlaylist(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Playlist created successfully",
                data: playlist,
            },
            { status: 201 }
        );
    });
