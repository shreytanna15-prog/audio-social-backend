"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/admin/components/ui/button";
import { PanelError } from "@/admin/components/shared/panel-error";
import { TableSkeleton } from "@/admin/components/shared/table-skeleton";
import {
    useAdminUser,
    useAdminUserAlbums,
    useAdminUserFeedClips,
    useAdminUserPlaylists,
    useAdminUserTracks,
} from "@/admin/api/users/queries";
import { cn } from "@/admin/lib/cn";

type TabKey = "tracks" | "playlists" | "albums" | "feed-clips";

function formatDate(value: string | null) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(new Date(value));
}

export function UserDetail({ userId }: { userId: string }) {
    const [tab, setTab] = useState<TabKey>("tracks");
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const user = useAdminUser(userId);
    const tracks = useAdminUserTracks(
        userId,
        { page, pageSize },
        { enabled: tab === "tracks" }
    );
    const playlists = useAdminUserPlaylists(
        userId,
        { page, pageSize },
        { enabled: tab === "playlists" }
    );
    const albums = useAdminUserAlbums(
        userId,
        { page, pageSize },
        { enabled: tab === "albums" }
    );
    const feedClips = useAdminUserFeedClips(
        userId,
        { page, pageSize },
        { enabled: tab === "feed-clips" }
    );

    const activeQuery =
        tab === "tracks"
            ? tracks
            : tab === "playlists"
              ? playlists
              : tab === "albums"
                ? albums
                : feedClips;

    const totalPages = Math.max(
        1,
        Math.ceil((activeQuery.data?.total ?? 0) / pageSize)
    );

    if (user.isLoading) {
        return <TableSkeleton columns={4} rows={4} />;
    }

    if (user.isError || !user.data) {
        return (
            <PanelError
                message="Could not load user."
                onRetry={() => user.refetch()}
            />
        );
    }

    const detail = user.data;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link
                    href="/admin/users"
                    className="transition-colors duration-150 hover:text-foreground"
                >
                    Users
                </Link>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-foreground">@{detail.username}</span>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start gap-4">
                    {detail.avatarUrl ? (
                        <Image
                            src={detail.avatarUrl}
                            alt=""
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-full object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-base text-muted-foreground">
                            {(detail.name || detail.username)
                                .slice(0, 1)
                                .toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            {detail.name || detail.username}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            @{detail.username}
                            <span className="mx-1.5 text-muted-foreground/40">
                                ·
                            </span>
                            {detail.email}
                        </p>
                        {detail.bio ? (
                            <p className="max-w-2xl pt-1 text-sm leading-relaxed text-foreground/85">
                                {detail.bio}
                            </p>
                        ) : null}
                        <p className="pt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                            Joined {formatDate(detail.createdAt)}
                        </p>
                    </div>
                    {detail.coverUrl ? (
                        <Image
                            src={detail.coverUrl}
                            alt=""
                            width={168}
                            height={56}
                            className="h-14 w-[168px] rounded-md object-cover"
                            unoptimized
                        />
                    ) : null}
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-6">
                    {(
                        [
                            ["Tracks", detail.counts.publishedTracks],
                            ["Playlists", detail.counts.playlists],
                            ["Albums", detail.counts.albums],
                            ["Feed clips", detail.counts.feedClips],
                            ["Followers", detail.counts.followers],
                            ["Following", detail.counts.following],
                        ] as const
                    ).map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-[11px] text-muted-foreground">
                                {label}
                            </dt>
                            <dd className="mt-0.5 font-mono text-base font-medium tabular-nums text-foreground">
                                {value.toLocaleString()}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>

            <div className="flex gap-5 border-b border-border">
                {(
                    [
                        ["tracks", "Tracks"],
                        ["playlists", "Playlists"],
                        ["albums", "Albums"],
                        ["feed-clips", "Feed clips"],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            setTab(key);
                            setPage(1);
                        }}
                        className={cn(
                            "-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition-colors duration-150",
                            tab === key
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {activeQuery.isLoading ? <TableSkeleton columns={4} /> : null}

            {activeQuery.isError ? (
                <PanelError
                    message={`Could not load ${tab}.`}
                    onRetry={() => activeQuery.refetch()}
                />
            ) : null}

            {tracks.data && tab === "tracks" ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <table className="min-w-full text-left text-[13px]">
                        <thead>
                            <tr className="border-b border-border bg-surface-lowest/80 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-3 py-2.5 font-medium">
                                    Track
                                </th>
                                <th className="px-3 py-2.5 font-medium">
                                    Published
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    Plays
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    Likes
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tracks.data.items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-3 py-14 text-center text-muted-foreground"
                                    >
                                        No items.
                                    </td>
                                </tr>
                            ) : (
                                tracks.data.items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-border/60 last:border-0"
                                    >
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                {item.coverUrl ? (
                                                    <Image
                                                        src={item.coverUrl}
                                                        alt=""
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded bg-muted" />
                                                )}
                                                <span className="font-medium text-foreground">
                                                    {item.title}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                                            {formatDate(item.publishedAt)}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                            {item.playCount}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                                            {item.likeCount}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {playlists.data && tab === "playlists" ? (
                <DataTable
                    headers={["Title", "Visibility", "Tracks", "Updated"]}
                    rows={playlists.data.items.map((item) => [
                        item.title,
                        item.visibility,
                        String(item.trackCount),
                        formatDate(item.updatedAt),
                    ])}
                    numericFrom={2}
                />
            ) : null}

            {albums.data && tab === "albums" ? (
                <DataTable
                    headers={["Title", "Status", "Released", "Tracks"]}
                    rows={albums.data.items.map((item) => [
                        item.title,
                        item.status,
                        formatDate(item.releasedAt),
                        String(item.trackCount),
                    ])}
                    numericFrom={2}
                />
            ) : null}

            {feedClips.data && tab === "feed-clips" ? (
                <DataTable
                    headers={["Track", "Duration", "Likes", "Created"]}
                    rows={feedClips.data.items.map((item) => [
                        item.trackTitle,
                        `${Math.round(item.durationMs / 1000)}s`,
                        String(item.likeCount),
                        formatDate(item.createdAt),
                    ])}
                    numericFrom={1}
                />
            ) : null}

            {activeQuery.data && activeQuery.data.total > pageSize ? (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() =>
                                setPage((prev) => Math.max(1, prev - 1))
                            }
                        >
                            Previous
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() =>
                                setPage((prev) =>
                                    Math.min(totalPages, prev + 1)
                                )
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function DataTable({
    headers,
    rows,
    numericFrom = 1,
}: {
    headers: string[];
    rows: string[][];
    numericFrom?: number;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="min-w-full text-left text-[13px]">
                <thead>
                    <tr className="border-b border-border bg-surface-lowest/80 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {headers.map((header, index) => (
                            <th
                                key={header}
                                className={cn(
                                    "px-3 py-2.5 font-medium",
                                    index >= numericFrom && "text-right"
                                )}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={headers.length}
                                className="px-3 py-14 text-center text-muted-foreground"
                            >
                                No items.
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, index) => (
                            <tr
                                key={`${row[0]}-${index}`}
                                className="border-b border-border/60 last:border-0"
                            >
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={`${index}-${cellIndex}`}
                                        className={cn(
                                            "px-3 py-2.5",
                                            cellIndex === 0
                                                ? "font-medium text-foreground"
                                                : cellIndex >= numericFrom
                                                  ? "text-right font-mono text-xs tabular-nums text-muted-foreground"
                                                  : "text-muted-foreground"
                                        )}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
