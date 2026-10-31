import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const conversationId = parsePathUuid(
            req.nextUrl.pathname,
            "conversation ID",
            1
        );
        const result = await conversationService.accept(
            user.id,
            conversationId
        );

        return NextResponse.json({
            success: true,
            message: "Conversation accepted",
            data: result,
        });
    });
