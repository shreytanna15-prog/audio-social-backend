import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { projectService } from "@/server/modules/project/project.service";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const project = await projectService.getLatestProject(user.id);

        return NextResponse.json({
            success: true,
            message: project
                ? "Latest project fetched successfully"
                : "No projects yet",
            data: project,
        });
    });
