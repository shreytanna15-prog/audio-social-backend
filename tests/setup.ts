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
        REALTIME_WORKER_URL: undefined,
        REALTIME_NOTIFY_SECRET: undefined,
        REALTIME_TOKEN_SECRET: undefined,
    },
}));

vi.mock("@/server/config/supabase", () => ({
    supabase: {
        storage: {
            from: () => ({
                createSignedUploadUrl: vi.fn(),
                createSignedUrl: vi.fn(),
                list: vi.fn(),
            }),
        },
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
    const conversation = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    };
    const message = {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    };

    return {
        prisma: {
            follow,
            user,
            searchRecent,
            conversation,
            message,
            $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
                fn({
                    conversation,
                    message,
                })
            ),
        },
    };
});

beforeEach(() => {
    vi.clearAllMocks();
});
