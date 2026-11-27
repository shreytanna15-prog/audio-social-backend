import { z } from "@/server/lib/zod";

export const adminUsersListQuerySchema = z
    .object({
        q: z.string().trim().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
    })
    .openapi("AdminUsersListQuery");

export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;

export const adminUserNestedListQuerySchema = z
    .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
    })
    .openapi("AdminUserNestedListQuery");

export type AdminUserNestedListQuery = z.infer<
    typeof adminUserNestedListQuerySchema
>;
