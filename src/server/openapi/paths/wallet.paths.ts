import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import {
    adminCoinTransactionsQuerySchema,
    adminGrantCoinsSchema,
    walletHistoryQuerySchema,
} from "@/server/modules/wallet/wallet.validator";

const coinTransactionTypeSchema = z.enum(["CONTEST_REWARD", "ADMIN_GRANT"]);

const coinTransactionSchema = z
    .object({
        id: z.uuid(),
        amount: z.number().int(),
        balanceAfter: z.number().int().nonnegative(),
        type: coinTransactionTypeSchema,
        description: z.string(),
        referenceId: z.string().nullable(),
        createdAt: z.iso.datetime(),
        userId: z.uuid().optional(),
    })
    .openapi("CoinTransaction");

const walletDataSchema = z
    .object({
        balance: z.number().int().nonnegative(),
        transactions: z.array(coinTransactionSchema),
        nextCursor: z.uuid().nullable(),
    })
    .openapi("WalletData");

const adminGrantDataSchema = z
    .object({
        userId: z.uuid(),
        grantedAmount: z.number().int().positive(),
        newBalance: z.number().int().nonnegative(),
    })
    .openapi("AdminGrantCoinsData");

const adminTransactionsDataSchema = z
    .object({
        transactions: z.array(coinTransactionSchema),
        nextCursor: z.uuid().nullable(),
    })
    .openapi("AdminCoinTransactionsData");

registry.registerPath({
    method: "get",
    path: "/api/me/wallet",
    tags: ["Wallet"],
    summary: "Get private wallet balance and history",
    description:
        "Auth-required. Returns the viewer's coin balance and paginated ledger history. Never exposed on public profiles.",
    security: [...bearerSecurity],
    request: { query: walletHistoryQuerySchema },
    responses: {
        200: {
            description: "Wallet fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        walletDataSchema,
                        "WalletSuccessResponse"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/admin/coins/grant",
    tags: ["Admin Coins"],
    summary: "Grant coins to a user",
    description:
        "Super Admin only. Credits coins via the shared wallet ledger (ADMIN_GRANT).",
    security: [...bearerSecurity],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: adminGrantCoinsSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: "Coins granted successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        adminGrantDataSchema,
                        "AdminGrantCoinsSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/admin/coins/transactions",
    tags: ["Admin Coins"],
    summary: "List coin transactions",
    description:
        "Super Admin audit view of coin ledger rows across users (optional userId filter).",
    security: [...bearerSecurity],
    request: { query: adminCoinTransactionsQuerySchema },
    responses: {
        200: {
            description: "Coin transactions fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        adminTransactionsDataSchema,
                        "AdminCoinTransactionsSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});
