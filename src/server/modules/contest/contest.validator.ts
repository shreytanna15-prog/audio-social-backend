import { z } from "@/server/lib/zod";
import { TRACK_GENRES } from "@/server/constants/track-genres";
import { RESULTS_VISIBLE_DAYS } from "./contest.phase";

const trackGenreIdSchema = z.enum(TRACK_GENRES);

const genreIdsSchema = z
    .array(trackGenreIdSchema)
    .min(1)
    .max(5)
    .refine((ids) => new Set(ids).size === ids.length, {
        message: "genreIds must be unique",
    });

const resultsVisibleDaysSchema = z
    .number()
    .int()
    .refine((n): n is (typeof RESULTS_VISIBLE_DAYS)[number] =>
        (RESULTS_VISIBLE_DAYS as readonly number[]).includes(n)
    );

const datetimeSchema = z.coerce.date();

function assertTimestampOrder(data: {
    announceAt: Date;
    submitStartAt: Date;
    submitEndAt: Date;
    voteEndAt: Date;
}) {
    return (
        data.announceAt <= data.submitStartAt &&
        data.submitStartAt < data.submitEndAt &&
        data.submitEndAt < data.voteEndAt
    );
}

export const createContestSchema = z
    .object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(5000),
        rules: z.string().trim().min(1).max(10000),
        genreIds: genreIdsSchema,
        prizeNote: z.string().trim().min(1).max(2000),
        placementMode: z.enum(["FIRST", "TOP_THREE"]),
        payoutMode: z.enum(["MANUAL", "AUTO"]),
        prizeCoinsFirst: z.number().int().min(0).max(1_000_000),
        prizeCoinsSecond: z.number().int().min(0).max(1_000_000).optional().nullable(),
        prizeCoinsThird: z.number().int().min(0).max(1_000_000).optional().nullable(),
        announceAt: datetimeSchema,
        submitStartAt: datetimeSchema,
        submitEndAt: datetimeSchema,
        voteEndAt: datetimeSchema,
        resultsVisibleDays: resultsVisibleDaysSchema.default(15),
    })
    .superRefine((data, ctx) => {
        if (!assertTimestampOrder(data)) {
            ctx.addIssue({
                code: "custom",
                message:
                    "Require announceAt <= submitStartAt < submitEndAt < voteEndAt",
                path: ["submitStartAt"],
            });
        }
        if (data.placementMode === "TOP_THREE") {
            if (data.prizeCoinsSecond == null) {
                ctx.addIssue({
                    code: "custom",
                    message: "prizeCoinsSecond is required for TOP_THREE",
                    path: ["prizeCoinsSecond"],
                });
            }
            if (data.prizeCoinsThird == null) {
                ctx.addIssue({
                    code: "custom",
                    message: "prizeCoinsThird is required for TOP_THREE",
                    path: ["prizeCoinsThird"],
                });
            }
        }
    })
    .openapi("CreateContestBody");

export type CreateContestSchema = z.infer<typeof createContestSchema>;

export const patchContestSchema = z
    .object({
        title: z.string().trim().min(1).max(120).optional(),
        description: z.string().trim().min(1).max(5000).optional(),
        rules: z.string().trim().min(1).max(10000).optional(),
        genreIds: genreIdsSchema.optional(),
        prizeNote: z.string().trim().min(1).max(2000).optional(),
        placementMode: z.enum(["FIRST", "TOP_THREE"]).optional(),
        payoutMode: z.enum(["MANUAL", "AUTO"]).optional(),
        prizeCoinsFirst: z.number().int().min(0).max(1_000_000).optional(),
        prizeCoinsSecond: z
            .number()
            .int()
            .min(0)
            .max(1_000_000)
            .nullable()
            .optional(),
        prizeCoinsThird: z
            .number()
            .int()
            .min(0)
            .max(1_000_000)
            .nullable()
            .optional(),
        announceAt: datetimeSchema.optional(),
        submitStartAt: datetimeSchema.optional(),
        submitEndAt: datetimeSchema.optional(),
        voteEndAt: datetimeSchema.optional(),
        resultsVisibleDays: resultsVisibleDaysSchema.optional(),
    })
    .openapi("PatchContestBody");

export type PatchContestSchema = z.infer<typeof patchContestSchema>;

export const adminListContestsQuerySchema = z
    .object({
        phase: z
            .enum(["all", "upcoming", "active", "closed", "cancelled"])
            .default("all"),
    })
    .openapi("AdminListContestsQuery");

export type AdminListContestsQuerySchema = z.infer<
    typeof adminListContestsQuerySchema
>;

export const userListContestsQuerySchema = z
    .object({
        tab: z.enum(["upcoming", "active", "closed"]).default("active"),
    })
    .openapi("UserListContestsQuery");

export type UserListContestsQuerySchema = z.infer<
    typeof userListContestsQuerySchema
>;

export const contestEntriesQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .openapi("ContestEntriesQuery");

export type ContestEntriesQuerySchema = z.infer<
    typeof contestEntriesQuerySchema
>;

export const submitContestEntrySchema = z
    .object({
        trackId: z.uuid("Invalid track id"),
    })
    .openapi("SubmitContestEntryBody");

export type SubmitContestEntrySchema = z.infer<typeof submitContestEntrySchema>;

export const castContestVoteSchema = z
    .object({
        entryId: z.uuid("Invalid entry id"),
    })
    .openapi("CastContestVoteBody");

export type CastContestVoteSchema = z.infer<typeof castContestVoteSchema>;
