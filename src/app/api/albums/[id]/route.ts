import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { albumService } from "@/server/modules/album/album.service";
import {
    updateAlbumSchema,
    type UpdateAlbumSchema,
} from "@/server/modules/album/album.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(req.nextUrl.pathname, "album ID");
        const album = await albumService.getAlbum(user.id, albumId);

        return NextResponse.json({
            success: true,
            message: "Album fetched successfully",
            data: album,
        });
    });

export const PATCH = route()
    .use(withAuth)
    .use(validateBody(updateAlbumSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(req.nextUrl.pathname, "album ID");
        const payload = req.body as UpdateAlbumSchema;
        const album = await albumService.updateAlbum(
            user.id,
            albumId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Album updated successfully",
            data: album,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const albumId = parsePathUuid(req.nextUrl.pathname, "album ID");
        const result = await albumService.deleteAlbum(
            user.id,
            albumId
        );

        return NextResponse.json({
            success: true,
            message: "Album deleted successfully",
            data: result,
        });
    });
