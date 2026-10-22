import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { trackService } from "@/server/modules/track/track.service";
import { createUploadUrlsSchema } from "@/server/modules/track/track.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(createUploadUrlsSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const data = await trackService.createUploadUrls(user.id);

        return NextResponse.json({
            success: true,
            message: "Upload URLs created successfully",
            data,
        });
    });
