import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { audioService } from "@/server/modules/audio/audio.service";
import {
    UpdateAudioSchema,
    updateAudioSchema,
} from "@/server/modules/audio/audio.validator";
import type { UserResponse } from "@/server/modules/auth/auth.service";
import { AppError } from "@/server/utils/global-error";

function parseAudioId(pathname: string): string {
    const audioId = pathname.split("/").at(-1);
    const parsedId = z.uuid("Invalid audio ID").safeParse(audioId);

    if (!parsedId.success) {
        throw new AppError("Invalid audio ID", 400, "BAD_REQUEST");
    }

    return parsedId.data;
}

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as UserResponse;
        const audio = await audioService.getAudioById(
            user.id,
            parseAudioId(req.nextUrl.pathname)
        );

        return NextResponse.json({
            success: true,
            message: "Audio fetched successfully",
            data: audio,
        });
    });

export const PATCH = route()
    .use(withAuth)
    .use(validateBody(updateAudioSchema))
    .handle(async (req) => {
        const user = req.user as UserResponse;
        const payload = req.body as UpdateAudioSchema;

        const audio = await audioService.updateAudio(
            user.id,
            parseAudioId(req.nextUrl.pathname),
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Audio updated successfully",
            data: audio,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as UserResponse;

        const result = await audioService.deleteAudio(
            user.id,
            parseAudioId(req.nextUrl.pathname)
        );

        return NextResponse.json({
            success: true,
            message: "Audio deleted successfully",
            data: result,
        });
    });
