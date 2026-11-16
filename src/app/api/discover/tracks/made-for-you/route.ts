import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { tasteService } from "@/server/modules/discover/taste.service";
import {
    madeForYouQuerySchema,
    type MadeForYouQuerySchema,
} from "@/server/modules/discover/discover.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(madeForYouQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as MadeForYouQuerySchema;
        const tracks = await tasteService.listMadeForYou(user.id, query.limit);

        return NextResponse.json({
            success: true,
            message: "Made for you tracks fetched successfully",
            data: tracks,
        });
    });
