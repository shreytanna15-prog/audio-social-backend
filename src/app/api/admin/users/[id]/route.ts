import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { adminUsersService } from "@/server/modules/admin/admin-users.service";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";

export const GET = route()
    .use(withAdminAuth)
    .handle(async (req) => {
        const userId = parsePathUuid(req.nextUrl.pathname, "user ID");
        const data = await adminUsersService.getUser(userId);

        return NextResponse.json({
            success: true,
            message: "User fetched successfully",
            data,
        });
    });
