import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { contestService } from "@/server/modules/contest/contest.service";

export const POST = route()
    .use(withAdminAuth)
    .handle(async (req) => {
        const contestId = parsePathUuid(
            req.nextUrl.pathname,
            "contest ID",
            1
        );
        const data = await contestService.confirmWinners(contestId);

        return NextResponse.json({
            success: true,
            message: "Winners confirmed successfully",
            data,
        });
    });
