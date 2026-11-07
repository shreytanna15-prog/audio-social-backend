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
        const playlistId = parsePathUuid(req.nextUrl.pathname, "playlist ID", 1);
        const data = await saveService.savePlaylist(user.id, playlistId);

        return NextResponse.json({
            success: true,
            message: "Playlist saved successfully",
            data,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(req.nextUrl.pathname, "playlist ID", 1);
        const data = await saveService.unsavePlaylist(user.id, playlistId);

        return NextResponse.json({
            success: true,
            message: "Playlist unsaved successfully",
            data,
        });
    });
