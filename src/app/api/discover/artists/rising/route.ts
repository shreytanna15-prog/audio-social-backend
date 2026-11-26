import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateQuery } from "@/server/middlewares/validate";
import { discoverService } from "@/server/modules/discover/discover.service";
import {
    risingArtistsQuerySchema,
    type RisingArtistsQuerySchema,
} from "@/server/modules/discover/discover.validator";

export const GET = route()
    .use(validateQuery(risingArtistsQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as RisingArtistsQuerySchema;
        const artists = await discoverService.listRisingArtists(query.limit);

        return NextResponse.json({
            success: true,
            message: "Rising artists fetched successfully",
            data: artists,
        });
    });
