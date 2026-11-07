import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { saveService } from "@/server/modules/save/save.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const data = await saveService.listSavedPlaylists(user.id);

        return NextResponse.json({
            success: true,
            message: "Saved playlists fetched successfully",
            data,
        });
    });
