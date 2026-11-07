import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { albumService } from "@/server/modules/album/album.service";
import {
    albumCoverUploadUrlSchema,
    type AlbumCoverUploadUrlSchema,
} from "@/server/modules/album/album.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(albumCoverUploadUrlSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(
            req.nextUrl.pathname,
            "album ID",
            2
        );
        const payload = req.body as AlbumCoverUploadUrlSchema;
        const data = await albumService.createCoverUploadUrl(
            user.id,
            albumId,
            payload
        );

        return NextResponse.json(
            {
                success: true,
                message: "Cover upload URL created successfully",
                data,
            },
            { status: 201 }
        );
    });
