import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import {
    listMessagesQuerySchema,
    sendTextMessageSchema,
    type ListMessagesQuerySchema,
    type SendTextMessageSchema,
} from "@/server/modules/conversation/conversation.validator";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(listMessagesQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const conversationId = parsePathUuid(
            req.nextUrl.pathname,
            "conversation ID",
            1
        );
        const query = req.localsQuery as ListMessagesQuerySchema;
        const result = await conversationService.listMessages(
            user.id,
            conversationId,
            query
        );

        return NextResponse.json({
            success: true,
            message: "Messages fetched successfully",
            data: result,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(sendTextMessageSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const conversationId = parsePathUuid(
            req.nextUrl.pathname,
            "conversation ID",
            1
        );
        const payload = req.body as SendTextMessageSchema;
        const message = await conversationService.sendText(
            user.id,
            conversationId,
            payload
        );

        return NextResponse.json(
            {
                success: true,
                message: "Message sent successfully",
                data: message,
            },
            { status: 201 }
        );
    });
