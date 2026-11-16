import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { feedService } from "@/server/modules/feed/feed.service";
import {
    listFeedQuerySchema,
    type ListFeedQuerySchema,
} from "@/server/modules/feed/feed.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(listFeedQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as ListFeedQuerySchema;
        const data = await feedService.listFeed(user.id, query);

        return NextResponse.json({
            success: true,
            message: "Feed fetched successfully",
            data,
        });
    });
