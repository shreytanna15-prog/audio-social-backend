import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { followService } from "@/server/modules/follow/follow.service";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const targetUserId = parsePathUuid(
            req.nextUrl.pathname,
            "user ID",
            1
        );
        const result = await followService.follow(user.id, targetUserId);

        return NextResponse.json({
            success: true,
            message: "Followed successfully",
            data: result,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const targetUserId = parsePathUuid(
            req.nextUrl.pathname,
            "user ID",
            1
        );
        const result = await followService.unfollow(user.id, targetUserId);

        return NextResponse.json({
            success: true,
            message: "Unfollowed successfully",
            data: result,
        });
    });
