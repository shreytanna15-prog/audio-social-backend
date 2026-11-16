import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateQuery } from "@/server/middlewares/validate";
import { notificationService } from "@/server/modules/notification/notification.service";
import {
    listNotificationsQuerySchema,
    type ListNotificationsQuerySchema,
} from "@/server/modules/notification/notification.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(listNotificationsQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const query = req.localsQuery as ListNotificationsQuerySchema;
        const data = await notificationService.listNotifications(
            user.id,
            query
        );

        return NextResponse.json({
            success: true,
            message: "Notifications fetched successfully",
            data,
        });
    });
