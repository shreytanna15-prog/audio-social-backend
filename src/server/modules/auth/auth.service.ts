import { prisma } from "@/server/config/prisma";
import { User } from "@/generated/prisma/client";
import { env } from "@/server/config/env";

import { comparePassword, generatePasswordHash } from "@/server/lib/passsword";
import { generateJwtToken } from "@/server/lib/jwt";
import { LoginSchema, SignupSchema } from "./auth.validator";
import { AppError } from "@/server/utils/global-error";
import { AUTH_CONFIG } from "@/server/constants/auth.config";

type UserResponse = Omit<User, "password">;
type Tokens = {accessToken: string, refreshToken: string };
type AuthResponse = {
    user: UserResponse;
    tokens: Tokens;
}


class AuthService {
    public async login(payload: LoginSchema): Promise<AuthResponse> {
        const user = await this.findUserByEmail(payload.email);

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
        const existingUser = await this.findUserByEmail(payload.email);

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
    
    public async findUserByEmail(email: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: {
                email,
            },
        });
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