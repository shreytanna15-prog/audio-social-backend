import { AdminShell } from "@/admin/components/layout/admin-shell";

export default function AdminShellLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminShell>{children}</AdminShell>;
}
