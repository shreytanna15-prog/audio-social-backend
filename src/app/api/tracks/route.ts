import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { trackService } from "@/server/modules/track/track.service";
import {
    createTrackSchema,
    listTracksQuerySchema,
    type CreateTrackSchema,
    type ListTracksQuerySchema,
} from "@/server/modules/track/track.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(listTracksQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as ListTracksQuerySchema;
        const tracks = await trackService.listTracks(user.id, query);

        return NextResponse.json({
            success: true,
            message: "Tracks fetched successfully",
            data: tracks,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(createTrackSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateTrackSchema;
        const result = await trackService.createTrack(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Track created successfully",
                data: result,
            },
            { status: 201 }
        );
    });
