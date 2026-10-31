import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import {
    createConversationRequestSchema,
    type CreateConversationRequestSchema,
} from "@/server/modules/conversation/conversation.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(createConversationRequestSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateConversationRequestSchema;
        const result = await conversationService.createRequest(
            user.id,
            payload
        );

        return NextResponse.json(
            {
                success: true,
                message: "Message request created successfully",
                data: result,
            },
            { status: 201 }
        );
    });
