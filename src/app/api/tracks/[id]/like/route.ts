import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { likeService } from "@/server/modules/save/like.service";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 1);
        const data = await likeService.likeTrack(user.id, trackId);

        return NextResponse.json({
            success: true,
            message: "Track liked successfully",
            data,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 1);
        const data = await likeService.unlikeTrack(user.id, trackId);

        return NextResponse.json({
            success: true,
            message: "Track unliked successfully",
            data,
        });
    });
