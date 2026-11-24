import { NextResponse } from "next/server";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { musicSearchService } from "@/server/modules/search/music-search.service";
import {
    musicSearchQuerySchema,
    type MusicSearchQuerySchema,
} from "@/server/modules/search/music-search.validator";
import { route } from "@/server/utils/route";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(musicSearchQuerySchema))
    .handle(async (req) => {
        const results = await musicSearchService.search(
            req.localsQuery as MusicSearchQuerySchema
        );
        return NextResponse.json({
            success: true,
            message: "Music search results fetched successfully",
            data: results,
        });
    });
