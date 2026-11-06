import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { projectService } from "@/server/modules/project/project.service";
import {
    attachProjectTracksSchema,
    type AttachProjectTracksSchema,
} from "@/server/modules/project/project.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(attachProjectTracksSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const projectId = parsePathUuid(
            req.nextUrl.pathname,
            "project ID",
            1
        );
        const payload = req.body as AttachProjectTracksSchema;
        const result = await projectService.attachTracks(
            user.id,
            projectId,
            payload
        );

        return NextResponse.json({
            success: true,
            message: "Tracks attached successfully",
            data: result,
        });
    });
