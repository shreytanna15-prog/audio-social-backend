import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { searchRecentService } from "@/server/modules/search/search-recent.service";
import {
    recordSearchRecentSchema,
    type RecordSearchRecentSchema,
} from "@/server/modules/search/search-recent.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const recent = await searchRecentService.list(user.id);

        return NextResponse.json({
            success: true,
            message: "Recent searches fetched successfully",
            data: recent,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(recordSearchRecentSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as RecordSearchRecentSchema;
        const recent = await searchRecentService.record(user.id, payload);

        return NextResponse.json({
            success: true,
            message: "Recent search recorded successfully",
            data: recent,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const result = await searchRecentService.clear(user.id);

        return NextResponse.json({
            success: true,
            message: "Recent searches cleared successfully",
            data: result,
        });
    });
