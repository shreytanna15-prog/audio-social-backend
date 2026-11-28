import {
    ContestPayoutMode,
    ContestPlacementMode,
    CoinTransactionType,
    TrackStatus,
    type Contest,
    type ContestEntry,
} from "@/generated/prisma/client";
import { prisma } from "@/server/config/prisma";
import { publicUrl } from "@/server/config/r2";
import { AppError } from "@/server/utils/global-error";
import { walletService } from "@/server/modules/wallet/wallet.service";
import {
    deriveContestPhase,
    isContestLockingTracks,
    isResultsStillVisible,
    type ContestPhase,
} from "./contest.phase";
import type {
    AdminListContestsQuerySchema,
    CastContestVoteSchema,
    ContestEntriesQuerySchema,
    CreateContestSchema,
    PatchContestSchema,
    SubmitContestEntrySchema,
    UserListContestsQuerySchema,
} from "./contest.validator";

export type ContestSummaryDto = {
    id: string;
    title: string;
    description: string;
    rules: string;
    genreIds: string[];
    prizeNote: string;
    placementMode: ContestPlacementMode;
    payoutMode: ContestPayoutMode;
    prizeCoinsFirst: number;
    prizeCoinsSecond: number | null;
    prizeCoinsThird: number | null;
    resultsVisibleDays: number;
    phase: ContestPhase;
    announceAt: string;
    submitStartAt: string;
    submitEndAt: string;
    voteEndAt: string;
    entryCount: number;
    voteCount: number;
    winnersConfirmed: boolean;
    cancelled: boolean;
};

export type ContestDetailDto = ContestSummaryDto & {
    hasEntered: boolean;
    hasVoted: boolean;
    myEntryId: string | null;
};

export type ContestEntryDto = {
    id: string;
    contestId: string;
    userId: string;
    trackId: string;
    createdAt: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    trackTitle: string;
    trackCoverUrl: string | null;
    voteCount?: number;
    placeBand?: 1 | 2 | 3 | null;
};

export type LeaderboardRowDto = ContestEntryDto & {
    voteCount: number;
    placeBand: 1 | 2 | 3 | null;
    prizeCoins: number;
};

export type EligibleTrackDto = {
    id: string;
    title: string;
    coverUrl: string | null;
    genres: string[];
    publishedAt: string | null;
};

type RankedEntry = {
    entry: ContestEntry & {
        user: { id: string; username: string; name: string | null; avatarPath: string | null };
        track: { id: string; title: string; coverPath: string | null };
        _count: { votes: number };
    };
    voteCount: number;
    placeBand: 1 | 2 | 3 | null;
    prizeCoins: number;
};

function toSummary(
    contest: Contest,
    entryCount: number,
    voteCount: number,
    now = new Date()
): ContestSummaryDto {
    return {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        rules: contest.rules,
        genreIds: contest.genreIds,
        prizeNote: contest.prizeNote,
        placementMode: contest.placementMode,
        payoutMode: contest.payoutMode,
        prizeCoinsFirst: contest.prizeCoinsFirst,
        prizeCoinsSecond: contest.prizeCoinsSecond,
        prizeCoinsThird: contest.prizeCoinsThird,
        resultsVisibleDays: contest.resultsVisibleDays,
        phase: deriveContestPhase(contest, now),
        announceAt: contest.announceAt.toISOString(),
        submitStartAt: contest.submitStartAt.toISOString(),
        submitEndAt: contest.submitEndAt.toISOString(),
        voteEndAt: contest.voteEndAt.toISOString(),
        entryCount,
        voteCount,
        winnersConfirmed: contest.winnersConfirmedAt != null,
        cancelled: contest.cancelledAt != null,
    };
}

function hasGenreOverlap(contestGenres: string[], trackGenres: string[]): boolean {
    const set = new Set(contestGenres);
    return trackGenres.some((g) => set.has(g));
}

function prizeForBand(
    contest: Contest,
    band: 1 | 2 | 3 | null
): number {
    if (band === 1) return contest.prizeCoinsFirst;
    if (band === 2) return contest.prizeCoinsSecond ?? 0;
    if (band === 3) return contest.prizeCoinsThird ?? 0;
    return 0;
}

