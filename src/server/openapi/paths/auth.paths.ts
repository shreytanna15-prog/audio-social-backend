import { registry, refreshSecurity, standardErrorResponses } from "@/server/openapi/registry";
import {
    authSuccessResponseSchema,
    passwordResetConfirmSuccessResponseSchema,
    passwordResetRequestSuccessResponseSchema,
    passwordResetVerifySuccessResponseSchema,
    tokensSuccessResponseSchema,
} from "@/server/openapi/schemas";
import {
    confirmPasswordResetSchema,
    loginSchema,
    requestPasswordResetSchema,
    signupSchema,
    verifyPasswordResetOtpSchema,
} from "@/server/modules/auth/auth.validator";

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

registry.registerPath({
    method: "post",
    path: "/api/auth/password-reset/request",
    tags: ["Auth"],
    summary: "Request password reset OTP",
    description:
        "Send a 6-digit email OTP if the account exists. Always returns a generic success message.",
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: requestPasswordResetSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Reset request accepted",
            content: {
                "application/json": {
                    schema: passwordResetRequestSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/auth/password-reset/verify",
    tags: ["Auth"],
    summary: "Verify password reset OTP",
    description: "Verify the email OTP and return a short-lived reset token.",
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: verifyPasswordResetOtpSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "OTP verified",
            content: {
                "application/json": {
                    schema: passwordResetVerifySuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/auth/password-reset/confirm",
    tags: ["Auth"],
    summary: "Confirm password reset",
    description: "Set a new password using the reset token from OTP verification.",
    request: {
        body: {
            required: true,
            content: {
                "application/json": {
                    schema: confirmPasswordResetSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Password updated",
            content: {
                "application/json": {
                    schema: passwordResetConfirmSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
