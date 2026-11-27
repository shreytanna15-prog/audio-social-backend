import { z } from "@/server/lib/zod";

export const adminGrowthQuerySchema = z
    .object({
        range: z.enum(["7d", "30d"]).default("7d"),
    })
    .openapi("AdminGrowthQuery");

export type AdminGrowthQuery = z.infer<typeof adminGrowthQuerySchema>;
