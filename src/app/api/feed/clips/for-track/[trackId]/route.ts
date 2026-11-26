import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { feedClipService } from "@/server/modules/feed/feed-clip.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID");
        const data = await feedClipService.getOwnedClipForTrack(
            user.id,
            trackId
        );

        return NextResponse.json({
            success: true,
            message: data
                ? "Feed clip fetched successfully"
                : "No feed clip for track",
            data,
        });
    });
