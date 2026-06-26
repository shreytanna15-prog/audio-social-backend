import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { audioService } from "@/server/modules/audio/audio.service";
import {
    CreateAudioSchema,
    createAudioSchema,
    ListAudiosQuerySchema,
    listAudiosQuerySchema,
} from "@/server/modules/audio/audio.validator";
import type { UserResponse } from "@/server/modules/auth/auth.service";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(listAudiosQuerySchema))
    .handle(async (req) => {
        const user = req.user as UserResponse;
        const query = req.localsQuery as ListAudiosQuerySchema;

        const audios = await audioService.listAudios(user.id, query);

        return NextResponse.json({
            success: true,
            message: "Audios fetched successfully",
            data: audios,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(createAudioSchema))
    .handle(async (req) => {
        const user = req.user as UserResponse;
        const payload = req.body as CreateAudioSchema;

        const result = await audioService.createAudio(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Audio created successfully",
                data: result,
            },
            { status: 201 }
        );
    });
