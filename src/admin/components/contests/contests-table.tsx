"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/admin/components/ui/button";
import { PageHeader } from "@/admin/components/shared/page-header";
import { PanelError } from "@/admin/components/shared/panel-error";
import { TableSkeleton } from "@/admin/components/shared/table-skeleton";
import { useAdminContests } from "@/admin/api/contests/queries";
import type { ContestsListParams } from "@/admin/api/contests/types";
import { cn } from "@/admin/lib/cn";

const PHASE_TABS: { id: ContestsListParams["phase"]; label: string }[] = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "active", label: "Active" },
    { id: "closed", label: "Closed" },
    { id: "cancelled", label: "Cancelled" },
];

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export function ContestsTable() {
    const router = useRouter();
    const [phase, setPhase] =
        useState<ContestsListParams["phase"]>("all");
    const contests = useAdminContests({ phase });

    return (
        <div className="space-y-5">
            <PageHeader
                title="Contests"
                description="Create and manage timed contests"
                actions={
                    <Link href="/admin/contests/new">
                        <Button type="button">
                            <Plus className="h-4 w-4" />
                            New contest
                        </Button>
                    </Link>
                }
            />

            <div className="flex flex-wrap gap-1 border-b border-border pb-px">
                {PHASE_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPhase(tab.id)}
                        className={cn(
                            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                            phase === tab.id
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {contests.isLoading ? <TableSkeleton columns={7} /> : null}

            {contests.isError ? (
                <PanelError
                    message="Could not load contests."
                    onRetry={() => contests.refetch()}
                />
            ) : null}

            {contests.data ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <table className="min-w-full text-left text-[13px]">
                        <thead>
                            <tr className="border-b border-border bg-surface-lowest/80 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-3 py-2.5 font-medium">Title</th>
                                <th className="px-3 py-2.5 font-medium">Phase</th>
                                <th className="px-3 py-2.5 font-medium">
                                    Placement
                                </th>
                                <th className="px-3 py-2.5 font-medium">
                                    Payout
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    Entries
                                </th>
                                <th className="px-3 py-2.5 font-medium">
                                    Vote end
                                </th>
                                <th className="px-3 py-2.5 font-medium">
                                    Winners
                                </th>
                                <th className="w-8 px-3 py-2.5">
                                    <span className="sr-only">Open</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {contests.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-3 py-10 text-center text-muted-foreground"
                                    >
                                        No contests in this filter.
                                    </td>
                                </tr>
                            ) : (
                                contests.data.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
                                        onClick={() =>
                                            router.push(
                                                `/admin/contests/${row.id}`
                                            )
                                        }
                                    >
                                        <td className="px-3 py-3 font-medium text-foreground">
                                            {row.title}
                                        </td>
                                        <td className="px-3 py-3 capitalize text-muted-foreground">
                                            {row.phase}
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                                            {row.placementMode}
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                                            {row.payoutMode}
                                        </td>
                                        <td className="px-3 py-3 text-right font-mono tabular-nums text-muted-foreground">
                                            {row.entryCount}
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs tabular-nums text-muted-foreground">
                                            {formatDate(row.voteEndAt)}
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">
                                            {row.cancelled
                                                ? "Cancelled"
                                                : row.winnersConfirmed
                                                  ? "Settled"
                                                  : "Pending"}
                                        </td>
                                        <td className="px-3 py-3">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}
