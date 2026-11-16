import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { playService } from "@/server/modules/play/play.service";
import {
    recentlyPlayedQuerySchema,
    type RecentlyPlayedQuerySchema,
} from "@/server/modules/play/play.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(recentlyPlayedQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as RecentlyPlayedQuerySchema;
        const tracks = await playService.listRecentlyPlayed(
            user.id,
            query.limit
        );

        return NextResponse.json({
            success: true,
            message: "Recently played fetched successfully",
            data: tracks,
        });
    });
