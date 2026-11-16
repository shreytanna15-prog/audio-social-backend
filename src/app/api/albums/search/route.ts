import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { catalogSearchService } from "@/server/modules/search/catalog-search.service";
import {
    catalogSearchQuerySchema,
    type CatalogSearchQuerySchema,
} from "@/server/modules/search/catalog-search.validator";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(catalogSearchQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as CatalogSearchQuerySchema;
        const results = await catalogSearchService.searchAlbums(query);

        return NextResponse.json({
            success: true,
            message: "Albums fetched successfully",
            data: results,
        });
    });
