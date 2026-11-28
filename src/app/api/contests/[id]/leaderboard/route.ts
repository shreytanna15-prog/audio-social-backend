import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { contestService } from "@/server/modules/contest/contest.service";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const contestId = parsePathUuid(
            req.nextUrl.pathname,
            "contest ID",
            1
        );
        const data = await contestService.getLeaderboard(contestId);

        return NextResponse.json({
            success: true,
            message: "Leaderboard fetched successfully",
            data,
        });
    });
