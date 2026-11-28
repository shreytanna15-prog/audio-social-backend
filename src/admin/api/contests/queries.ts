"use client";

import { useQuery } from "@tanstack/react-query";
import {
    getAdminContest,
    listAdminContests,
} from "@/admin/api/contests/api";
import { QUERY_REGISTRY } from "@/admin/api/registry";
import type { QueryOptions } from "@/admin/api/types";
import type {
    AdminContestDetail,
    ContestsListParams,
    ContestSummary,
} from "@/admin/api/contests/types";

export function useAdminContests(
    params: ContestsListParams = {},
    options?: QueryOptions<ContestSummary[]>
) {
    return useQuery({
        queryKey: QUERY_REGISTRY.contests.list(params),
        queryFn: () => listAdminContests(params),
        ...options,
    });
}

export function useAdminContest(
    id: string,
    options?: QueryOptions<AdminContestDetail>
) {
    return useQuery({
        queryKey: QUERY_REGISTRY.contests.detail(id),
        queryFn: () => getAdminContest(id),
        enabled: Boolean(id),
        ...options,
    });
}
