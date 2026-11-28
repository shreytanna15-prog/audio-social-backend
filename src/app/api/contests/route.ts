import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { contestService } from "@/server/modules/contest/contest.service";
import {
    userListContestsQuerySchema,
    type UserListContestsQuerySchema,
} from "@/server/modules/contest/contest.validator";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(userListContestsQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as UserListContestsQuerySchema;
        const data = await contestService.listForUser(query);

        return NextResponse.json({
            success: true,
            message: "Contests fetched successfully",
            data,
        });
    });
