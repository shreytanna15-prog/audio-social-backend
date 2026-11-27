import type { NextResponse } from "next/server";
import { env } from "@/server/config/env";
import { AUTH_CONFIG } from "@/server/constants/auth.config";

export function setAdminAccessCookie(
    response: NextResponse,
    accessToken: string
): void {
    response.cookies.set(AUTH_CONFIG.admin.cookieName, accessToken, {
        httpOnly: true,
        sameSite: "lax",
        path: AUTH_CONFIG.admin.cookiePath,
        secure: env.NODE_ENV === "production",
        maxAge: AUTH_CONFIG.age.adminAccessToken,
    });
}

export function clearAdminAccessCookie(response: NextResponse): void {
    response.cookies.set(AUTH_CONFIG.admin.cookieName, "", {
        httpOnly: true,
        sameSite: "lax",
        path: AUTH_CONFIG.admin.cookiePath,
        secure: env.NODE_ENV === "production",
        maxAge: 0,
    });
}
