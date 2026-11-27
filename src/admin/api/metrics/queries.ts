"use client";

import { useQuery } from "@tanstack/react-query";
import { getGrowthMetrics } from "@/admin/api/metrics/api";
import { QUERY_REGISTRY } from "@/admin/api/registry";
import type { QueryOptions } from "@/admin/api/types";
import type { GrowthMetrics, GrowthRange } from "@/admin/api/metrics/types";

export function useGrowthMetrics(
    range: GrowthRange,
    options?: QueryOptions<GrowthMetrics>
) {
    return useQuery({
        queryKey: QUERY_REGISTRY.metrics.growth(range),
        queryFn: () => getGrowthMetrics(range),
        ...options,
    });
}
