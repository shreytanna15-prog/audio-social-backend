import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { adminMetricsService } from "@/server/modules/admin/admin-metrics.service";
import {
    adminGrowthQuerySchema,
    type AdminGrowthQuery,
} from "@/server/modules/admin/admin-metrics.validator";

export const GET = route()
    .use(withAdminAuth)
    .use(validateQuery(adminGrowthQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as AdminGrowthQuery;
        const data = await adminMetricsService.getGrowth(query);

        return NextResponse.json({
            success: true,
            message: "Growth metrics fetched successfully",
            data,
        });
    });
