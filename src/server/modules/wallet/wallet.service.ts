import {
    CoinTransactionType,
    Prisma,
    type CoinTransaction,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { AppError } from "@/server/utils/global-error";
import type {
    AdminCoinTransactionsQuerySchema,
    AdminGrantCoinsSchema,
    WalletHistoryQuerySchema,
} from "./wallet.validator";

export type CoinTransactionDto = {
    id: string;
    amount: number;
    balanceAfter: number;
    type: CoinTransactionType;
    description: string;
    referenceId: string | null;
    createdAt: string;
    userId?: string;
};

export type WalletDto = {
    balance: number;
    transactions: CoinTransactionDto[];
    nextCursor: string | null;
};

export type AdminGrantResult = {
    userId: string;
    grantedAmount: number;
    newBalance: number;
};

export type CreditCoinsParams = {
    userId: string;
    amount: number;
    type: CoinTransactionType;
    description: string;
    referenceId?: string | null;
};

function toTransactionDto(
    row: CoinTransaction,
    includeUserId = false
): CoinTransactionDto {
    return {
        id: row.id,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        type: row.type,
        description: row.description,
        referenceId: row.referenceId,
        createdAt: row.createdAt.toISOString(),
        ...(includeUserId ? { userId: row.userId } : {}),
    };
}

function isUniqueViolation(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}

class WalletService {
    public async creditCoins(params: CreditCoinsParams): Promise<{
        newBalance: number;
        transaction: CoinTransaction;
        idempotent: boolean;
    }> {
        if (params.amount <= 0) {
            throw new AppError(
                "Credit amount must be greater than zero",
                400,
                "BAD_REQUEST"
            );
        }

        const referenceId = params.referenceId?.trim() || null;

        try {
            return await prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: { id: params.userId },
                    select: { id: true, coinBalance: true },
                });

                if (!user) {
                    throw new AppError(
                        "User not found",
                        404,
                        "RESOURCE_NOT_FOUND"
                    );
                }

                const newBalance = user.coinBalance + params.amount;

                const updatedUser = await tx.user.update({
                    where: { id: params.userId },
                    data: { coinBalance: newBalance },
                    select: { coinBalance: true },
                });

                const transaction = await tx.coinTransaction.create({
                    data: {
                        userId: params.userId,
                        amount: params.amount,
                        balanceAfter: newBalance,
                        type: params.type,
                        description: params.description,
                        referenceId,
                    },
                });

                return {
                    newBalance: updatedUser.coinBalance,
                    transaction,
                    idempotent: false,
                };
            });
        } catch (error) {
            if (!referenceId || !isUniqueViolation(error)) {
                throw error;
            }

            const existing = await prisma.coinTransaction.findFirst({
                where: {
                    type: params.type,
                    referenceId,
                    userId: params.userId,
                },
            });

            if (!existing) {
                throw error;
            }

            return {
                newBalance: existing.balanceAfter,
                transaction: existing,
                idempotent: true,
            };
        }
    }

    public async grantCoins(
        payload: AdminGrantCoinsSchema
    ): Promise<AdminGrantResult> {
        const result = await this.creditCoins({
            userId: payload.userId,
            amount: payload.amount,
            type: CoinTransactionType.ADMIN_GRANT,
            description: payload.reason,
            referenceId: null,
        });

        return {
            userId: payload.userId,
            grantedAmount: payload.amount,
            newBalance: result.newBalance,
        };
    }

    public async getWallet(
        userId: string,
        query: WalletHistoryQuerySchema
    ): Promise<WalletDto> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { coinBalance: true },
        });

        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        const { transactions, nextCursor } = await this.listPage({
            userId,
            cursor: query.cursor,
            limit: query.limit,
        });

        return {
            balance: user.coinBalance,
            transactions: transactions.map((row) => toTransactionDto(row)),
            nextCursor,
        };
    }

    public async listTransactions(
        query: AdminCoinTransactionsQuerySchema
    ): Promise<{
        transactions: CoinTransactionDto[];
        nextCursor: string | null;
    }> {
        const { transactions, nextCursor } = await this.listPage({
            userId: query.userId,
            cursor: query.cursor,
            limit: query.limit,
        });

        return {
            transactions: transactions.map((row) =>
                toTransactionDto(row, true)
            ),
            nextCursor,
        };
    }

    private async listPage(params: {
        userId?: string;
        cursor?: string;
        limit: number;
    }): Promise<{
        transactions: CoinTransaction[];
        nextCursor: string | null;
    }> {
        let cursorCreatedAt: Date | undefined;

        if (params.cursor) {
            const cursorRow = await prisma.coinTransaction.findFirst({
                where: {
                    id: params.cursor,
                    ...(params.userId ? { userId: params.userId } : {}),
                },
                select: { createdAt: true },
            });

            if (!cursorRow) {
                throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
            }

            cursorCreatedAt = cursorRow.createdAt;
        }

        const rows = await prisma.coinTransaction.findMany({
            where: {
                ...(params.userId ? { userId: params.userId } : {}),
                ...(cursorCreatedAt
                    ? { createdAt: { lt: cursorCreatedAt } }
                    : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: params.limit + 1,
        });

        const hasNext = rows.length > params.limit;
        const transactions = hasNext ? rows.slice(0, params.limit) : rows;
        const nextCursor = hasNext
            ? transactions[transactions.length - 1]?.id ?? null
            : null;

        return { transactions, nextCursor };
    }
}

export const walletService = new WalletService();
