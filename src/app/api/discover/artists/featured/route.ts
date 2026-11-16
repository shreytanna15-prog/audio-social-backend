import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateQuery } from "@/server/middlewares/validate";
import { discoverService } from "@/server/modules/discover/discover.service";
import {
    featuredArtistsQuerySchema,
    type FeaturedArtistsQuerySchema,
} from "@/server/modules/discover/discover.validator";

export const GET = route()
    .use(validateQuery(featuredArtistsQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as FeaturedArtistsQuerySchema;
        const artists = await discoverService.listFeaturedArtists(query.limit);

        return NextResponse.json({
            success: true,
            message: "Featured artists fetched successfully",
            data: artists,
        });
    });
