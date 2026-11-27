"use client";

import { AdminAccountMenu } from "@/admin/components/shared/admin-account-menu";
import type { AdminProfile } from "@/admin/api/auth/types";

export function AdminTopbar({ admin }: { admin: AdminProfile }) {
    return (
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-border bg-background/85 px-6 backdrop-blur-md">
            <AdminAccountMenu admin={admin} />
        </header>
    );
}
