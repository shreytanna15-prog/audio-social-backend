import type { Metadata } from "next";
import { UserDetail } from "@/admin/components/users/user-detail";

export const metadata: Metadata = {
    title: "User",
};

export default async function AdminUserDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <UserDetail userId={id} />;
}
