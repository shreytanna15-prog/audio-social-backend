import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { userService } from "@/server/modules/user/user.service";
import {
    profileMediaUploadUrlSchema,
    type ProfileMediaUploadUrlSchema,
} from "@/server/modules/user/profile.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(profileMediaUploadUrlSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as ProfileMediaUploadUrlSchema;
        const data = await userService.createAvatarUploadUrl(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Avatar upload URL created successfully",
                data,
            },
            { status: 201 }
        );
    });
