import { NextResponse } from "next/server";
import { z } from "@/server/lib/zod";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { trackService } from "@/server/modules/track/track.service";
import { AppError } from "@/server/utils/global-error";
import type { User } from "@/generated/prisma/client";

function parseTrackId(pathname: string): string {
    const trackId = pathname.split("/").at(-1);
    const parsedId = z.uuid("Invalid track ID").safeParse(trackId);

    if (!parsedId.success) {
        throw new AppError("Invalid track ID", 400, "BAD_REQUEST");
    }

    return parsedId.data;
}

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const track = await trackService.getTrackById(
            user.id,
            parseTrackId(req.nextUrl.pathname)
        );

        return NextResponse.json({
            success: true,
            message: "Track fetched successfully",
            data: track,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const result = await trackService.deleteTrack(
            user.id,
            parseTrackId(req.nextUrl.pathname)
        );

        return NextResponse.json({
            success: true,
            message: "Track deleted successfully",
            data: result,
        });
    });
