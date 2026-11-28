import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { contestService } from "@/server/modules/contest/contest.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const contestId = parsePathUuid(
            req.nextUrl.pathname,
            "contest ID",
            1
        );
        const data = await contestService.listEligibleTracks(
            contestId,
            user.id
        );

        return NextResponse.json({
            success: true,
            message: "Eligible tracks fetched successfully",
            data,
        });
    });
