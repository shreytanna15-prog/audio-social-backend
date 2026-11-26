import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { feedClipService } from "@/server/modules/feed/feed-clip.service";
import {
    createFeedClipSchema,
    type CreateFeedClipSchema,
} from "@/server/modules/feed/feed.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(createFeedClipSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateFeedClipSchema;
        const data = await feedClipService.createOrReplace(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Feed clip saved successfully",
                data,
            },
            { status: 201 }
        );
    });
