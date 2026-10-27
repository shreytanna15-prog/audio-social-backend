import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { searchRecentService } from "@/server/modules/search/search-recent.service";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const id = parsePathUuid(req.nextUrl.pathname, "recent search ID");
        const recent = await searchRecentService.remove(user.id, id);

        return NextResponse.json({
            success: true,
            message: "Recent search removed successfully",
            data: recent,
        });
    });
