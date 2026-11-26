import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { feedClipService } from "@/server/modules/feed/feed-clip.service";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const clipId = parsePathUuid(req.nextUrl.pathname, "clip ID", 1);
        const data = await feedClipService.likeClip(user.id, clipId);

        return NextResponse.json({
            success: true,
            message: "Feed clip liked successfully",
            data,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const clipId = parsePathUuid(req.nextUrl.pathname, "clip ID", 1);
        const data = await feedClipService.unlikeClip(user.id, clipId);

        return NextResponse.json({
            success: true,
            message: "Feed clip unliked successfully",
            data,
        });
    });
