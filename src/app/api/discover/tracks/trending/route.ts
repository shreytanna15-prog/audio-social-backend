import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateQuery } from "@/server/middlewares/validate";
import { discoverService } from "@/server/modules/discover/discover.service";
import {
    trendingTracksQuerySchema,
    type TrendingTracksQuerySchema,
} from "@/server/modules/discover/discover.validator";

export const GET = route()
    .use(validateQuery(trendingTracksQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as TrendingTracksQuerySchema;
        const tracks = await discoverService.listTrendingTracks(query.limit);

        return NextResponse.json({
            success: true,
            message: "Trending tracks fetched successfully",
            data: tracks,
        });
    });
