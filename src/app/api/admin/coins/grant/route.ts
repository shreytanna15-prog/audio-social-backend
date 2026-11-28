import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAdminAuth } from "@/server/middlewares/with-admin-auth";
import { validateBody } from "@/server/middlewares/validate";
import { walletService } from "@/server/modules/wallet/wallet.service";
import {
    adminGrantCoinsSchema,
    type AdminGrantCoinsSchema,
} from "@/server/modules/wallet/wallet.validator";

export const POST = route()
    .use(withAdminAuth)
    .use(validateBody(adminGrantCoinsSchema))
    .handle(async (req) => {
        const body = req.body as AdminGrantCoinsSchema;
        const data = await walletService.grantCoins(body);

        return NextResponse.json({
            success: true,
            message: "Coins granted successfully",
            data,
        });
    });
