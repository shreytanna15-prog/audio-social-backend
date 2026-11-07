import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { playlistService } from "@/server/modules/playlist/playlist.service";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const userId = parsePathUuid(req.nextUrl.pathname, "user ID", 1);
        const playlists = await playlistService.listPublicByUser(userId);

        return NextResponse.json({
            success: true,
            message: "Public playlists fetched successfully",
            data: playlists,
        });
    });
