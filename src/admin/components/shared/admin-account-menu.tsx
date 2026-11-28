"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { useAdminLogout } from "@/admin/api/auth/mutations";
import type { AdminProfile } from "@/admin/api/auth/types";
import { useAdminTheme } from "@/admin/components/providers/theme-provider";
import { AppDropdown } from "@/admin/components/shared/app-dropdown";
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
    const logout = useAdminLogout({
        onSuccess: () => {
            router.replace("/admin/login");
        },
    });

    const displayName = admin.name || "Admin";
    const initials = initialsFromAdmin(admin);

    return (
        <AppDropdown
            align="end"
            header={
                <div>
                    <p className="truncate text-sm font-semibold text-foreground">
                        {displayName}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                        {admin.email}
                    </p>
                </div>
            }
            trigger={
                <button
                    type="button"
                    className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left transition-colors duration-150",
                        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    )}
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
                        {initials}
                    </span>
                    <span className="hidden max-w-35 truncate text-[13px] font-medium text-foreground sm:inline">
                        {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            }
            items={[
                {
                    key: "theme",
                    label: "Theme",
                    icon:
                        theme === "dark" ? (
                            <Moon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Sun className="h-4 w-4 text-muted-foreground" />
                        ),
                    shortcut: (
                        <span className="font-mono text-xs text-muted-foreground">
                            {theme}
                        </span>
                    ),
                    onSelect: () => toggleTheme(),
                },
                {
                    key: "logout",
                    label: logout.isPending ? "Logging out…" : "Log out",
                    icon: <LogOut className="h-4 w-4" />,
                    destructive: true,
                    disabled: logout.isPending,
                    separatorBefore: true,
                    onSelect: () => logout.mutate(),
                },
            ]}
        />
    );
}
