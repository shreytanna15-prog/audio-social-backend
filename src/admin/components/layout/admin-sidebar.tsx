"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy, Users } from "lucide-react";
import { VibeOGramLogo } from "@/admin/components/brand/vibeogram-logo";
import { cn } from "@/admin/lib/cn";

const NAV = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/users", label: "Users", icon: Users, exact: false },
    { href: "/admin/contests", label: "Contests", icon: Trophy, exact: false },
] as const;

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-surface-lowest">
            <div className="flex h-17 flex-col justify-center gap-0.5 border-b border-border px-4">
                <Link
                    href="/admin"
                    className="min-w-0 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <VibeOGramLogo
                        idPrefix="sidebar"
                        className="h-5 w-34"
                    />
                </Link>
                <p className="pl-0.5 text-[11px] text-muted-foreground">
                    admin portal
                </p>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 p-2.5 pt-4">
                <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    Overview
                </p>
                {NAV.map((item) => {
                    const active = item.exact
                        ? pathname === item.href
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
                                active
                                    ? "bg-muted/70 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            )}
                        >
                            {active ? (
                                <span
                                    aria-hidden
                                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                                />
                            ) : null}
                            <Icon
                                className={cn(
                                    "h-4 w-4 shrink-0",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
