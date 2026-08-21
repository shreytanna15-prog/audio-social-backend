import { z } from "@/server/lib/zod";
import { passwordSchema } from "@/server/utils/common.validator";

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
            .min(2, "Name must be at least 2 characters long")
            .max(50, "Name must be less than 50 characters long")
            .trim()
            .optional(),
    })
    .openapi("SignupBody");

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;
