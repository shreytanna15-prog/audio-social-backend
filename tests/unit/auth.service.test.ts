import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/config/prisma";
import { authService } from "@/server/modules/auth/auth.service";
import { userService } from "@/server/modules/user/user.service";
import { comparePassword, generatePasswordHash } from "@/server/lib/passsword";
import { generateJwtToken, verifyJwtToken } from "@/server/lib/jwt";
import { AppError } from "@/server/utils/global-error";

vi.mock("@/server/modules/user/user.service", () => ({
    userService: {
        findByEmail: vi.fn(),
        findByUsername: vi.fn(),
        findById: vi.fn(),
    },
}));

vi.mock("@/server/lib/passsword", () => ({
    comparePassword: vi.fn(),
    generatePasswordHash: vi.fn(),
}));

vi.mock("@/server/lib/jwt", () => ({
    generateJwtToken: vi.fn(),
    verifyJwtToken: vi.fn(),
}));

const USER_ID = "11111111-1111-7111-8111-111111111111";

describe("authService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(generateJwtToken)
            .mockReturnValueOnce("access")
            .mockReturnValueOnce("refresh");
    });


    it("login rejects unknown email", async () => {
        vi.mocked(userService.findByEmail).mockResolvedValue(null);

        await expect(
            authService.login({
                email: "missing@example.com",
                password: "Password1!",
            })
        ).rejects.toMatchObject({
            status: 401,
            code: "UNAUTHORIZED",
        } satisfies Partial<AppError>);
    });

    it("login rejects bad password", async () => {
        vi.mocked(userService.findByEmail).mockResolvedValue({
            id: USER_ID,
            email: "a@example.com",
            password: "hash",
            username: "alice",
            name: "Alice",
        } as never);
        vi.mocked(comparePassword).mockResolvedValue(false);

        await expect(
            authService.login({
                email: "a@example.com",
                password: "wrong",
            })
        ).rejects.toMatchObject({ status: 401 });
    });

    it("login returns user without password + tokens", async () => {
        vi.mocked(userService.findByEmail).mockResolvedValue({
            id: USER_ID,
            email: "a@example.com",
            password: "hash",
            username: "alice",
            name: "Alice",
            bio: null,
            avatarPath: null,
            coverPath: null,
            usernameChangedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);
        vi.mocked(comparePassword).mockResolvedValue(true);

        const result = await authService.login({
            email: "a@example.com",
            password: "Password1!",
        });

        expect(result.tokens).toEqual({
            accessToken: "access",
            refreshToken: "refresh",
        });
        expect(result.user).toMatchObject({
            id: USER_ID,
            email: "a@example.com",
            username: "alice",
        });
        expect(result.user).not.toHaveProperty("password");
    });

    it("signup rejects duplicate email", async () => {
        vi.mocked(userService.findByEmail).mockResolvedValue({
            id: USER_ID,
        } as never);

        await expect(
            authService.signup({
                email: "a@example.com",
                password: "Password1!",
                name: "Alice",
                username: "alice",
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Email is already registered",
        });
    });

    it("signup rejects taken username", async () => {
        vi.mocked(userService.findByEmail).mockResolvedValue(null);
        vi.mocked(userService.findByUsername).mockResolvedValue({
            id: USER_ID,
        } as never);

        await expect(
            authService.signup({
                email: "a@example.com",
                password: "Password1!",
                name: "Alice",
                username: "alice",
            })
        ).rejects.toMatchObject({
            status: 400,
            message: "Username is already taken",
        });
    });

    it("signup creates user and returns tokens", async () => {
        vi.mocked(userService.findByEmail).mockResolvedValue(null);
        vi.mocked(userService.findByUsername).mockResolvedValue(null);
        vi.mocked(generatePasswordHash).mockResolvedValue("hashed");
        vi.mocked(prisma.user.create).mockResolvedValue({
            id: USER_ID,
            email: "a@example.com",
            password: "hashed",
            username: "alice",
            name: "Alice",
            bio: null,
            avatarPath: null,
            coverPath: null,
            usernameChangedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);

        const result = await authService.signup({
            email: "a@example.com",
            password: "Password1!",
            name: "Alice",
            username: "alice",
        });

        expect(prisma.user.create).toHaveBeenCalled();
        expect(result.tokens.accessToken).toBe("access");
        expect(result.user.username).toBe("alice");
    });

    it("refresh rejects invalid token", async () => {
        vi.mocked(verifyJwtToken).mockReturnValue(null);

        await expect(authService.refresh("bad")).rejects.toMatchObject({
            status: 401,
        });
    });

    it("refresh returns new tokens for valid refresh", async () => {
        vi.mocked(verifyJwtToken).mockReturnValue({ sub: USER_ID } as never);
        vi.mocked(userService.findById).mockResolvedValue({
            id: USER_ID,
        } as never);
        vi.mocked(generateJwtToken)
            .mockReset()
            .mockReturnValueOnce("access2")
            .mockReturnValueOnce("refresh2");


        const tokens = await authService.refresh("old-refresh");
        expect(tokens).toEqual({
            accessToken: "access2",
            refreshToken: "refresh2",
        });
    });
});
