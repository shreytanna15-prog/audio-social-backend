export const AUTH_CONFIG = {
    age: {
        accessToken: 15 * 60, // 15 minutes
        refreshToken: 30 * 24 * 3600, // 30 days
    },
    jwtExpiry: {
        accessToken: "15m",
        refreshToken: "30d",
        /** Short-lived token after OTP verify, before password is set. */
        passwordReset: "10m",
    },
    headers: {
        accessToken: "authorization",
        refreshToken: "x-refresh-token",
    },
    passwordReset: {
        otpLength: 6,
        otpTtlMs: 10 * 60 * 1000,
        resendCooldownMs: 120 * 1000,
        maxAttempts: 5,
    },
} as const;
