import { z } from "@/server/lib/zod";
import { passwordSchema, usernameSchema } from "@/server/utils/common.validator";

export const loginSchema = z
    .object({
        email: z.email("Invalid email address"),
        password: passwordSchema,
    })
    .openapi("LoginBody");

export const signupSchema = z
    .object({
        email: z.email("Invalid email address"),
        password: passwordSchema,
        name: z
            .string()
            .trim()
            .min(1, "Name is required")
            .max(30, "Name must be at most 30 characters"),
        username: usernameSchema,
    })
    .openapi("SignupBody");

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;

export const requestPasswordResetSchema = z
    .object({
        email: z.email("Invalid email address"),
    })
    .openapi("RequestPasswordResetBody");

export const verifyPasswordResetOtpSchema = z
    .object({
        email: z.email("Invalid email address"),
        otp: z
            .string()
            .trim()
            .regex(/^\d{6}$/, "Code must be 6 digits"),
    })
    .openapi("VerifyPasswordResetOtpBody");

export const confirmPasswordResetSchema = z
    .object({
        resetToken: z.string().min(1, "Reset token is required"),
        password: passwordSchema,
    })
    .openapi("ConfirmPasswordResetBody");

export type RequestPasswordResetSchema = z.infer<
    typeof requestPasswordResetSchema
>;
export type VerifyPasswordResetOtpSchema = z.infer<
    typeof verifyPasswordResetOtpSchema
>;
export type ConfirmPasswordResetSchema = z.infer<
    typeof confirmPasswordResetSchema
>;
