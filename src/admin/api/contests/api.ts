import { adminRequest } from "@/admin/api/client";
import type {
    AdminContestDetail,
    ContestsListParams,
    CreateContestBody,
    ContestSummary,
    PatchContestBody,
} from "@/admin/api/contests/types";

function toQuery(params?: ContestsListParams) {
    const search = new URLSearchParams();
    if (params?.phase) search.set("phase", params.phase);
    const qs = search.toString();
    return qs ? `?${qs}` : "";
}

export function listAdminContests(params: ContestsListParams = {}) {
    return adminRequest<ContestSummary[]>(
        `/api/admin/contests${toQuery(params)}`
    );
}

export function getAdminContest(id: string) {
    return adminRequest<AdminContestDetail>(`/api/admin/contests/${id}`);
}

export function createAdminContest(body: CreateContestBody) {
    return adminRequest<ContestSummary>("/api/admin/contests", {
        method: "POST",
        body,
    });
}

export function patchAdminContest(id: string, body: PatchContestBody) {
    return adminRequest<ContestSummary>(`/api/admin/contests/${id}`, {
        method: "PATCH",
        body,
    });
}

export function cancelAdminContest(id: string) {
    return adminRequest<ContestSummary>(`/api/admin/contests/${id}/cancel`, {
        method: "POST",
    });
}

export function confirmAdminContestWinners(id: string) {
    return adminRequest<{
        contest: ContestSummary;
        ranking: unknown[];
    }>(`/api/admin/contests/${id}/confirm-winners`, {
        method: "POST",
    });
}
