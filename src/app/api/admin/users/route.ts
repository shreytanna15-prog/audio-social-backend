import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { adminUsersService } from "@/server/modules/admin/admin-users.service";
import {
    adminUsersListQuerySchema,
    type AdminUsersListQuery,
} from "@/server/modules/admin/admin-users.validator";

export const GET = route()
    .use(withAdminAuth)
    .use(validateQuery(adminUsersListQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as AdminUsersListQuery;
        const data = await adminUsersService.listUsers(query);

        return NextResponse.json({
            success: true,
            message: "Users fetched successfully",
            data,
        });
    });
