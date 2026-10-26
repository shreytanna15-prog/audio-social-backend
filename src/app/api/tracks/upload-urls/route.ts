import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { trackService } from "@/server/modules/track/track.service";
import {
    createUploadUrlsSchema,
    type CreateUploadUrlsSchema,
} from "@/server/modules/track/track.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(createUploadUrlsSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateUploadUrlsSchema;
        const result = await trackService.createUploadUrls(user.id, payload);

        return NextResponse.json({
            success: true,
            message: "Upload URLs created successfully",
            data: result,
        });
    });
