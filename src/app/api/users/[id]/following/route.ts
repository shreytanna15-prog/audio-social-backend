import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { followService } from "@/server/modules/follow/follow.service";
import {
    followListQuerySchema,
    type FollowListQuerySchema,
} from "@/server/modules/follow/follow.validator";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(followListQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const targetUserId = parsePathUuid(
            req.nextUrl.pathname,
            "user ID",
            1
        );
        const query = req.localsQuery as FollowListQuerySchema;
        const page = await followService.listFollowing(
            user.id,
            targetUserId,
            query
        );

        return NextResponse.json({
            success: true,
            message: "Following fetched successfully",
            data: page,
        });
    });
