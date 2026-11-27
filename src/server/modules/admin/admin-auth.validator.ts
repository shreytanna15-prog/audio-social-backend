import { z } from "@/server/lib/zod";

export const adminLoginSchema = z
    .object({
        email: z
            .string()
            .trim()
            .toLowerCase()
            .pipe(z.email("Invalid email address")),
        password: z.string().min(8, "Password must be at least 8 characters"),
    })
    .openapi("AdminLoginBody");

export type AdminLoginSchema = z.infer<typeof adminLoginSchema>;

export const adminProfileSchema = z
    .object({
        id: z.uuid(),
        email: z.email(),
        name: z.string().nullable(),
        createdAt: z.string().datetime().optional(),
    })
    .openapi("AdminProfile");
