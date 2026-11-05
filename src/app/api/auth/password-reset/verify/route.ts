import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateBody } from "@/server/middlewares/validate";
import { passwordResetService } from "@/server/modules/auth/password-reset.service";
import {
    verifyPasswordResetOtpSchema,
    type VerifyPasswordResetOtpSchema,
} from "@/server/modules/auth/auth.validator";

export const POST = route()
    .use(validateBody(verifyPasswordResetOtpSchema))
    .handle(async (req) => {
        const payload = req.body as VerifyPasswordResetOtpSchema;
        const data = await passwordResetService.verifyOtp(payload);

        return NextResponse.json({
            success: true,
            message: "Code verified successfully",
            data,
        });
    });
