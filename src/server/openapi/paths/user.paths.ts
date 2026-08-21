import { bearerSecurity, registry, standardErrorResponses } from "@/server/openapi/registry";
import { userSuccessResponseSchema } from "@/server/openapi/schemas";

registry.registerPath({
    method: "get",
    path: "/api/user",
    tags: ["User"],
    summary: "Get current user",
    description: "Return the authenticated user's profile (password omitted).",
    security: [...bearerSecurity],
    responses: {
        200: {
            description: "Profile fetched successfully",
            content: {
                "application/json": {
                    schema: userSuccessResponseSchema,
                },
            },
        },
        ...standardErrorResponses,
    },
});
