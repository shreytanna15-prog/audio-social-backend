import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { saveService } from "@/server/modules/save/save.service";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(req.nextUrl.pathname, "album ID", 1);
        const data = await saveService.saveAlbum(user.id, albumId);

        return NextResponse.json({
            success: true,
            message: "Album saved successfully",
            data,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(req.nextUrl.pathname, "album ID", 1);
        const data = await saveService.unsaveAlbum(user.id, albumId);

        return NextResponse.json({
            success: true,
            message: "Album unsaved successfully",
            data,
        });
    });
