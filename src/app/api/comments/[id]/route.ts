import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { parsePathUuid } from "@/server/lib/parse-path-uuid";
import { commentService } from "@/server/modules/comment/comment.service";
import type { User } from "@/generated/prisma/client";

export const DELETE = route()
    .use(withAuth)
    .handle(async (req) => {
        const user = req.user as User;
        const commentId = parsePathUuid(req.nextUrl.pathname, "comment ID");
        const data = await commentService.deleteComment(user.id, commentId);

        return NextResponse.json({
            success: true,
            message: "Comment deleted successfully",
            data,
        });
    });
