import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const requests = await conversationService.listRequests(user.id);

        return NextResponse.json({
            success: true,
            message: "Message requests fetched successfully",
            data: requests,
        });
    });
