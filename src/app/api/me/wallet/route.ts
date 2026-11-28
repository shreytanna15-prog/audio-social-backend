import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { walletService } from "@/server/modules/wallet/wallet.service";
import {
    walletHistoryQuerySchema,
    type WalletHistoryQuerySchema,
} from "@/server/modules/wallet/wallet.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(walletHistoryQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as WalletHistoryQuerySchema;
        const data = await walletService.getWallet(user.id, query);

        return NextResponse.json({
            success: true,
            message: "Wallet fetched successfully",
            data,
        });
    });
