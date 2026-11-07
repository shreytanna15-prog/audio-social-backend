import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { playlistService } from "@/server/modules/playlist/playlist.service";
import {
    playlistCoverUploadUrlSchema,
    type PlaylistCoverUploadUrlSchema,
} from "@/server/modules/playlist/playlist.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(playlistCoverUploadUrlSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const playlistId = parsePathUuid(
            req.nextUrl.pathname,
            "playlist ID",
            2
        );
        const payload = req.body as PlaylistCoverUploadUrlSchema;
        const data = await playlistService.createCoverUploadUrl(
            user.id,
            playlistId,
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
