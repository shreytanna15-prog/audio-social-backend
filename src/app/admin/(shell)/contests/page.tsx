import type { Metadata } from "next";
import { ContestsTable } from "@/admin/components/contests/contests-table";

export const metadata: Metadata = {
    title: "Contests",
};

export default function AdminContestsPage() {
    return <ContestsTable />;
}
