"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/admin/components/shared/page-header";
import { PanelError } from "@/admin/components/shared/panel-error";
import { TableSkeleton } from "@/admin/components/shared/table-skeleton";
import { ContestForm } from "@/admin/components/contests/contest-form";
import { useAdminContest } from "@/admin/api/contests/queries";
import { usePatchAdminContest } from "@/admin/api/contests/mutations";

export default function AdminContestEditPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const router = useRouter();
    const detail = useAdminContest(id);
    const patch = usePatchAdminContest({
        onSuccess: () => {
            router.push(`/admin/contests/${id}`);
        },
    });

    if (detail.isLoading) {
        return <TableSkeleton columns={3} />;
    }

    if (detail.isError || !detail.data) {
        return (
            <PanelError
                message="Could not load contest."
                onRetry={() => detail.refetch()}
            />
        );
    }

    const contest = detail.data.contest;
    const limitedEdit =
        Date.now() >= new Date(contest.submitStartAt).getTime();

    if (contest.cancelled || contest.winnersConfirmed) {
        return (
            <div className="space-y-4">
                <PageHeader title="Edit contest" />
                <p className="text-sm text-muted-foreground">
                    This contest can no longer be edited.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PageHeader
                title="Edit contest"
                description={contest.title}
            />
            <ContestForm
                mode="edit"
                initial={contest}
                limitedEdit={limitedEdit}
                submitting={patch.isPending}
                onSubmit={(body) => {
                    if (limitedEdit) {
                        patch.mutate({
                            id,
                            body: {
                                prizeNote: body.prizeNote,
                                payoutMode: body.payoutMode,
                                resultsVisibleDays: body.resultsVisibleDays,
                            },
                        });
                        return;
                    }
                    patch.mutate({ id, body });
                }}
            />
        </div>
    );
}