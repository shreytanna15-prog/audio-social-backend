import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { trackService } from "@/server/modules/track/track.service";
import {
    trackCoverUploadUrlSchema,
    type TrackCoverUploadUrlSchema,
} from "@/server/modules/track/track.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(trackCoverUploadUrlSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 2);
        const payload = req.body as TrackCoverUploadUrlSchema;
        const data = await trackService.createCoverUploadUrl(
            user.id,
            trackId,
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
