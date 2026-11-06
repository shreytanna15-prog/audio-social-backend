import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { projectService } from "@/server/modules/project/project.service";
import type { User } from "@/generated/prisma/client";

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const projectId = parsePathUuid(
            req.nextUrl.pathname,
            "project ID",
            1
        );
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID");
        const result = await projectService.unlinkTrack(
            user.id,
            projectId,
            trackId
        );

        return NextResponse.json({
            success: true,
            message: "Track unlinked successfully",
            data: result,
        });
    });
