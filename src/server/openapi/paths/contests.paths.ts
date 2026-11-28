import { z } from "@/server/lib/zod";
import {
    bearerSecurity,
    registry,
    standardErrorResponses,
    successResponseSchema,
} from "@/server/openapi/registry";
import {
    adminListContestsQuerySchema,
    castContestVoteSchema,
    contestEntriesQuerySchema,
    createContestSchema,
    patchContestSchema,
    submitContestEntrySchema,
    userListContestsQuerySchema,
} from "@/server/modules/contest/contest.validator";

const phaseSchema = z.enum([
    "upcoming",
    "announce",
    "submit",
    "vote",
    "closed",
    "cancelled",
]);

const contestSummarySchema = z
    .object({
        id: z.uuid(),
        title: z.string(),
        description: z.string(),
        rules: z.string(),
        genreIds: z.array(z.string()),
        prizeNote: z.string(),
        placementMode: z.enum(["FIRST", "TOP_THREE"]),
        payoutMode: z.enum(["MANUAL", "AUTO"]),
        prizeCoinsFirst: z.number().int(),
        prizeCoinsSecond: z.number().int().nullable(),
        prizeCoinsThird: z.number().int().nullable(),
        resultsVisibleDays: z.number().int(),
        phase: phaseSchema,
        announceAt: z.iso.datetime(),
        submitStartAt: z.iso.datetime(),
        submitEndAt: z.iso.datetime(),
        voteEndAt: z.iso.datetime(),
        entryCount: z.number().int(),
        voteCount: z.number().int(),
        winnersConfirmed: z.boolean(),
        cancelled: z.boolean(),
    })
    .openapi("ContestSummary");

const contestDetailSchema = contestSummarySchema
    .extend({
        hasEntered: z.boolean(),
        hasVoted: z.boolean(),
        myEntryId: z.uuid().nullable(),
    })
    .openapi("ContestDetail");

registry.registerPath({
    method: "get",
    path: "/api/admin/contests",
    tags: ["Admin Contests"],
    summary: "List contests (admin)",
    security: bearerSecurity,
    request: { query: adminListContestsQuerySchema },
    responses: {
        200: {
            description: "Contests fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.array(contestSummarySchema),
                        "AdminContestsListSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/admin/contests",
    tags: ["Admin Contests"],
    summary: "Create contest",
    security: bearerSecurity,
    request: {
        body: {
            content: { "application/json": { schema: createContestSchema } },
        },
    },
    responses: {
        201: {
            description: "Contest created successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        contestSummarySchema,
                        "AdminContestCreateSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/admin/contests/{id}",
    tags: ["Admin Contests"],
    summary: "Get contest detail (admin)",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
    },
    responses: {
        200: {
            description: "Contest fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.object({
                            contest: contestSummarySchema,
                            ranking: z.array(z.unknown()).nullable(),
                        }),
                        "AdminContestDetailSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "patch",
    path: "/api/admin/contests/{id}",
    tags: ["Admin Contests"],
    summary: "Update contest",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
        body: {
            content: { "application/json": { schema: patchContestSchema } },
        },
    },
    responses: {
        200: {
            description: "Contest updated successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        contestSummarySchema,
                        "AdminContestPatchSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/admin/contests/{id}/cancel",
    tags: ["Admin Contests"],
    summary: "Cancel contest",
    security: bearerSecurity,
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
        200: {
            description: "Contest cancelled successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        contestSummarySchema,
                        "AdminContestCancelSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/admin/contests/{id}/confirm-winners",
    tags: ["Admin Contests"],
    summary: "Confirm winners (MANUAL payout)",
    security: bearerSecurity,
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
        200: {
            description: "Winners confirmed successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.object({
                            contest: contestSummarySchema,
                            ranking: z.array(z.unknown()),
                        }),
                        "AdminContestConfirmSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/contests",
    tags: ["Contests"],
    summary: "List contests for app",
    security: bearerSecurity,
    request: { query: userListContestsQuerySchema },
    responses: {
        200: {
            description: "Contests fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.array(contestSummarySchema),
                        "ContestsListSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/contests/{id}",
    tags: ["Contests"],
    summary: "Get contest detail",
    security: bearerSecurity,
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
        200: {
            description: "Contest fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        contestDetailSchema,
                        "ContestDetailSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/contests/{id}/entries",
    tags: ["Contests"],
    summary: "List contest entries",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
        query: contestEntriesQuerySchema,
    },
    responses: {
        200: {
            description: "Contest entries fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.object({
                            items: z.array(z.unknown()),
                            nextCursor: z.uuid().nullable(),
                        }),
                        "ContestEntriesSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/contests/{id}/entries",
    tags: ["Contests"],
    summary: "Submit contest entry",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
        body: {
            content: {
                "application/json": { schema: submitContestEntrySchema },
            },
        },
    },
    responses: {
        201: {
            description: "Entry submitted successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.unknown(),
                        "ContestEntryCreateSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "post",
    path: "/api/contests/{id}/votes",
    tags: ["Contests"],
    summary: "Cast contest vote",
    security: bearerSecurity,
    request: {
        params: z.object({ id: z.uuid() }),
        body: {
            content: {
                "application/json": { schema: castContestVoteSchema },
            },
        },
    },
    responses: {
        201: {
            description: "Vote cast successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.object({ entryId: z.uuid() }),
                        "ContestVoteSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/contests/{id}/leaderboard",
    tags: ["Contests"],
    summary: "Contest leaderboard (Closed only)",
    security: bearerSecurity,
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
        200: {
            description: "Leaderboard fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.array(z.unknown()),
                        "ContestLeaderboardSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});

registry.registerPath({
    method: "get",
    path: "/api/contests/{id}/eligible-tracks",
    tags: ["Contests"],
    summary: "Eligible tracks for submit",
    security: bearerSecurity,
    request: { params: z.object({ id: z.uuid() }) },
    responses: {
        200: {
            description: "Eligible tracks fetched successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema(
                        z.array(z.unknown()),
                        "ContestEligibleTracksSuccess"
                    ),
                },
            },
        },
        ...standardErrorResponses,
    },
});