function assignDenseRanks(
    contest: Contest,
    entries: RankedEntry["entry"][]
): RankedEntry[] {
    const sorted = [...entries].sort((a, b) => {
        if (b._count.votes !== a._count.votes) {
            return b._count.votes - a._count.votes;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const maxBand =
        contest.placementMode === ContestPlacementMode.TOP_THREE ? 3 : 1;

    let lastVotes: number | null = null;
    let denseRank = 0;

    return sorted.map((entry) => {
        const voteCount = entry._count.votes;
        if (lastVotes === null || voteCount !== lastVotes) {
            denseRank += 1;
            lastVotes = voteCount;
        }
        const effectiveBand =
            denseRank <= maxBand ? (denseRank as 1 | 2 | 3) : null;

        return {
            entry,
            voteCount,
            placeBand: effectiveBand,
            prizeCoins: prizeForBand(contest, effectiveBand),
        };
    });
}

class ContestService {
    public async createContest(
        payload: CreateContestSchema
    ): Promise<ContestSummaryDto> {
        const contest = await prisma.contest.create({
            data: {
                title: payload.title,
                description: payload.description,
                rules: payload.rules,
                genreIds: payload.genreIds,
                prizeNote: payload.prizeNote,
                placementMode: payload.placementMode,
                payoutMode: payload.payoutMode,
                prizeCoinsFirst: payload.prizeCoinsFirst,
                prizeCoinsSecond:
                    payload.placementMode === "TOP_THREE"
                        ? (payload.prizeCoinsSecond ?? 0)
                        : null,
                prizeCoinsThird:
                    payload.placementMode === "TOP_THREE"
                        ? (payload.prizeCoinsThird ?? 0)
                        : null,
                announceAt: payload.announceAt,
                submitStartAt: payload.submitStartAt,
                submitEndAt: payload.submitEndAt,
                voteEndAt: payload.voteEndAt,
                resultsVisibleDays: payload.resultsVisibleDays,
            },
        });

        return toSummary(contest, 0, 0);
    }

    public async listAdmin(
        query: AdminListContestsQuerySchema
    ): Promise<ContestSummaryDto[]> {
        const contests = await prisma.contest.findMany({
            include: {
                _count: { select: { entries: true, votes: true } },
            },
            orderBy: { voteEndAt: "desc" },
        });

        const now = new Date();
        return contests
            .map((c) =>
                toSummary(c, c._count.entries, c._count.votes, now)
            )
            .filter((dto) => {
                if (query.phase === "all") return true;
                if (query.phase === "cancelled") return dto.phase === "cancelled";
                if (query.phase === "upcoming") {
                    return (
                        dto.phase === "upcoming" || dto.phase === "announce"
                    );
                }
                if (query.phase === "active") {
                    return dto.phase === "submit" || dto.phase === "vote";
                }
                if (query.phase === "closed") {
                    return dto.phase === "closed";
                }
                return true;
            });
    }

    public async getAdminDetail(contestId: string): Promise<{
        contest: ContestSummaryDto;
        ranking: LeaderboardRowDto[] | null;
    }> {
        const contest = await this.requireContest(contestId);
        const now = new Date();
        const phase = deriveContestPhase(contest, now);

        if (phase === "closed" && contest.payoutMode === ContestPayoutMode.AUTO) {
            await this.resolveClosedIfNeeded(contest);
        }

        const fresh = await this.requireContest(contestId);
        const counts = await prisma.contest.findUnique({
            where: { id: contestId },
            select: {
                _count: { select: { entries: true, votes: true } },
            },
        });

        const summary = toSummary(
            fresh,
            counts?._count.entries ?? 0,
            counts?._count.votes ?? 0,
            now
        );

        let ranking: LeaderboardRowDto[] | null = null;
        if (summary.phase === "closed") {
            ranking = await this.buildLeaderboard(fresh);
        }

        return { contest: summary, ranking };
    }

    public async patchContest(
        contestId: string,
        payload: PatchContestSchema
    ): Promise<ContestSummaryDto> {
        const contest = await this.requireContest(contestId);
        const now = new Date();

        if (contest.cancelledAt || contest.winnersConfirmedAt) {
            throw new AppError(
                "Cannot edit a cancelled or settled contest",
                400,
                "BAD_REQUEST"
            );
        }

        const beforeSubmit = now < contest.submitStartAt;
        const limitedKeys = new Set([
            "prizeNote",
            "payoutMode",
            "resultsVisibleDays",
        ]);

        if (!beforeSubmit) {
            for (const key of Object.keys(payload)) {
                if (
                    payload[key as keyof PatchContestSchema] !== undefined &&
                    !limitedKeys.has(key)
                ) {
                    throw new AppError(
                        "Only prizeNote, payoutMode, and resultsVisibleDays can be edited after submit starts",
                        400,
                        "BAD_REQUEST"
                    );
                }
            }
        }

        const nextAnnounce = payload.announceAt ?? contest.announceAt;
        const nextSubmitStart = payload.submitStartAt ?? contest.submitStartAt;
        const nextSubmitEnd = payload.submitEndAt ?? contest.submitEndAt;
        const nextVoteEnd = payload.voteEndAt ?? contest.voteEndAt;

        if (
            payload.announceAt ||
            payload.submitStartAt ||
            payload.submitEndAt ||
            payload.voteEndAt
        ) {
            if (
                !(
                    nextAnnounce <= nextSubmitStart &&
                    nextSubmitStart < nextSubmitEnd &&
                    nextSubmitEnd < nextVoteEnd
                )
            ) {
                throw new AppError(
                    "Require announceAt <= submitStartAt < submitEndAt < voteEndAt",
                    400,
                    "BAD_REQUEST"
                );
            }
        }

        const placementMode =
            payload.placementMode ?? contest.placementMode;
        let prizeCoinsSecond =
            payload.prizeCoinsSecond !== undefined
                ? payload.prizeCoinsSecond
                : contest.prizeCoinsSecond;
        let prizeCoinsThird =
            payload.prizeCoinsThird !== undefined
                ? payload.prizeCoinsThird
                : contest.prizeCoinsThird;

        if (placementMode === ContestPlacementMode.FIRST) {
            prizeCoinsSecond = null;
            prizeCoinsThird = null;
        } else if (
            prizeCoinsSecond == null ||
            prizeCoinsThird == null
        ) {
            throw new AppError(
                "prizeCoinsSecond and prizeCoinsThird are required for TOP_THREE",
                400,
                "BAD_REQUEST"
            );
        }

        const updated = await prisma.contest.update({
            where: { id: contestId },
            data: {
                ...(payload.title !== undefined ? { title: payload.title } : {}),
                ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
                ...(payload.rules !== undefined ? { rules: payload.rules } : {}),
                ...(payload.genreIds !== undefined
                    ? { genreIds: payload.genreIds }
                    : {}),
                ...(payload.prizeNote !== undefined
                    ? { prizeNote: payload.prizeNote }
                    : {}),
                ...(payload.placementMode !== undefined
                    ? { placementMode: payload.placementMode }
                    : {}),
                ...(payload.payoutMode !== undefined
                    ? { payoutMode: payload.payoutMode }
                    : {}),
                ...(payload.prizeCoinsFirst !== undefined
                    ? { prizeCoinsFirst: payload.prizeCoinsFirst }
                    : {}),
                prizeCoinsSecond,
                prizeCoinsThird,
                ...(payload.announceAt !== undefined
                    ? { announceAt: payload.announceAt }
                    : {}),
                ...(payload.submitStartAt !== undefined
                    ? { submitStartAt: payload.submitStartAt }
                    : {}),
                ...(payload.submitEndAt !== undefined
                    ? { submitEndAt: payload.submitEndAt }
                    : {}),
                ...(payload.voteEndAt !== undefined
                    ? { voteEndAt: payload.voteEndAt }
                    : {}),
                ...(payload.resultsVisibleDays !== undefined
                    ? { resultsVisibleDays: payload.resultsVisibleDays }
                    : {}),
            },
        });

        const counts = await prisma.contest.findUnique({
            where: { id: contestId },
            select: { _count: { select: { entries: true, votes: true } } },
        });

        return toSummary(
            updated,
            counts?._count.entries ?? 0,
            counts?._count.votes ?? 0
        );
    }

    public async cancelContest(contestId: string): Promise<ContestSummaryDto> {
        const contest = await this.requireContest(contestId);

        if (contest.cancelledAt) {
            throw new AppError("Contest already cancelled", 400, "BAD_REQUEST");
        }
        if (contest.winnersConfirmedAt) {
            throw new AppError(
                "Cannot cancel a settled contest",
                400,
                "BAD_REQUEST"
            );
        }

        const updated = await prisma.contest.update({
            where: { id: contestId },
            data: { cancelledAt: new Date() },
        });

        const counts = await prisma.contest.findUnique({
            where: { id: contestId },
            select: { _count: { select: { entries: true, votes: true } } },
        });

        return toSummary(
            updated,
            counts?._count.entries ?? 0,
            counts?._count.votes ?? 0
        );
    }

    public async confirmWinners(contestId: string): Promise<{
        contest: ContestSummaryDto;
        ranking: LeaderboardRowDto[];
    }> {
        const contest = await this.requireContest(contestId);
        const now = new Date();
        const phase = deriveContestPhase(contest, now);

        if (phase !== "closed") {
            throw new AppError(
                "Winners can only be confirmed after voting ends",
                400,
                "BAD_REQUEST"
            );
        }
        if (contest.payoutMode !== ContestPayoutMode.MANUAL) {
            throw new AppError(
                "Confirm winners is only for MANUAL payout contests",
                400,
                "BAD_REQUEST"
            );
        }
        if (contest.winnersConfirmedAt) {
            throw new AppError("Winners already confirmed", 400, "BAD_REQUEST");
        }

        await this.payWinnersAndSettle(contest);

        const fresh = await this.requireContest(contestId);
        const counts = await prisma.contest.findUnique({
            where: { id: contestId },
            select: { _count: { select: { entries: true, votes: true } } },
        });
        const ranking = await this.buildLeaderboard(fresh);

        return {
            contest: toSummary(
                fresh,
                counts?._count.entries ?? 0,
                counts?._count.votes ?? 0
            ),
            ranking,
        };
    }

    public async listForUser(
        query: UserListContestsQuerySchema
    ): Promise<ContestSummaryDto[]> {
        const contests = await prisma.contest.findMany({
            where: { cancelledAt: null },
            include: {
                _count: { select: { entries: true, votes: true } },
            },
            orderBy: { voteEndAt: "desc" },
        });

        const now = new Date();
        return contests
            .map((c) => toSummary(c, c._count.entries, c._count.votes, now))
            .filter((dto) => {
                if (query.tab === "upcoming") {
                    return (
                        dto.phase === "upcoming" || dto.phase === "announce"
                    );
                }
                if (query.tab === "active") {
                    return dto.phase === "submit" || dto.phase === "vote";
                }
                // closed: still within results window
                if (dto.phase !== "closed") return false;
                const row = contests.find((c) => c.id === dto.id)!;
                return isResultsStillVisible(row, now);
            });
    }

    public async getForUser(
        contestId: string,
        userId: string
    ): Promise<ContestDetailDto> {
        let contest = await this.requireContest(contestId);
        const now = new Date();
        let phase = deriveContestPhase(contest, now);

        if (phase === "closed" && contest.payoutMode === ContestPayoutMode.AUTO) {
            await this.resolveClosedIfNeeded(contest);
            contest = await this.requireContest(contestId);
            phase = deriveContestPhase(contest, now);
        }

        const [counts, myEntry, myVote] = await Promise.all([
            prisma.contest.findUnique({
                where: { id: contestId },
                select: { _count: { select: { entries: true, votes: true } } },
            }),
            prisma.contestEntry.findUnique({
                where: {
                    contestId_userId: { contestId, userId },
                },
                select: { id: true },
            }),
            prisma.contestVote.findUnique({
                where: {
                    contestId_userId: { contestId, userId },
                },
                select: { id: true },
            }),
        ]);

        const summary = toSummary(
            contest,
            counts?._count.entries ?? 0,
            counts?._count.votes ?? 0,
            now
        );

        return {
            ...summary,
            hasEntered: myEntry != null,
            hasVoted: myVote != null,
            myEntryId: myEntry?.id ?? null,
        };
    }

    public async listEntries(
        contestId: string,
        query: ContestEntriesQuerySchema
    ): Promise<{ items: ContestEntryDto[]; nextCursor: string | null }> {
        const contest = await this.requireContest(contestId);
        if (contest.cancelledAt) {
            throw new AppError("Contest cancelled", 404, "RESOURCE_NOT_FOUND");
        }

        const phase = deriveContestPhase(contest);
        const includeVotes = phase === "closed";

        let cursorCreatedAt: Date | undefined;
        if (query.cursor) {
            const cursorRow = await prisma.contestEntry.findFirst({
                where: { id: query.cursor, contestId },
                select: { createdAt: true },
            });
            if (!cursorRow) {
                throw new AppError("Invalid cursor", 400, "BAD_REQUEST");
            }
            cursorCreatedAt = cursorRow.createdAt;
        }

        const rows = await prisma.contestEntry.findMany({
            where: {
                contestId,
                ...(cursorCreatedAt
                    ? { createdAt: { lt: cursorCreatedAt } }
                    : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
                track: {
                    select: { id: true, title: true, coverPath: true },
                },
                _count: { select: { votes: true } },
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: query.limit + 1,
        });

        const hasNext = rows.length > query.limit;
        const page = hasNext ? rows.slice(0, query.limit) : rows;

        const items: ContestEntryDto[] = page.map((row) => ({
            id: row.id,
            contestId: row.contestId,
            userId: row.userId,
            trackId: row.trackId,
            createdAt: row.createdAt.toISOString(),
            username: row.user.username,
            name: row.user.name,
            avatarUrl: publicUrl(row.user.avatarPath),
            trackTitle: row.track.title,
            trackCoverUrl: publicUrl(row.track.coverPath),
            ...(includeVotes ? { voteCount: row._count.votes } : {}),
        }));

        return {
            items,
            nextCursor: hasNext ? page[page.length - 1]?.id ?? null : null,
        };
    }

    public async getLeaderboard(
        contestId: string
    ): Promise<LeaderboardRowDto[]> {
        let contest = await this.requireContest(contestId);
        const phase = deriveContestPhase(contest);

        if (phase !== "closed") {
            throw new AppError(
                "Leaderboard is available after voting ends",
                403,
                "FORBIDDEN"
            );
        }

        if (contest.payoutMode === ContestPayoutMode.AUTO) {
            await this.resolveClosedIfNeeded(contest);
            contest = await this.requireContest(contestId);
        }

        return this.buildLeaderboard(contest);
    }

    public async listEligibleTracks(
        contestId: string,
        userId: string
    ): Promise<EligibleTrackDto[]> {
        const contest = await this.requireContest(contestId);
        const phase = deriveContestPhase(contest);

        if (phase !== "submit") {
            throw new AppError(
                "Eligible tracks are only listed during Submit",
                400,
                "BAD_REQUEST"
            );
        }

        const tracks = await prisma.track.findMany({
            where: {
                userId,
                status: TrackStatus.PUBLISHED,
            },
            orderBy: { publishedAt: "desc" },
        });

        const activeLockedTrackIds = await this.activeContestTrackIds(
            tracks.map((t) => t.id)
        );

        return tracks
            .filter(
                (t) =>
                    hasGenreOverlap(contest.genreIds, t.genres) &&
                    !activeLockedTrackIds.has(t.id)
            )
            .map((t) => ({
                id: t.id,
                title: t.title,
                coverUrl: publicUrl(t.coverPath),
                genres: t.genres,
                publishedAt: t.publishedAt?.toISOString() ?? null,
            }));
    }

    public async submitEntry(
        contestId: string,
        userId: string,
        payload: SubmitContestEntrySchema
    ): Promise<ContestEntryDto> {
        const contest = await this.requireContest(contestId);
        const phase = deriveContestPhase(contest);

        if (phase !== "submit") {
            throw new AppError(
                "Entries are only accepted during Submit",
                400,
                "BAD_REQUEST"
            );
        }

        const existing = await prisma.contestEntry.findUnique({
            where: { contestId_userId: { contestId, userId } },
        });
        if (existing) {
            throw new AppError(
                "You already submitted an entry to this contest",
                400,
                "BAD_REQUEST"
            );
        }

        const track = await prisma.track.findFirst({
            where: { id: payload.trackId, userId },
        });
        if (!track || track.status !== TrackStatus.PUBLISHED) {
            throw new AppError(
                "Track not found or not published",
                404,
                "RESOURCE_NOT_FOUND"
            );
        }
        if (!hasGenreOverlap(contest.genreIds, track.genres)) {
            throw new AppError(
                "Track genres do not overlap contest genres",
                400,
                "BAD_REQUEST"
            );
        }

        const locked = await this.activeContestTrackIds([track.id]);
        if (locked.has(track.id)) {
            throw new AppError(
                "Track is already entered in another active contest",
                400,
                "BAD_REQUEST"
            );
        }

        const entry = await prisma.contestEntry.create({
            data: {
                contestId,
                userId,
                trackId: track.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
                track: {
                    select: { id: true, title: true, coverPath: true },
                },
            },
        });

        return {
            id: entry.id,
            contestId: entry.contestId,
            userId: entry.userId,
            trackId: entry.trackId,
            createdAt: entry.createdAt.toISOString(),
            username: entry.user.username,
            name: entry.user.name,
            avatarUrl: publicUrl(entry.user.avatarPath),
            trackTitle: entry.track.title,
            trackCoverUrl: publicUrl(entry.track.coverPath),
        };
    }

    public async castVote(
        contestId: string,
        userId: string,
        payload: CastContestVoteSchema
    ): Promise<{ entryId: string }> {
        const contest = await this.requireContest(contestId);
        const phase = deriveContestPhase(contest);

        if (phase !== "vote") {
            throw new AppError(
                "Votes are only accepted during Vote",
                400,
                "BAD_REQUEST"
            );
        }

        const existing = await prisma.contestVote.findUnique({
            where: { contestId_userId: { contestId, userId } },
        });
        if (existing) {
            throw new AppError(
                "You already voted in this contest",
                400,
                "BAD_REQUEST"
            );
        }

        const entry = await prisma.contestEntry.findFirst({
            where: { id: payload.entryId, contestId },
        });
        if (!entry) {
            throw new AppError("Entry not found", 404, "RESOURCE_NOT_FOUND");
        }
        if (entry.userId === userId) {
            throw new AppError(
                "You cannot vote for your own entry",
                400,
                "BAD_REQUEST"
            );
        }

        await prisma.contestVote.create({
            data: {
                contestId,
                userId,
                entryId: entry.id,
            },
        });

        return { entryId: entry.id };
    }

    public async assertTrackNotContestLocked(trackId: string): Promise<void> {
        const locked = await this.activeContestTrackIds([trackId]);
        if (locked.has(trackId)) {
            throw new AppError(
                "This track is locked while it is entered in an active contest",
                400,
                "BAD_REQUEST"
            );
        }
    }

    private async activeContestTrackIds(
        trackIds: string[]
    ): Promise<Set<string>> {
        if (trackIds.length === 0) return new Set();

        const rows = await prisma.contestEntry.findMany({
            where: {
                trackId: { in: trackIds },
                contest: {
                    cancelledAt: null,
                    winnersConfirmedAt: null,
                },
            },
            select: { trackId: true },
        });

        return new Set(rows.map((r) => r.trackId));
    }

    private async requireContest(contestId: string): Promise<Contest> {
        const contest = await prisma.contest.findUnique({
            where: { id: contestId },
        });
        if (!contest) {
            throw new AppError("Contest not found", 404, "RESOURCE_NOT_FOUND");
        }
        return contest;
    }

    private async resolveClosedIfNeeded(contest: Contest): Promise<void> {
        if (!isContestLockingTracks(contest)) return;
        if (deriveContestPhase(contest) !== "closed") return;
        if (contest.payoutMode !== ContestPayoutMode.AUTO) return;
        await this.payWinnersAndSettle(contest);
    }

    private async payWinnersAndSettle(contest: Contest): Promise<void> {
        if (contest.cancelledAt || contest.winnersConfirmedAt) {
            return;
        }
        if (deriveContestPhase(contest) !== "closed") {
            throw new AppError(
                "Contest is not closed yet",
                400,
                "BAD_REQUEST"
            );
        }

        const ranking = await this.loadRankedEntries(contest);
        const winners = ranking.filter(
            (r) => r.placeBand != null && r.prizeCoins > 0
        );

        for (const row of winners) {
            await walletService.creditCoins({
                userId: row.entry.userId,
                amount: row.prizeCoins,
                type: CoinTransactionType.CONTEST_REWARD,
                description: `Contest reward: ${contest.title} (place ${row.placeBand})`,
                referenceId: `contest:${contest.id}:entry:${row.entry.id}`,
            });
        }

        await prisma.contest.update({
            where: { id: contest.id },
            data: { winnersConfirmedAt: new Date() },
        });
    }

    private async loadRankedEntries(contest: Contest): Promise<RankedEntry[]> {
        const entries = await prisma.contestEntry.findMany({
            where: { contestId: contest.id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarPath: true,
                    },
                },
                track: {
                    select: { id: true, title: true, coverPath: true },
                },
                _count: { select: { votes: true } },
            },
        });

        return assignDenseRanks(contest, entries);
    }

    private async buildLeaderboard(
        contest: Contest
    ): Promise<LeaderboardRowDto[]> {
        const ranked = await this.loadRankedEntries(contest);
        return ranked.map((row) => ({
            id: row.entry.id,
            contestId: row.entry.contestId,
            userId: row.entry.userId,
            trackId: row.entry.trackId,
            createdAt: row.entry.createdAt.toISOString(),
            username: row.entry.user.username,
            name: row.entry.user.name,
            avatarUrl: publicUrl(row.entry.user.avatarPath),
            trackTitle: row.entry.track.title,
            trackCoverUrl: publicUrl(row.entry.track.coverPath),
            voteCount: row.voteCount,
            placeBand: row.placeBand,
            prizeCoins: row.prizeCoins,
        }));
    }
}

export const contestService = new ContestService();
