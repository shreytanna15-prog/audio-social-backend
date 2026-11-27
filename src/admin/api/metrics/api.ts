import { adminRequest } from "@/admin/api/client";
import type { GrowthMetrics, GrowthRange } from "@/admin/api/metrics/types";

export function getGrowthMetrics(range: GrowthRange) {
    return adminRequest<GrowthMetrics>(
        `/api/admin/metrics/growth?range=${range}`
    );
}
