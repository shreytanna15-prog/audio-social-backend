import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { conversationService } from "@/server/modules/conversation/conversation.service";
import {
    sendAudioMessageSchema,
    type SendAudioMessageSchema,
} from "@/server/modules/conversation/conversation.validator";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(sendAudioMessageSchema))
    .handle(async (req) => {
        const user = req.user as User;
        // /api/conversations/{id}/messages/audio → offset 2 from end
        const conversationId = parsePathUuid(
            req.nextUrl.pathname,
            "conversation ID",
            2
        );
        const payload = req.body as SendAudioMessageSchema;
        const message = await conversationService.sendAudio(
            user.id,
            conversationId,
            payload
        );

        return NextResponse.json(
            {
                success: true,
                message: "Voice note sent successfully",
                data: message,
            },
            { status: 201 }
        );
    });
