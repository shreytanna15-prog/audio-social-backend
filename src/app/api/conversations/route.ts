import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const conversations = await conversationService.listInbox(user.id);

        return NextResponse.json({
            success: true,
            message: "Conversations fetched successfully",
            data: conversations,
        });
    });
