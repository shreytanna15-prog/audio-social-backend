import { z } from "@/server/lib/zod";

export const listFeedQuerySchema = z
    .object({
        cursor: z.uuid("Invalid cursor").optional(),
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(30)
            .optional()
            .default(10),
    })
    .openapi("ListFeedQuery");

export type ListFeedQuerySchema = z.infer<typeof listFeedQuerySchema>;
