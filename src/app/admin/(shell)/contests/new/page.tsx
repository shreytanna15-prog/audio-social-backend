"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/admin/components/shared/page-header";
import { ContestForm } from "@/admin/components/contests/contest-form";
import { useCreateAdminContest } from "@/admin/api/contests/mutations";

export default function AdminNewContestPage() {
    const router = useRouter();
    const create = useCreateAdminContest({
        onSuccess: (data) => {
            router.push(`/admin/contests/${data.id}`);
        },
    });

    return (
        <div className="space-y-5">
            <PageHeader
                title="New contest"
                description="Set phases, genres, prizes, and payout mode"
            />
            <ContestForm
                mode="create"
                submitting={create.isPending}
                onSubmit={(body) => create.mutate(body)}
            />
        </div>
    );
}
