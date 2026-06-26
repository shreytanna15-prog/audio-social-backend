import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const { password, ...user } = req.user as User;

        return NextResponse.json({
            success: true,
            message: "Profile fetched successfully",
            data: user,
        });
    });
