import { z } from "@/server/lib/zod";

export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(
        /[0-9]|[^A-Za-z0-9]/,
        "Password must contain at least one number or symbol"
    );

export const usernameSchema = z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .pipe(
        z
            .string()
            .min(3, "Username must be at least 3 characters")
            .max(20, "Username must be at most 20 characters")
            .regex(
                /^[a-z0-9._]+$/,
                "Username can only contain letters, numbers, periods, and underscores"
            )
            .refine((value) => !value.startsWith(".") && !value.endsWith("."), {
                message: "Username cannot start or end with a period",
            })
            .refine((value) => !value.includes(".."), {
                message: "Username cannot contain consecutive periods",
            })
    );
