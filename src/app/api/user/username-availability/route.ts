import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { userService } from "@/server/modules/user/user.service";
import {
    usernameAvailabilityQuerySchema,
    type UsernameAvailabilityQuerySchema,
} from "@/server/modules/user/profile.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(usernameAvailabilityQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as UsernameAvailabilityQuerySchema;
        const data = await userService.checkUsernameAvailability(
            user.id,
            query.username
        );

        return NextResponse.json({
            success: true,
            message: "Username availability checked",
            data,
        });
    });
