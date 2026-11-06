import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { projectService } from "@/server/modules/project/project.service";
import {
    deleteProjectQuerySchema,
    updateProjectSchema,
    type DeleteProjectQuerySchema,
    type UpdateProjectSchema,
} from "@/server/modules/project/project.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const projectId = parsePathUuid(req.nextUrl.pathname, "project ID");
        const project = await projectService.getProject(user.id, projectId);

        return NextResponse.json({
            success: true,
            message: "Project fetched successfully",
            data: project,
        });
    });

export const PATCH = route()
    .use(withAuth)
    .use(validateBody(updateProjectSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const projectId = parsePathUuid(req.nextUrl.pathname, "project ID");
        const payload = req.body as UpdateProjectSchema;
        const project = await projectService.updateProject(
            user.id,
            projectId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Project updated successfully",
            data: project,
        });
    });

export const DELETE = route()
    .use(withAuth)
    .use(validateQuery(deleteProjectQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const projectId = parsePathUuid(req.nextUrl.pathname, "project ID");
        const query = req.localsQuery as DeleteProjectQuerySchema;
        const result = await projectService.deleteProject(
            user.id,
            projectId,
            query.deleteTracks ?? false
        );

        return NextResponse.json({
            success: true,
            message: "Project deleted successfully",
            data: result,
        });
    });
