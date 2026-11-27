"use client";

import { useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Button } from "@/admin/components/ui/button";
import { PageHeader } from "@/admin/components/shared/page-header";
import { useAdminTheme } from "@/admin/components/providers/theme-provider";
import { useGrowthMetrics } from "@/admin/api/metrics/queries";
import type { GrowthRange } from "@/admin/api/metrics/types";
import { cn } from "@/admin/lib/cn";

function RangeToggle({
    value,
    onChange,
}: {
    value: GrowthRange;
    onChange: (next: GrowthRange) => void;
}) {
    return (
        <div className="inline-flex rounded-md border border-border bg-surface-lowest p-0.5">
            {(["7d", "30d"] as const).map((range) => (
                <button
                    key={range}
                    type="button"
                    onClick={() => onChange(range)}
                    className={cn(
                        "rounded-[5px] px-2 py-1 text-[11px] font-medium tabular-nums transition-colors duration-150",
                        value === range
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {range}
                </button>
            ))}
        </div>
    );
}

function ChartCard({
    title,
    range,
    onRangeChange,
    loading,
    error,
    empty,
    onRetry,
    children,
}: {
    title: string;
    range: GrowthRange;
    onRangeChange: (next: GrowthRange) => void;
    loading: boolean;
    error: boolean;
    empty: boolean;
    onRetry: () => void;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3.5 sm:px-5">
                <h2 className="text-sm font-medium text-foreground">{title}</h2>
                <RangeToggle value={range} onChange={onRangeChange} />
            </div>
            <div className="px-2 pb-3 pt-1 sm:px-3">
                {loading ? (
                    <div className="mx-2 h-56 animate-pulse rounded-xl bg-muted/25" />
                ) : null}
                {error ? (
                    <div className="flex h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                        <p>Could not load chart data.</p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onRetry}
                        >
                            Retry
                        </Button>
                    </div>
                ) : null}
                {!loading && !error && empty ? (
                    <div className="flex h-56 flex-col items-center justify-center gap-1 px-4 text-center">
                        <p className="text-sm text-foreground">No activity</p>
                        <p className="text-xs text-muted-foreground">
                            Nothing in the last {range === "7d" ? "7 days" : "30 days"}.
                        </p>
                    </div>
                ) : null}
                {!loading && !error && !empty ? children : null}
            </div>
        </section>
    );
}

export function GrowthDashboard() {
    const [range, setRange] = useState<GrowthRange>("7d");
    const metrics = useGrowthMetrics(range);
    const { theme } = useAdminTheme();

    const chart = useMemo(() => {
        const dark = theme === "dark";
        return {
            grid: dark ? "rgba(255,255,255,0.05)" : "rgba(20,20,28,0.08)",
            tick: dark ? "#958ea0" : "#6b6675",
            users: dark ? "#a078ff" : "#7c3aed",
            tracks: dark ? "#d0bcff" : "#9333ea",
            tooltip: {
                background: dark ? "#1b1b21" : "#ffffff",
                border: dark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(20,20,28,0.1)",
                borderRadius: 10,
                fontSize: 12,
                color: dark ? "#e4e1ea" : "#17171c",
                boxShadow: dark
                    ? "0 8px 24px rgba(0,0,0,0.35)"
                    : "0 8px 24px rgba(0,0,0,0.08)",
            },
        };
    }, [theme]);

    const windowUsers =
        metrics.data?.series.reduce((sum, point) => sum + point.usersCreated, 0) ??
        0;
    const windowTracks =
        metrics.data?.series.reduce(
            (sum, point) => sum + point.tracksPublished,
            0
        ) ?? 0;
    const rangeLabel = range === "7d" ? "7d" : "30d";
    const usersEmpty = Boolean(metrics.data) && windowUsers === 0;
    const tracksEmpty = Boolean(metrics.data) && windowTracks === 0;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Dashboard"
                description="Growth over the selected window"
            />

            {metrics.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
                    <div className="h-[92px] animate-pulse rounded-xl border border-border bg-card" />
                    <div className="h-[92px] animate-pulse rounded-xl border border-border bg-card" />
                </div>
            ) : null}

            {metrics.data ? (
                <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
                    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
                        <p className="text-xs text-muted-foreground">Total users</p>
                        <p className="mt-2 font-mono text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
                            {metrics.data.totals.totalUsers.toLocaleString()}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            <span className="font-mono tabular-nums text-foreground/90">
                                +{windowUsers.toLocaleString()}
                            </span>{" "}
                            in last {rangeLabel}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
                        <p className="text-xs text-muted-foreground">
                            Published tracks
                        </p>
                        <p className="mt-2 font-mono text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
                            {metrics.data.totals.totalPublishedTracks.toLocaleString()}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                            <span className="font-mono tabular-nums text-foreground/90">
                                +{windowTracks.toLocaleString()}
                            </span>{" "}
                            in last {rangeLabel}
                        </p>
                    </div>
                </div>
            ) : null}

            {metrics.isError && !metrics.data ? (
                <p className="text-sm text-muted-foreground">Could not load totals.</p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                    title="New users"
                    range={range}
                    onRangeChange={setRange}
                    loading={metrics.isLoading}
                    error={metrics.isError}
                    empty={usersEmpty}
                    onRetry={() => metrics.refetch()}
                >
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={metrics.data?.series ?? []}
                                margin={{ top: 8, right: 12, left: -4, bottom: 4 }}
                            >
                                <defs>
                                    <linearGradient
                                        id="usersFill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor={chart.users}
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={chart.users}
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    stroke={chart.grid}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: chart.tick, fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: string) =>
                                        value.slice(5)
                                    }
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: chart.tick, fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={32}
                                />
                                <Tooltip
                                    contentStyle={chart.tooltip}
                                    labelStyle={{ color: chart.tick }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="usersCreated"
                                    stroke={chart.users}
                                    strokeWidth={2}
                                    fill="url(#usersFill)"
                                    activeDot={{ r: 3.5, fill: chart.tracks }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard
                    title="Tracks published"
                    range={range}
                    onRangeChange={setRange}
                    loading={metrics.isLoading}
                    error={metrics.isError}
                    empty={tracksEmpty}
                    onRetry={() => metrics.refetch()}
                >
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={metrics.data?.series ?? []}
                                margin={{ top: 8, right: 12, left: -4, bottom: 4 }}
                            >
                                <defs>
                                    <linearGradient
                                        id="tracksFill"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor={chart.tracks}
                                            stopOpacity={0.24}
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor={chart.tracks}
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    stroke={chart.grid}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: chart.tick, fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: string) =>
                                        value.slice(5)
                                    }
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: chart.tick, fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={32}
                                />
                                <Tooltip
                                    contentStyle={chart.tooltip}
                                    labelStyle={{ color: chart.tick }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tracksPublished"
                                    stroke={chart.tracks}
                                    strokeWidth={2}
                                    fill="url(#tracksFill)"
                                    activeDot={{ r: 3.5, fill: chart.users }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
