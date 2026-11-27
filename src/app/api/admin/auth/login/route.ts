import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateBody } from "@/server/middlewares/validate";
import { adminAuthService } from "@/server/modules/admin/admin-auth.service";
import { setAdminAccessCookie } from "@/server/modules/admin/admin-cookie";
import {
    adminLoginSchema,
    type AdminLoginSchema,
} from "@/server/modules/admin/admin-auth.validator";

export const POST = route()
    .use(validateBody(adminLoginSchema))
    .handle(async (req) => {
        const payload = req.body as AdminLoginSchema;
        const result = await adminAuthService.login(payload);

        const response = NextResponse.json({
            success: true,
            message: "Admin authenticated successfully",
            data: result,
        });

        setAdminAccessCookie(response, result.accessToken);
        return response;
    });
