import { registry, refreshSecurity, standardErrorResponses } from "@/server/openapi/registry";
import {
    authSuccessResponseSchema,
    tokensSuccessResponseSchema,
} from "@/server/openapi/schemas";
import { loginSchema, signupSchema } from "@/server/modules/auth/auth.validator";

registry.registerPath({
    method: "post",
    path: "/api/auth/signup",
    tags: ["Auth"],
    summary: "Sign up",
    description: "Create a new user account and return access/refresh tokens.",
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: signupSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Signup successful",
            content: {
                "application/json": {
                    schema: authSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/auth/login",
    tags: ["Auth"],
    summary: "Log in",
    description: "Authenticate with email and password.",
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: loginSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Login successful",
            content: {
                "application/json": {
                    schema: authSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/auth/refresh",
    tags: ["Auth"],
    summary: "Refresh tokens",
    description: "Exchange a refresh token for a new access/refresh token pair.",
    security: [...refreshSecurity],
    responses: {
        200: {
            description: "Token refreshed successfully",
            content: {
                "application/json": {
                    schema: tokensSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
