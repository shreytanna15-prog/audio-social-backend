import { env } from "@/server/config/env";
import { verifyJwtToken } from "@/server/lib/jwt";
import { userService } from "@/server/modules/user/user.service";

import type { ApiMiddleware } from "@/server/types/request";
import { AUTH_CONFIG } from "@/server/constants/auth.config";
import { AppError } from "@/server/utils/global-error";

export const withAuth: ApiMiddleware = async (req, _res, next) => {
    const authHeader = req.headers.get(AUTH_CONFIG.headers.accessToken);
    const accessToken = authHeader?.split(" ")[1];

    if (!accessToken) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const decoded = verifyJwtToken(accessToken, env.JWT_ACCESS_SECRET);

    if (!decoded?.sub) {
        throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
    }

    const user = await userService.findById(decoded.sub);

    if (!user) {
        throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
    }

    req.user = user;
    next();
};
