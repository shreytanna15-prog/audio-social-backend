import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { contestService } from "@/server/modules/contest/contest.service";
import {
    contestEntriesQuerySchema,
    submitContestEntrySchema,
    type ContestEntriesQuerySchema,
    type SubmitContestEntrySchema,
} from "@/server/modules/contest/contest.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(contestEntriesQuerySchema))
    .handle(async (req) => {
        const contestId = parsePathUuid(
            req.nextUrl.pathname,
            "contest ID",
            1
        );
        const query = req.localsQuery as ContestEntriesQuerySchema;
        const data = await contestService.listEntries(contestId, query);

        return NextResponse.json({
            success: true,
            message: "Contest entries fetched successfully",
            data,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(submitContestEntrySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const contestId = parsePathUuid(
            req.nextUrl.pathname,
            "contest ID",
            1
        );
        const body = req.body as SubmitContestEntrySchema;
        const data = await contestService.submitEntry(
            contestId,
            user.id,
            body
        );

        return NextResponse.json(
            {
                success: true,
                message: "Entry submitted successfully",
                data,
            },
            { status: 201 }
        );
    });
