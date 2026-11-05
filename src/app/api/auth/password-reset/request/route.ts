import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateBody } from "@/server/middlewares/validate";
import { passwordResetService } from "@/server/modules/auth/password-reset.service";
import {
    requestPasswordResetSchema,
    type RequestPasswordResetSchema,
} from "@/server/modules/auth/auth.validator";

export const POST = route()
    .use(validateBody(requestPasswordResetSchema))
    .handle(async (req) => {
        const payload = req.body as RequestPasswordResetSchema;
        const data = await passwordResetService.requestReset(payload);

        return NextResponse.json({
            success: true,
            message:
                "If an account exists for that email, a reset code has been sent",
            data,
        });
    });
