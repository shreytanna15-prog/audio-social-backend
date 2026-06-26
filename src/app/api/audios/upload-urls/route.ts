import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { audioService } from "@/server/modules/audio/audio.service";
import type { UserResponse } from "@/server/modules/auth/auth.service";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as UserResponse;

        const result = await audioService.createUploadUrls(user.id);

        return NextResponse.json({
            success: true,
            message: "Upload URLs created successfully",
            data: result,
        });
    });
