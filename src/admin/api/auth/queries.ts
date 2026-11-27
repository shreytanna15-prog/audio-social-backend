"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminMe } from "@/admin/api/auth/api";
import { QUERY_REGISTRY } from "@/admin/api/registry";
import type { QueryOptions } from "@/admin/api/types";
import type { AdminProfile } from "@/admin/api/auth/types";
import { AdminApiError } from "@/admin/api/types";

export function useAdminMe(options?: QueryOptions<AdminProfile>) {
    return useQuery({
        queryKey: QUERY_REGISTRY.auth.me,
        queryFn: getAdminMe,
        retry: (failureCount, error) => {
            if (error instanceof AdminApiError && error.status === 401) {
                return false;
            }
            return failureCount < 1;
        },
        ...options,
    });
}
