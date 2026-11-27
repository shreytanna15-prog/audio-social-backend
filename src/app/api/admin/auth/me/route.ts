import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { adminAuthService } from "@/server/modules/admin/admin-auth.service";
import type { AdminAuthContext } from "@/server/types/request";

export const GET = route()
    .use(withAdminAuth)
    .handle(async (req) => {
        const admin = req.admin as AdminAuthContext;
        const profile = await adminAuthService.getProfile(admin.id);

        return NextResponse.json({
            success: true,
            message: "Admin profile fetched successfully",
            data: profile,
        });
    });
