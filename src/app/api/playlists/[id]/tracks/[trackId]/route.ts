import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { playlistService } from "@/server/modules/playlist/playlist.service";
import type { User } from "@/generated/prisma/client";

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(
            req.nextUrl.pathname,
            "playlist ID",
            2
        );
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID");
        const result = await playlistService.unlinkTrack(
            user.id,
            playlistId,
            trackId
        );

        return NextResponse.json({
            success: true,
            message: "Track unlinked successfully",
            data: result,
        });
    });
