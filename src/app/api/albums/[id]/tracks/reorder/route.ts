import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { albumService } from "@/server/modules/album/album.service";
import {
    reorderAlbumTracksSchema,
    type ReorderAlbumTracksSchema,
} from "@/server/modules/album/album.validator";
import type { User } from "@/generated/prisma/client";

export const PUT = route()
    .use(withAuth)
    .use(validateBody(reorderAlbumTracksSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(
            req.nextUrl.pathname,
            "album ID",
            2
        );
        const payload = req.body as ReorderAlbumTracksSchema;
        const result = await albumService.reorderTracks(
            user.id,
            albumId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Tracks reordered successfully",
            data: result,
        });
    });
