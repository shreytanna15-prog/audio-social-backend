import { beforeEach, vi } from "vitest";

vi.mock("@/server/config/env", () => ({
    env: {
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        DIRECT_URL: "postgresql://test:test@localhost:5432/test",
        JWT_ACCESS_SECRET: "test-access-secret",
        JWT_REFRESH_SECRET: "test-refresh-secret",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    },
}));

vi.mock("@/server/config/prisma", () => {
    const follow = {
        findUnique: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    };
    const user = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
    };
    const searchRecent = {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    };

    return {
        prisma: {
            follow,
            user,
            searchRecent,
        },
    };
});

beforeEach(() => {
    vi.clearAllMocks();
});
