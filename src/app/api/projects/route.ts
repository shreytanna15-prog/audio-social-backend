import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { projectService } from "@/server/modules/project/project.service";
import {
    createProjectSchema,
    type CreateProjectSchema,
} from "@/server/modules/project/project.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const projects = await projectService.listProjects(user.id);

        return NextResponse.json({
            success: true,
            message: "Projects fetched successfully",
            data: projects,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(createProjectSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateProjectSchema;
        const project = await projectService.createProject(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Project created successfully",
                data: project,
            },
            { status: 201 }
        );
    });
