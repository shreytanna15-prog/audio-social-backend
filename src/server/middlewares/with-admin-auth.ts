import { env } from "@/server/config/env";
import { AUTH_CONFIG } from "@/server/constants/auth.config";
import { verifyJwtToken } from "@/server/lib/jwt";
import { adminAuthService } from "@/server/modules/admin/admin-auth.service";
import type { ApiMiddleware } from "@/server/types/request";
import { AppError } from "@/server/utils/global-error";

function readAdminToken(req: {
    headers: Headers;
    cookies: { get: (name: string) => { value: string } | undefined };
}): string | null {
    const cookieToken = req.cookies.get(AUTH_CONFIG.admin.cookieName)?.value;
    if (cookieToken) return cookieToken;

    const authHeader = req.headers.get(AUTH_CONFIG.headers.accessToken);
    if (!authHeader?.startsWith("Bearer ")) return null;
    return authHeader.slice("Bearer ".length).trim() || null;
}

export const withAdminAuth: ApiMiddleware = async (req, _res, next) => {
    const accessToken = readAdminToken(req);

    if (!accessToken) {
        throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const decoded = verifyJwtToken(accessToken, env.ADMIN_JWT_SECRET);

    if (!decoded?.sub || decoded.type !== "ADMIN") {
        throw new AppError("Invalid or expired admin token", 401, "UNAUTHORIZED");
    }

    const admin = await adminAuthService.findAuthContext(decoded.sub);

    if (!admin) {
        throw new AppError("Admin account no longer exists", 401, "UNAUTHORIZED");
    }

    req.admin = admin;
    next();
};
