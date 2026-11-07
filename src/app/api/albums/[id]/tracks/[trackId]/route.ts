import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { albumService } from "@/server/modules/album/album.service";
import type { User } from "@/generated/prisma/client";

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(
            req.nextUrl.pathname,
            "album ID",
            2
        );
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID");
        const result = await albumService.unlinkTrack(
            user.id,
            albumId,
            trackId
        );

        return NextResponse.json({
            success: true,
            message: "Track unlinked successfully",
            data: result,
        });
    });
