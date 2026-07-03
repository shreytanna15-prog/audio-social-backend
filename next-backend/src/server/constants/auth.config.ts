export const AUTH_CONFIG = {
    age: {
        accessToken: 15 * 60, // 15 minutes
        refreshToken: 30 * 24 * 3600, // 30 days
    },
    jwtExpiry: {
        accessToken: '15m',
        refreshToken: '30d',
    },
    headers: {
        accessToken: 'authorization',
        refreshToken: 'x-refresh-token',
    },
} as const;
