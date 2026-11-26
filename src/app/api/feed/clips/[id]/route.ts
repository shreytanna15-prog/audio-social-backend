import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { feedClipService } from "@/server/modules/feed/feed-clip.service";
import type { User } from "@/generated/prisma/client";

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const clipId = parsePathUuid(req.nextUrl.pathname, "clip ID");
        const data = await feedClipService.deleteClip(user.id, clipId);

        return NextResponse.json({
            success: true,
            message: "Feed clip deleted successfully",
            data,
        });
    });
