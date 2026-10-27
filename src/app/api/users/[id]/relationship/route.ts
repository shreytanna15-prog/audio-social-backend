import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { followService } from "@/server/modules/follow/follow.service";
import { userService } from "@/server/modules/user/user.service";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const targetUserId = parsePathUuid(
            req.nextUrl.pathname,
            "user ID",
            1
        );

        await userService.findById(targetUserId);

        const relationship =
            user.id === targetUserId
                ? {
                      isFollowing: false,
                      isFollowedBy: false,
                      isMutual: false,
                  }
                : await followService.getRelationship(user.id, targetUserId);

        return NextResponse.json({
            success: true,
            message: "Relationship fetched successfully",
            data: relationship,
        });
    });
