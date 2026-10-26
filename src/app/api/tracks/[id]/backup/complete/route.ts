import { NextResponse } from "next/server";
import { z } from "@/server/lib/zod";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { trackService } from "@/server/modules/track/track.service";
import { AppError } from "@/server/utils/global-error";
import type { User } from "@/generated/prisma/client";

function parseTrackId(pathname: string): string {
    // /api/tracks/{id}/backup/complete
    const parts = pathname.split("/").filter(Boolean);
    const tracksIndex = parts.indexOf("tracks");
    const trackId = tracksIndex >= 0 ? parts[tracksIndex + 1] : undefined;
    const parsedId = z.uuid("Invalid track ID").safeParse(trackId);

    if (!parsedId.success) {
        throw new AppError("Invalid track ID", 400, "BAD_REQUEST");
    }

    return parsedId.data;
}

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const result = await trackService.completeBackup(
            user.id,
            parseTrackId(req.nextUrl.pathname)
        );

        return NextResponse.json({
            success: true,
            message: "Track backup completed successfully",
            data: result,
        });
    });
