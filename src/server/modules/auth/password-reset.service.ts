import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/server/config/prisma";
import { env } from "@/server/config/env";
import { AUTH_CONFIG } from "@/server/constants/auth.config";
import { sendOtpEmail } from "@/server/lib/email";
import { generateJwtToken, verifyJwtToken } from "@/server/lib/jwt";
import { generatePasswordHash } from "@/server/lib/password";
import { AppError } from "@/server/utils/global-error";
import { userService } from "@/server/modules/user/user.service";
import type {
    ConfirmPasswordResetSchema,
    RequestPasswordResetSchema,
    VerifyPasswordResetOtpSchema,
} from "./auth.validator";

const RESET_PURPOSE = "password_reset";

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function hashOtp(email: string, code: string): string {
    return createHash("sha256")
        .update(`${normalizeEmail(email)}:${code}`)
        .digest("hex");
}

function generateOtpCode(): string {
    const max = 10 ** AUTH_CONFIG.passwordReset.otpLength;
    const n = randomInt(0, max);
    return String(n).padStart(AUTH_CONFIG.passwordReset.otpLength, "0");
}

function cooldownRemainingMs(lastSentAt: Date): number {
    const elapsed = Date.now() - lastSentAt.getTime();
    return Math.max(0, AUTH_CONFIG.passwordReset.resendCooldownMs - elapsed);
}

class PasswordResetService {
    public async requestReset(
        payload: RequestPasswordResetSchema
    ): Promise<{ ok: true; resendAvailableAt: string | null }> {
        const email = normalizeEmail(payload.email);
        const user = await userService.findByEmail(email);

        // Always look like success to avoid email enumeration.
        if (!user) {
            return { ok: true, resendAvailableAt: null };
        }

        const existing = await prisma.passwordResetChallenge.findUnique({
            where: { email },
        });

        if (existing) {
            const remaining = cooldownRemainingMs(existing.lastSentAt);
            if (remaining > 0) {
                throw new AppError(
                    "Please wait before requesting another code",
                    429,
                    "RESEND_COOLDOWN"
                );
            }
        }

        const code = generateOtpCode();
        const now = new Date();
        const expiresAt = new Date(
            now.getTime() + AUTH_CONFIG.passwordReset.otpTtlMs
        );

        await prisma.passwordResetChallenge.upsert({
            where: { email },
            create: {
                email,
                codeHash: hashOtp(email, code),
                attempts: 0,
                expiresAt,
                lastSentAt: now,
            },
            update: {
                codeHash: hashOtp(email, code),
                attempts: 0,
                expiresAt,
                lastSentAt: now,
            },
        });

        await sendOtpEmail({ to: email, code });

        return {
            ok: true,
            resendAvailableAt: new Date(
                now.getTime() + AUTH_CONFIG.passwordReset.resendCooldownMs
            ).toISOString(),
        };
    }

    public async verifyOtp(
        payload: VerifyPasswordResetOtpSchema
    ): Promise<{ resetToken: string }> {
        const email = normalizeEmail(payload.email);
        const challenge = await prisma.passwordResetChallenge.findUnique({
            where: { email },
        });

        if (!challenge) {
            throw new AppError("Invalid or expired code", 400, "OTP_INVALID");
        }

        if (challenge.expiresAt.getTime() <= Date.now()) {
            await prisma.passwordResetChallenge.delete({ where: { email } });
            throw new AppError("Code has expired", 400, "OTP_EXPIRED");
        }

        if (challenge.attempts >= AUTH_CONFIG.passwordReset.maxAttempts) {
            await prisma.passwordResetChallenge.delete({ where: { email } });
            throw new AppError(
                "Too many invalid attempts. Request a new code.",
                429,
                "OTP_LOCKED"
            );
        }

        const expected = hashOtp(email, payload.otp);
        if (expected !== challenge.codeHash) {
            const attempts = challenge.attempts + 1;
            if (attempts >= AUTH_CONFIG.passwordReset.maxAttempts) {
                await prisma.passwordResetChallenge.delete({ where: { email } });
                throw new AppError(
                    "Too many invalid attempts. Request a new code.",
                    429,
                    "OTP_LOCKED"
                );
            }
            await prisma.passwordResetChallenge.update({
                where: { email },
                data: { attempts },
            });
            throw new AppError("Invalid or expired code", 400, "OTP_INVALID");
        }

        const user = await userService.findByEmail(email);
        if (!user) {
            await prisma.passwordResetChallenge.delete({ where: { email } });
            throw new AppError("Invalid or expired code", 400, "OTP_INVALID");
        }

        // Consume the OTP so it cannot be reused; reset token is the next step.
        await prisma.passwordResetChallenge.delete({ where: { email } });

        const resetToken = generateJwtToken(
            {
                sub: user.id,
                email,
                purpose: RESET_PURPOSE,
            },
            env.JWT_ACCESS_SECRET,
            AUTH_CONFIG.jwtExpiry.passwordReset
        );

        return { resetToken };
    }

    public async confirmReset(
        payload: ConfirmPasswordResetSchema
    ): Promise<{ ok: true }> {
        const decoded = verifyJwtToken(
            payload.resetToken,
            env.JWT_ACCESS_SECRET
        );

        if (
            !decoded?.sub ||
            decoded.purpose !== RESET_PURPOSE ||
            typeof decoded.email !== "string"
        ) {
            throw new AppError(
                "Invalid or expired reset token",
                401,
                "UNAUTHORIZED"
            );
        }

        const user = await userService.findById(decoded.sub);
        if (normalizeEmail(user.email) !== normalizeEmail(decoded.email)) {
            throw new AppError(
                "Invalid or expired reset token",
                401,
                "UNAUTHORIZED"
            );
        }

        const passwordHash = await generatePasswordHash(payload.password);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: passwordHash },
        });

        return { ok: true };
    }
}

export const passwordResetService = new PasswordResetService();
