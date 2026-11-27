import type { Metadata } from "next";
import { GrowthDashboard } from "@/admin/components/dashboard/growth-dashboard";

export const metadata: Metadata = {
    title: "Dashboard",
};

export default function AdminDashboardPage() {
    return <GrowthDashboard />;
}
