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
