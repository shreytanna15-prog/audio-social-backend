import { z } from "@/server/lib/zod";

export const adminGrantCoinsSchema = z
    .object({
        userId: z.uuid("Invalid user id"),
        amount: z.number().int().positive().max(100000),
        reason: z.string().trim().min(3).max(255),
    })
    .openapi("AdminGrantCoinsBody");

export type AdminGrantCoinsSchema = z.infer<typeof adminGrantCoinsSchema>;

export const walletHistoryQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .openapi("WalletHistoryQuery");

export type WalletHistoryQuerySchema = z.infer<typeof walletHistoryQuerySchema>;

export const adminCoinTransactionsQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
        userId: z.uuid("Invalid user id").optional(),
    })
    .openapi("AdminCoinTransactionsQuery");

export type AdminCoinTransactionsQuerySchema = z.infer<
    typeof adminCoinTransactionsQuerySchema
>;
