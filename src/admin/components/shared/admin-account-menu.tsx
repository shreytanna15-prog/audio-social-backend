"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { useAdminLogout } from "@/admin/api/auth/mutations";
import type { AdminProfile } from "@/admin/api/auth/types";
import { useAdminTheme } from "@/admin/components/providers/theme-provider";
import { cn } from "@/admin/lib/cn";

function initialsFromAdmin(admin: AdminProfile) {
    const source = (admin.name || admin.email).trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

export function AdminAccountMenu({ admin }: { admin: AdminProfile }) {
    const router = useRouter();
    const { theme, toggleTheme } = useAdminTheme();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const logout = useAdminLogout({
        onSuccess: () => {
            setOpen(false);
            router.replace("/admin/login");
        },
    });

    const displayName = admin.name || "Admin";
    const initials = initialsFromAdmin(admin);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left transition-colors duration-150",
                    "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    open && "bg-muted/40"
                )}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
                    {initials}
                </span>
                <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-foreground sm:inline">
                    {displayName}
                </span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
                        open && "rotate-180"
                    )}
                />
            </button>

            {open ? (
                <div
                    id={menuId}
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
                >
                    <div className="border-b border-border px-3.5 py-3">
                        <p className="truncate text-sm font-semibold text-foreground">
                            {displayName}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                            {admin.email}
                        </p>
                    </div>

                    <div className="border-b border-border p-1">
                        <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted/50"
                            onClick={() => {
                                toggleTheme();
                            }}
                        >
                            {theme === "dark" ? (
                                <Moon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Sun className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="flex-1">Theme</span>
                            <span className="font-mono text-xs text-muted-foreground">
                                {theme}
                            </span>
                        </button>
                    </div>

                    <div className="p-1">
                        <button
                            type="button"
                            role="menuitem"
                            disabled={logout.isPending}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10 disabled:opacity-50"
                            onClick={() => logout.mutate()}
                        >
                            <LogOut className="h-4 w-4" />
                            {logout.isPending ? "Logging out…" : "Log out"}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
