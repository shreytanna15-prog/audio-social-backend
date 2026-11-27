import type { Metadata } from "next";
import { UsersTable } from "@/admin/components/users/users-table";

export const metadata: Metadata = {
    title: "Users",
};

export default function AdminUsersPage() {
    return <UsersTable />;
}
