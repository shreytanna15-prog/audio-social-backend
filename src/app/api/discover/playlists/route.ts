import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateQuery } from "@/server/middlewares/validate";
import { discoverService } from "@/server/modules/discover/discover.service";
import {
    discoverPlaylistsQuerySchema,
    type DiscoverPlaylistsQuerySchema,
} from "@/server/modules/discover/discover.validator";

export const GET = route()
    .use(validateQuery(discoverPlaylistsQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as DiscoverPlaylistsQuerySchema;
        const playlists = await discoverService.listDiscoverPlaylists(
            query.limit
        );

        return NextResponse.json({
            success: true,
            message: "Discover playlists fetched successfully",
            data: playlists,
        });
    });
