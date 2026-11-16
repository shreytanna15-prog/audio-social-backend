import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { homeService } from "@/server/modules/home/home.service";
import {
    homePlaylistsQuerySchema,
    type HomePlaylistsQuerySchema,
} from "@/server/modules/discover/discover.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(homePlaylistsQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as HomePlaylistsQuerySchema;
        const playlists = await homeService.listHomePlaylists(
            user.id,
            query.limit
        );

        return NextResponse.json({
            success: true,
            message: "Home playlists fetched successfully",
            data: playlists,
        });
    });
