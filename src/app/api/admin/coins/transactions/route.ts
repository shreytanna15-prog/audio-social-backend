import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { walletService } from "@/server/modules/wallet/wallet.service";
import {
    adminCoinTransactionsQuerySchema,
    type AdminCoinTransactionsQuerySchema,
} from "@/server/modules/wallet/wallet.validator";

export const GET = route()
    .use(withAdminAuth)
    .use(validateQuery(adminCoinTransactionsQuerySchema))
    .handle(async (req) => {
        const query = req.localsQuery as AdminCoinTransactionsQuerySchema;
        const data = await walletService.listTransactions(query);

        return NextResponse.json({
            success: true,
            message: "Coin transactions fetched successfully",
            data,
        });
    });
