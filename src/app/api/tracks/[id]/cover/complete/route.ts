import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { trackService } from "@/server/modules/track/track.service";
import {
    trackCoverCompleteSchema,
    type TrackCoverCompleteSchema,
} from "@/server/modules/track/track.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(trackCoverCompleteSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 2);
        const payload = req.body as TrackCoverCompleteSchema;
        const data = await trackService.completeCoverUpload(
            user.id,
            trackId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Cover uploaded successfully",
            data,
        });
    });
