import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { userService } from "@/server/modules/user/user.service";
import {
    patchProfileSchema,
    type PatchProfileSchema,
} from "@/server/modules/user/profile.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const data = await userService.getMe(user.id);

        return NextResponse.json({
            success: true,
            message: "Profile fetched successfully",
            data,
        });
    });

export const PATCH = route()
    .use(withAuth)
    .use(validateBody(patchProfileSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as PatchProfileSchema;
        const data = await userService.patchProfile(user.id, payload);

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully",
            data,
        });
    });
