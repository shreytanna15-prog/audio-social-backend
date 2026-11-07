import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody, validateQuery } from "@/server/middlewares/validate";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { commentService } from "@/server/modules/comment/comment.service";
import {
    createCommentSchema,
    listCommentsQuerySchema,
    type CreateCommentSchema,
    type ListCommentsQuerySchema,
} from "@/server/modules/comment/comment.validator";
import type { User } from "@/generated/prisma/client";

export const GET = route()
    .use(withAuth)
    .use(validateQuery(listCommentsQuerySchema))
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 1);
        const query = req.localsQuery as ListCommentsQuerySchema;
        const data = await commentService.listComments(
            user.id,
            trackId,
            query.sort
        );

        return NextResponse.json({
            success: true,
            message: "Comments fetched successfully",
            data,
        });
    });

export const POST = route()
    .use(withAuth)
    .use(validateBody(createCommentSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const trackId = parsePathUuid(req.nextUrl.pathname, "track ID", 1);
        const payload = req.body as CreateCommentSchema;
        const data = await commentService.createComment(
            user.id,
            trackId,
            payload
        );

        return NextResponse.json(
            {
                success: true,
                message: "Comment created successfully",
                data,
            },
            { status: 201 }
        );
    });
