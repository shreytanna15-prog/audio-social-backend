import type { Metadata } from "next";
import { ContestDetail } from "@/admin/components/contests/contest-detail";

export const metadata: Metadata = {
    title: "Contest",
};

export default function AdminContestDetailPage() {
    return <ContestDetail />;
}
