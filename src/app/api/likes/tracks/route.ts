import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { likeService } from "@/server/modules/save/like.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const data = await likeService.listLikedTracks(user.id);

        return NextResponse.json({
            success: true,
            message: "Liked tracks fetched successfully",
            data,
        });
    });
