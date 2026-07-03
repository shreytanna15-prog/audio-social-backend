import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";

import { authService } from "@/server/modules/auth/auth.service";
import { signupSchema, SignupSchema } from "@/server/modules/auth/auth.validator";
import { validateBody } from "@/server/middlewares/validate";


export const POST = route()
    .use(validateBody(signupSchema))
    .handle(async (req) => {
        const payload = req.body as SignupSchema;

        const result = await authService.signup(payload);

        return NextResponse.json({
            success: true,
            message: "Signup successful",
            data: result,
        });
    });
