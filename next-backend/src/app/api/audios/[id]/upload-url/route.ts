import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { audioService } from "@/server/modules/audio/audio.service";
import type { UserResponse } from "@/server/modules/auth/auth.service";
import { AppError } from "@/server/utils/global-error";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as UserResponse;
        const audioId = req.nextUrl.pathname.split("/").at(-2);

        const parsedId = z.uuid("Invalid audio ID").safeParse(audioId);

        if (!parsedId.success) {
            throw new AppError("Invalid audio ID", 400, "BAD_REQUEST");
        }

        const result = await audioService.getPlaybackUploadUrl(
            user.id,
            parsedId.data
        );

        return NextResponse.json({
            success: true,
            message: "Playback upload URL created successfully",
            data: result,
        });
    });
