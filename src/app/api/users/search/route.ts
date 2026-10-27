import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { userService } from "@/server/modules/user/user.service";
import {
    searchUsersQuerySchema,
    type SearchUsersQuerySchema,
} from "@/server/modules/user/user.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(searchUsersQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as SearchUsersQuerySchema;
        const results = await userService.searchUsers(user.id, query);

        return NextResponse.json({
            success: true,
            message: "Users fetched successfully",
            data: results,
        });
    });
