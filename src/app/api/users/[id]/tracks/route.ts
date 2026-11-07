import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { trackService } from "@/server/modules/track/track.service";
import { prisma } from "@/server/config/prisma";
import { AppError } from "@/server/utils/global-error";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const userId = parsePathUuid(req.nextUrl.pathname, "user ID", 1);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        const tracks = await trackService.listPublishedByUser(userId);

        return NextResponse.json({
            success: true,
            message: "Published tracks fetched successfully",
            data: tracks,
        });
    });
