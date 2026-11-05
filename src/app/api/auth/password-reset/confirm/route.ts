import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { validateBody } from "@/server/middlewares/validate";
import { passwordResetService } from "@/server/modules/auth/password-reset.service";
import {
    confirmPasswordResetSchema,
    type ConfirmPasswordResetSchema,
} from "@/server/modules/auth/auth.validator";

export const POST = route()
    .use(validateBody(confirmPasswordResetSchema))
    .handle(async (req) => {
        const payload = req.body as ConfirmPasswordResetSchema;
        const data = await passwordResetService.confirmReset(payload);

        return NextResponse.json({
            success: true,
            message: "Password updated successfully",
            data,
        });
    });
