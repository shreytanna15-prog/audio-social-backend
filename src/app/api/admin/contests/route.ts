import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { contestService } from "@/server/modules/contest/contest.service";
import {
    adminListContestsQuerySchema,
    createContestSchema,
    type AdminListContestsQuerySchema,
    type CreateContestSchema,
} from "@/server/modules/contest/contest.validator";

export const GET = route()
    .use(withAdminAuth)
    .use(validateQuery(adminListContestsQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as AdminListContestsQuerySchema;
        const data = await contestService.listAdmin(query);

        return NextResponse.json({
            success: true,
            message: "Contests fetched successfully",
            data,
        });
    });

export const POST = route()
    .use(withAdminAuth)
    .use(validateBody(createContestSchema))
    .handle(async (req) => {
        const body = req.body as CreateContestSchema;
        const data = await contestService.createContest(body);

        return NextResponse.json(
            {
                success: true,
                message: "Contest created successfully",
                data,
            },
            { status: 201 }
        );
    });
