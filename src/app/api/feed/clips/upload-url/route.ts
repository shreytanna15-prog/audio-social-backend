import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { feedClipService } from "@/server/modules/feed/feed-clip.service";
import {
    feedClipUploadUrlSchema,
    type FeedClipUploadUrlSchema,
} from "@/server/modules/feed/feed.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(feedClipUploadUrlSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as FeedClipUploadUrlSchema;
        const data = await feedClipService.createUploadUrl(
            user.id,
            payload.trackId
        );

        return NextResponse.json(
            {
                success: true,
                message: "Feed clip upload URL created successfully",
                data,
            },
            { status: 201 }
        );
    });
