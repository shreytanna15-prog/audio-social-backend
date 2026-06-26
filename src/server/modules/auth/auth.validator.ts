import { passwordSchema } from "@/server/utils/common.validator";
import { z } from "zod";

export const loginSchema = z.object({
    email: z.email("Invalid email address"),
    password: passwordSchema,
});

export const signupSchema = z.object({
    email: z.email("Invalid email address"),
    password: passwordSchema,
    name: z.string()
        .min(2, "Name must be at least 2 characters long")
        .max(50, "Name must be less than 50 characters long")
        .trim()
        .optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;