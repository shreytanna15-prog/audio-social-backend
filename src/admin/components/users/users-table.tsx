"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/admin/components/ui/input";
import { Button } from "@/admin/components/ui/button";
import { PageHeader } from "@/admin/components/shared/page-header";
import { PanelError } from "@/admin/components/shared/panel-error";
import { TableSkeleton } from "@/admin/components/shared/table-skeleton";
import { useAdminUsers } from "@/admin/api/users/queries";

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(new Date(value));
}

export function UsersTable() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [q, setQ] = useState("");
    const pageSize = 20;

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setQ(searchInput.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

    const users = useAdminUsers({ q: q || undefined, page, pageSize });
    const totalPages = Math.max(
        1,
        Math.ceil((users.data?.total ?? 0) / pageSize)
    );

    return (
        <div className="space-y-5">
            <PageHeader
                title="Users"
                description={
                    users.data
                        ? `${users.data.total.toLocaleString()} total`
                        : "Search by username, name, or email"
                }
                actions={
                    <div className="relative w-full max-w-[260px]">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchInput}
                            onChange={(event) =>
                                setSearchInput(event.target.value)
                            }
                            placeholder="Search…"
                            className="pl-8"
                        />
                    </div>
                }
            />

            {users.isLoading ? <TableSkeleton columns={6} /> : null}

            {users.isError ? (
                <PanelError
                    message="Could not load users."
                    onRetry={() => users.refetch()}
                />
            ) : null}

            {users.data ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <table className="min-w-full text-left text-[13px]">
                        <thead>
                            <tr className="border-b border-border bg-surface-lowest/80 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                <th className="px-3 py-2.5 font-medium">User</th>
                                <th className="px-3 py-2.5 font-medium">Email</th>
                                <th className="px-3 py-2.5 font-medium">Joined</th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    Tracks
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    Followers
                                </th>
                                <th className="px-3 py-2.5 text-right font-medium">
                                    Following
                                </th>
                                <th className="w-8 px-3 py-2.5">
                                    <span className="sr-only">Open</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-3 py-14 text-center text-muted-foreground"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.data.items.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="cursor-pointer border-b border-border/60 last:border-0 transition-colors duration-100 hover:bg-muted/30"
                                        onClick={() =>
                                            router.push(
                                                `/admin/users/${user.id}`
                                            )
                                        }
                                    >
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                {user.avatarUrl ? (
                                                    <Image
                                                        src={user.avatarUrl}
                                                        alt=""
                                                        width={28}
                                                        height={28}
                                                        className="h-7 w-7 rounded-full object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground">
                                                        {(
                                                            user.name ||
                                                            user.username
                                                        )
                                                            .slice(0, 1)
                                                            .toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-foreground">
                                                        {user.name || "-"}
                                                    </p>
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                        className="truncate text-xs text-muted-foreground hover:text-primary"
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    >
                                                        @{user.username}
                                                    </Link>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="max-w-[220px] truncate px-3 py-2.5 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                                            {user.publishedTrackCount}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                                            {user.followerCount}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-foreground">
                                            {user.followingCount}
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground">
                                            <ChevronRight
                                                className="ml-auto h-4 w-4"
                                                aria-hidden
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : null}

            {users.data && users.data.total > pageSize ? (
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
