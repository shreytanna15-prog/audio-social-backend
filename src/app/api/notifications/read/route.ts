import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { notificationService } from "@/server/modules/notification/notification.service";
import {
    markNotificationsReadSchema,
    type MarkNotificationsReadSchema,
} from "@/server/modules/notification/notification.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(markNotificationsReadSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as MarkNotificationsReadSchema;
        const data = await notificationService.markRead(user.id, payload);

        return NextResponse.json({
            success: true,
            message: "Notifications marked as read",
            data,
        });
    });
