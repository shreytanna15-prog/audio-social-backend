import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { clearAdminAccessCookie } from "@/server/modules/admin/admin-cookie";

export const POST = route()
    .use(withAdminAuth)
    .handle(async () => {
        const response = NextResponse.json({
            success: true,
            message: "Admin logged out successfully",
            data: null,
        });

        clearAdminAccessCookie(response);
        return response;
    });
