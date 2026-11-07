import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { albumService } from "@/server/modules/album/album.service";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const userId = parsePathUuid(req.nextUrl.pathname, "user ID", 1);
        const albums = await albumService.listReleasedByUser(userId);

        return NextResponse.json({
            success: true,
            message: "Released albums fetched successfully",
            data: albums,
        });
    });
