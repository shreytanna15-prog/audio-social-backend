import { z } from "@/server/lib/zod";
import {
    registry,
    successResponseSchema,
} from "@/server/openapi/registry";

export const userSchema = registry.register(
    "User",
    z.object({
        id: z.uuid(),
        email: z.email(),
        username: z.string(),
        name: z.string().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
    })
);

export const tokensSchema = registry.register(
    "Tokens",
    z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
    })
);

export const authDataSchema = registry.register(
    "AuthData",
    z.object({
        user: userSchema,
        tokens: tokensSchema,
    })
);

export const authSuccessResponseSchema = successResponseSchema(
    authDataSchema,
    "AuthSuccessResponse"
);

export const tokensSuccessResponseSchema = successResponseSchema(
    tokensSchema,
    "TokensSuccessResponse"
);

export const userSuccessResponseSchema = successResponseSchema(
    userSchema,
    "UserSuccessResponse"
);
