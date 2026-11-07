import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { albumService } from "@/server/modules/album/album.service";
import {
    attachAlbumTracksSchema,
    type AttachAlbumTracksSchema,
} from "@/server/modules/album/album.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(attachAlbumTracksSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(
            req.nextUrl.pathname,
            "album ID",
            1
        );
        const payload = req.body as AttachAlbumTracksSchema;
        const result = await albumService.attachTracks(
            user.id,
            albumId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Tracks attached successfully",
            data: result,
        });
    });
