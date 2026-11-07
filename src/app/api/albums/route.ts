import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { albumService } from "@/server/modules/album/album.service";
import {
    createAlbumSchema,
    type CreateAlbumSchema,
} from "@/server/modules/album/album.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const albums = await albumService.listAlbums(user.id);

        return NextResponse.json({
            success: true,
            message: "Albums fetched successfully",
            data: albums,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(createAlbumSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateAlbumSchema;
        const album = await albumService.createAlbum(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Album created successfully",
                data: album,
            },
            { status: 201 }
        );
    });
