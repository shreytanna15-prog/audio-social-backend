import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";

import { authService } from "@/server/modules/auth/auth.service";
import { AUTH_CONFIG } from "@/server/constants/auth.config";
import { AppError } from "@/server/utils/global-error";

export const POST = route()
    .handle(async (req) => {
        const refreshToken = req.headers.get(AUTH_CONFIG.headers.refreshToken);

        if (!refreshToken) {
            throw new AppError("Refresh token is required", 401, "UNAUTHORIZED");
        }

        const result = await authService.refresh(refreshToken);

        return NextResponse.json({
            success: true,
            message: "Token refreshed successfully",
            data: result,
        });
    });
