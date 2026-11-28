import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { contestService } from "@/server/modules/contest/contest.service";
import {
    castContestVoteSchema,
    type CastContestVoteSchema,
} from "@/server/modules/contest/contest.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(castContestVoteSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const contestId = parsePathUuid(
            req.nextUrl.pathname,
            "contest ID",
            1
        );
        const body = req.body as CastContestVoteSchema;
        const data = await contestService.castVote(contestId, user.id, body);

        return NextResponse.json(
            {
                success: true,
                message: "Vote cast successfully",
                data,
            },
            { status: 201 }
        );
    });
