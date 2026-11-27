import { prisma } from "@/server/config/prisma";
import { env } from "@/server/config/env";
import { AUTH_CONFIG } from "@/server/constants/auth.config";
import { comparePassword } from "@/server/lib/password";
import { generateJwtToken } from "@/server/lib/jwt";
import { AppError } from "@/server/utils/global-error";
import type { AdminLoginSchema } from "@/server/modules/admin/admin-auth.validator";

export type AdminProfile = {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
};

export type AdminLoginResult = {
    accessToken: string;
    admin: Omit<AdminProfile, "createdAt">;
};

class AdminAuthService {
    public async login(payload: AdminLoginSchema): Promise<AdminLoginResult> {
        const admin = await prisma.admin.findUnique({
            where: { email: payload.email },
        });

        if (!admin) {
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        const isPasswordValid = await comparePassword(
            payload.password,
            admin.password
        );

        if (!isPasswordValid) {
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        const accessToken = generateJwtToken(
            {
                sub: admin.id,
                email: admin.email,
                type: "ADMIN",
            },
            env.ADMIN_JWT_SECRET,
            AUTH_CONFIG.jwtExpiry.adminAccessToken
        );

        return {
            accessToken,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
            },
        };
    }

    public async getProfile(adminId: string): Promise<AdminProfile> {
        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        if (!admin) {
            throw new AppError("Admin account no longer exists", 401, "UNAUTHORIZED");
        }

        return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            createdAt: admin.createdAt.toISOString(),
        };
    }

    public async findAuthContext(adminId: string) {
        return prisma.admin.findUnique({
            where: { id: adminId },
            select: { id: true, email: true, name: true },
        });
    }
}

export const adminAuthService = new AdminAuthService();
