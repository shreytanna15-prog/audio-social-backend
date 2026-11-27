"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminMe } from "@/admin/api/auth/queries";
import { AdminApiError } from "@/admin/api/types";
import { VibeOGramLogo } from "@/admin/components/brand/vibeogram-logo";
import { AdminSidebar } from "@/admin/components/layout/admin-sidebar";
import { AdminTopbar } from "@/admin/components/layout/admin-topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const me = useAdminMe();

    useEffect(() => {
        if (!me.isError) return;
        if (me.error instanceof AdminApiError && me.error.status === 401) {
            router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [me.isError, me.error, pathname, router]);

    if (me.isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
                <VibeOGramLogo idPrefix="boot" className="h-6 w-[150px] opacity-80" />
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (me.isError || !me.data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
                Redirecting…
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AdminSidebar />
            <div className="pl-60">
                <AdminTopbar admin={me.data} />
                <main className="mx-auto max-w-[1180px] px-6 py-6">{children}</main>
            </div>
        </div>
    );
}
