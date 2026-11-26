import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { trackService } from "@/server/modules/track/track.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 1);
        const data = await trackService.getPublishedPublicDetail(
            trackId,
            user.id
        );

        return NextResponse.json({
            success: true,
            message: "Public track fetched successfully",
            data,
        });
    });
