import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { userService } from "@/server/modules/user/user.service";
import {
    profileMediaCompleteSchema,
    type ProfileMediaCompleteSchema,
} from "@/server/modules/user/profile.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(profileMediaCompleteSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as ProfileMediaCompleteSchema;
        const data = await userService.completeAvatarUpload(user.id, payload);

        return NextResponse.json({
            success: true,
            message: "Avatar updated successfully",
            data,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const data = await userService.deleteAvatar(user.id);

        return NextResponse.json({
            success: true,
            message: "Avatar removed successfully",
            data,
        });
    });
