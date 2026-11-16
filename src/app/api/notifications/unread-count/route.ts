import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { notificationService } from "@/server/modules/notification/notification.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const data = await notificationService.getUnreadCount(user.id);

        return NextResponse.json({
            success: true,
            message: "Unread notification count fetched successfully",
            data,
        });
    });
