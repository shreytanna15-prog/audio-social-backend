import type { Contest } from "@/generated/prisma/client";

export type ContestPhase =
    | "upcoming"
    | "announce"
    | "submit"
    | "vote"
    | "closed"
    | "cancelled";

export const RESULTS_VISIBLE_DAYS = [5, 10, 15, 20, 25, 30] as const;
export type ResultsVisibleDays = (typeof RESULTS_VISIBLE_DAYS)[number];

export function deriveContestPhase(
    contest: Pick<
        Contest,
        | "announceAt"
        | "submitStartAt"
        | "submitEndAt"
        | "voteEndAt"
        | "cancelledAt"
    >,
    now = new Date()
): ContestPhase {
    if (contest.cancelledAt) {
        return "cancelled";
    }

    if (now < contest.announceAt) {
        return "upcoming";
    }
    if (now < contest.submitStartAt) {
        return "announce";
    }
    if (now < contest.submitEndAt) {
        return "submit";
    }
    if (now < contest.voteEndAt) {
        return "vote";
    }
    return "closed";
}

export function resultsVisibleUntil(
    voteEndAt: Date,
    resultsVisibleDays: number
): Date {
    return new Date(
        voteEndAt.getTime() + resultsVisibleDays * 24 * 60 * 60 * 1000
    );
}

export function isResultsStillVisible(
    contest: Pick<Contest, "voteEndAt" | "resultsVisibleDays" | "cancelledAt">,
    now = new Date()
): boolean {
    if (contest.cancelledAt) {
        return false;
    }
    return now < resultsVisibleUntil(contest.voteEndAt, contest.resultsVisibleDays);
}

/** Unsettled + not cancelled = track remains locked / "active contest" for a track. */
export function isContestLockingTracks(
    contest: Pick<Contest, "cancelledAt" | "winnersConfirmedAt">
): boolean {
    return contest.cancelledAt == null && contest.winnersConfirmedAt == null;
}
