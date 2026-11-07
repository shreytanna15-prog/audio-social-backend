import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { playlistService } from "@/server/modules/playlist/playlist.service";
import {
    attachPlaylistTracksSchema,
    type AttachPlaylistTracksSchema,
} from "@/server/modules/playlist/playlist.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(attachPlaylistTracksSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(
            req.nextUrl.pathname,
            "playlist ID",
            1
        );
        const payload = req.body as AttachPlaylistTracksSchema;
        const result = await playlistService.attachTracks(
            user.id,
            playlistId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Tracks attached successfully",
            data: result,
        });
    });
