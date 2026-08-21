import {
    OpenAPIRegistry,
    type ResponseConfig,
} from "@asteasolutions/zod-to-openapi";
import { z } from "@/server/lib/zod";

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Access token. Send as `Authorization: Bearer <token>`.",
});

registry.registerComponent("securitySchemes", "refreshToken", {
    type: "apiKey",
    in: "header",
    name: "x-refresh-token",
    description: "Refresh token for `/api/auth/refresh`.",
});

export const errorCodeSchema = z
    .enum([
        "CREATED",
        "OK",
        "BAD_REQUEST",
        "UNAUTHORIZED",
        "FORBIDDEN",
        "RESOURCE_NOT_FOUND",
        "CONFLICT",
        "TOO_MANY_REQUESTS",
        "INTERNAL_SERVER_ERROR",
    ])
    .openapi("ErrorCode");

export const apiErrorSchema = registry.register(
    "ApiError",
    z.object({
        success: z.literal(false).optional(),
        code: errorCodeSchema,
        message: z.string(),
    })
);

export function successResponseSchema<T extends z.ZodType>(
    dataSchema: T,
    id: string
) {
    return registry.register(
        id,
        z.object({
            success: z.literal(true),
            message: z.string(),
            data: dataSchema.optional(),
        })
    );
}

export function successMessageResponseSchema(id: string) {
    return registry.register(
        id,
        z.object({
            success: z.literal(true),
            message: z.string(),
        })
    );
}

function errorResponse(description: string): ResponseConfig {
    return {
        description,
        content: {
            "application/json": {
                schema: apiErrorSchema,
            },
        },
    };
}

export const standardErrorResponses = {
    400: errorResponse("Bad request"),
    401: errorResponse("Unauthorized"),
    404: errorResponse("Resource not found"),
    409: errorResponse("Conflict"),
    500: errorResponse("Internal server error"),
} as const;

export const bearerSecurity: [{ bearerAuth: string[] }] = [{ bearerAuth: [] }];
export const refreshSecurity: [{ refreshToken: string[] }] = [
    { refreshToken: [] },
];
