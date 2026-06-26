import { prisma } from "@/server/config/prisma";
import { User } from "@/generated/prisma/client";
import { userService } from "@/server/modules/user/user.service";
import { LoginSchema, SignupSchema } from "@/server/modules/auth/auth.validator";
import { env } from "@/server/config/env";

import { comparePassword, generatePasswordHash } from "@/server/lib/passsword";
import { generateJwtToken, verifyJwtToken } from "@/server/lib/jwt";
import { AppError } from "@/server/utils/global-error";
import { AUTH_CONFIG } from "@/server/constants/auth.config";

export type UserResponse = Omit<User, "password">;
type Tokens = { accessToken: string; refreshToken: string };
type AuthResponse = {
    user: UserResponse;
    tokens: Tokens;
};

class AuthService {
    public async login(payload: LoginSchema): Promise<AuthResponse> {
        const user = await userService.findByEmail(payload.email);

        if (!user) {
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        const isPasswordValid = await comparePassword(payload.password, user.password);

        if (!isPasswordValid) {
            throw new AppError("Invalid credentials", 401, "UNAUTHORIZED");
        }

        const { password, ...userResponse } = user;
        const tokens = await this.generateTokens(user.id);

        return { user: userResponse, tokens };
    }

    public async signup(payload: SignupSchema): Promise<AuthResponse> {
        const existingUser = await userService.findByEmail(payload.email);

        if (existingUser) {
            throw new AppError("User already exists", 400, "BAD_REQUEST");
        }

        const passwordHash = await generatePasswordHash(payload.password);

        const user = await prisma.user.create({
            data: {
                email: payload.email,
                password: passwordHash,
                name: payload.name,
            },
        });

        const { password, ...userResponse } = user;
        const tokens = await this.generateTokens(user.id);

        return { user: userResponse, tokens };
    }

    public async refresh(refreshToken: string): Promise<Tokens> {
        const decoded = verifyJwtToken(refreshToken, env.JWT_REFRESH_SECRET);

        if (!decoded?.sub) {
            throw new AppError("Invalid or expired token", 401, "UNAUTHORIZED");
        }

        const user = await userService.findById(decoded.sub);

        const tokens = await this.generateTokens(user.id);

        return { ...tokens };
    }
    
    private async generateTokens(userId: string): Promise<Tokens> {
        const accessToken = generateJwtToken({
            sub: userId,
        }, env.JWT_ACCESS_SECRET, AUTH_CONFIG.jwtExpiry.accessToken);

        const refreshToken = generateJwtToken({
            sub: userId,
        }, env.JWT_REFRESH_SECRET, AUTH_CONFIG.jwtExpiry.refreshToken);

        return { accessToken, refreshToken };
    }
}

export const authService = new AuthService();