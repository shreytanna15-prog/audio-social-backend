import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { adminUsersService } from "@/server/modules/admin/admin-users.service";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import {
    adminUserNestedListQuerySchema,
    type AdminUserNestedListQuery,
} from "@/server/modules/admin/admin-users.validator";

export const GET = route()
    .use(withAdminAuth)
    .use(validateQuery(adminUserNestedListQuerySchema))
    .handle(async (req) => {
        const userId = parsePathUuid(req.nextUrl.pathname, "user ID", 1);
        const query = req.localsQuery as AdminUserNestedListQuery;
        const data = await adminUsersService.listPlaylists(userId, query);

        return NextResponse.json({
            success: true,
            message: "User playlists fetched successfully",
            data,
        });
    });
