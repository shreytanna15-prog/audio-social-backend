import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { contestService } from "@/server/modules/contest/contest.service";
import {
    patchContestSchema,
    type PatchContestSchema,
} from "@/server/modules/contest/contest.validator";

export const GET = route()
    .use(withAdminAuth)
    .handle(async (req) => {
        const contestId = parsePathUuid(req.nextUrl.pathname, "contest ID");
        const data = await contestService.getAdminDetail(contestId);

        return NextResponse.json({
            success: true,
            message: "Contest fetched successfully",
            data,
        });
    });

export const PATCH = route()
    .use(withAdminAuth)
    .use(validateBody(patchContestSchema))
    .handle(async (req) => {
        const contestId = parsePathUuid(req.nextUrl.pathname, "contest ID");
        const body = req.body as PatchContestSchema;
        const data = await contestService.patchContest(contestId, body);

        return NextResponse.json({
            success: true,
            message: "Contest updated successfully",
            data,
        });
    });
