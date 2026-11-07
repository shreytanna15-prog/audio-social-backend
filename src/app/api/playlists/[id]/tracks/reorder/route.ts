import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { playlistService } from "@/server/modules/playlist/playlist.service";
import {
    reorderPlaylistTracksSchema,
    type ReorderPlaylistTracksSchema,
} from "@/server/modules/playlist/playlist.validator";
import type { User } from "@/generated/prisma/client";

export const PUT = route()
    .use(withAuth)
    .use(validateBody(reorderPlaylistTracksSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(
            req.nextUrl.pathname,
            "playlist ID",
            2
        );
        const payload = req.body as ReorderPlaylistTracksSchema;
        const result = await playlistService.reorderTracks(
            user.id,
            playlistId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Tracks reordered successfully",
            data: result,
        });
    });
