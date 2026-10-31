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
        R2_ACCOUNT_ID: "test-account",
        R2_ACCESS_KEY_ID: "test-access-key",
        R2_SECRET_ACCESS_KEY: "test-secret-key",
        R2_BUCKET: "test-bucket",
        R2_PUBLIC_BASE_URL: "https://cdn.example.com",
    },
}));

vi.mock("@/server/config/r2", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/config/r2")>();
    return {
        ...actual,
        assertR2Configured: vi.fn(),
        presignPut: vi.fn(async ({ path }: { path: string }) => ({
            path,
            signedUrl: `https://upload.example.com/${path}`,
        })),
        objectExists: vi.fn(async () => true),
        deleteObject: vi.fn(async () => undefined),
        publicUrl: (path: string | null | undefined) =>
            path ? `https://cdn.example.com/${path}` : null,
    };
});

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
        update: vi.fn(),
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
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    };

    return {
        prisma: {
            follow,
            user,
            searchRecent,
            conversation,
            message,
        },
    };
});

beforeEach(() => {
    vi.clearAllMocks();
});
