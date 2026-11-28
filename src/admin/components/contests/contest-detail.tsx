"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/admin/components/shared/page-header";
import { PanelError } from "@/admin/components/shared/panel-error";
import { TableSkeleton } from "@/admin/components/shared/table-skeleton";
import { Button } from "@/admin/components/ui/button";
import { AppSelect } from "@/admin/components/shared/app-select";
import { useAdminContest } from "@/admin/api/contests/queries";
import {
    useCancelAdminContest,
    useConfirmAdminContestWinners,
    usePatchAdminContest,
} from "@/admin/api/contests/mutations";
import type { LeaderboardRow } from "@/admin/api/contests/types";

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export function ContestDetail() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const detail = useAdminContest(id);
    const cancel = useCancelAdminContest();
    const confirm = useConfirmAdminContestWinners();
    const patch = usePatchAdminContest();

    if (detail.isLoading) {
        return <TableSkeleton columns={4} rows={6} />;
    }

    if (detail.isError || !detail.data) {
        return (
            <PanelError
                message="Could not load contest."
                onRetry={() => detail.refetch()}
            />
        );
    }

    const { contest, ranking } = detail.data;
    const canEdit =
        !contest.cancelled &&
        !contest.winnersConfirmed;
    const canCancel = canEdit;
    const canConfirm =
        contest.phase === "closed" &&
        contest.payoutMode === "MANUAL" &&
        !contest.winnersConfirmed &&
        !contest.cancelled;

    return (
        <div className="space-y-6">
            <PageHeader
                title={contest.title}
                description={`${contest.phase} · ${contest.placementMode} · ${contest.payoutMode}`}
                actions={
                    <div className="flex flex-wrap gap-2">
                        {canEdit ? (
                            <Link href={`/admin/contests/${id}/edit`}>
                                <Button type="button" variant="secondary">
                                    Edit
                                </Button>
                            </Link>
                        ) : null}
                        {canCancel ? (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={cancel.isPending}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            "Cancel this contest? Track locks will release."
                                        )
                                    ) {
                                        cancel.mutate(id);
                                    }
                                }}
                            >
                                Cancel contest
                            </Button>
                        ) : null}
                        {canConfirm ? (
                            <Button
                                type="button"
                                disabled={confirm.isPending}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            "Confirm winners and grant pre-set coins?"
                                        )
                                    ) {
                                        confirm.mutate(id);
                                    }
                                }}
                            >
                                Confirm winners
                            </Button>
                        ) : null}
                    </div>
                }
            />

            <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
                <div>
                    <p className="text-xs text-muted-foreground">Entries / votes</p>
                    <p className="font-mono tabular-nums">
                        {contest.entryCount} / {contest.voteCount}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Results visible</p>
                    <p className="font-mono tabular-nums">
                        {contest.resultsVisibleDays} days after vote end
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Submit window</p>
                    <p className="font-mono text-xs tabular-nums">
                        {formatDate(contest.submitStartAt)} →{" "}
                        {formatDate(contest.submitEndAt)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Vote end</p>
                    <p className="font-mono text-xs tabular-nums">
                        {formatDate(contest.voteEndAt)}
                    </p>
                </div>
                <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Prize note</p>
                    <p>{contest.prizeNote}</p>
                </div>
                <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Coin tiers</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm tabular-nums">
                        <span>1st: {contest.prizeCoinsFirst}</span>
                        {contest.placementMode === "TOP_THREE" ? (
                            <>
                                <span>2nd: {contest.prizeCoinsSecond ?? 0}</span>
                                <span>3rd: {contest.prizeCoinsThird ?? 0}</span>
                            </>
                        ) : null}
                    </div>
                </div>
                {canEdit ? (
                    <div className="sm:col-span-2 max-w-xs">
                        <AppSelect
                            id="detail-payout-mode"
                            label="Payout mode"
                            value={contest.payoutMode}
                            disabled={patch.isPending}
                            options={[
                                { value: "MANUAL", label: "Manual confirm" },
                                { value: "AUTO", label: "Auto on close" },
                            ]}
                            onValueChange={(value) =>
                                patch.mutate({
                                    id,
                                    body: {
                                        payoutMode: value as "MANUAL" | "AUTO",
                                    },
                                })
                            }
                        />
                    </div>
                ) : null}
                {contest.phase === "closed" && contest.payoutMode === "AUTO" ? (
                    <p className="sm:col-span-2 text-sm text-muted-foreground">
                        {contest.winnersConfirmed
                            ? "AUTO payout settled with results."
                            : "AUTO payout pending first Closed resolve."}
                    </p>
                ) : null}
            </div>

            {contest.phase === "closed" && ranking ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border px-4 py-3 text-sm font-medium">
                        Ranking
                    </div>
                    <table className="min-w-full text-left text-[13px]">
                        <thead>
                            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                                <th className="px-3 py-2">Place</th>
                                <th className="px-3 py-2">Artist</th>
                                <th className="px-3 py-2">Track</th>
                                <th className="px-3 py-2 text-right">Votes</th>
                                <th className="px-3 py-2 text-right">Coins</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.map((row: LeaderboardRow) => (
                                <tr
                                    key={row.id}
                                    className="border-b border-border/70 last:border-0"
                                >
                                    <td className="px-3 py-2.5 font-mono tabular-nums">
                                        {row.placeBand ?? "-"}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        @{row.username}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {row.trackTitle}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                                        {row.voteCount}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                                        {row.prizeCoins}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}
