import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";

import { authService } from "@/server/modules/auth/auth.service";
import { LoginSchema, loginSchema } from "@/server/modules/auth/auth.validator";
import { validateBody } from "@/server/middlewares/validate";


export const POST = route()
    .use(validateBody(loginSchema))
    .handle(async (req) => {
        const payload = req.body as LoginSchema;

        const result = await authService.login(payload);

        return NextResponse.json({
            success: true,
            message: "Login successful",
            data: result,
        });
    });
