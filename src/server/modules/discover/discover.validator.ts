import { z } from "@/server/lib/zod";

export const featuredArtistsQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(8, "limit must be at most 8")
            .optional()
            .default(8),
    })
    .openapi("FeaturedArtistsQuery");

export type FeaturedArtistsQuerySchema = z.infer<
    typeof featuredArtistsQuerySchema
>;

export const trendingWindowSchema = z
    .enum(["30d", "all"], {
        message: "window must be 30d or all",
    })
    .optional()
    .default("30d");

export const trendingTracksQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(12, "limit must be at most 12")
            .optional()
            .default(12),
        window: trendingWindowSchema,
    })
    .openapi("TrendingTracksQuery");

export type TrendingTracksQuerySchema = z.infer<
    typeof trendingTracksQuerySchema
>;

export type TrendingWindow = NonNullable<
    z.infer<typeof trendingWindowSchema>
>;

export const risingArtistsQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(3, "limit must be at most 3")
            .optional()
            .default(1),
    })
    .openapi("RisingArtistsQuery");

export type RisingArtistsQuerySchema = z.infer<
    typeof risingArtistsQuerySchema
>;

export const discoverPlaylistsQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(8, "limit must be at most 8")
            .optional()
            .default(8),
    })
    .openapi("DiscoverPlaylistsQuery");

export type DiscoverPlaylistsQuerySchema = z.infer<
    typeof discoverPlaylistsQuerySchema
>;

export const madeForYouQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(12, "limit must be at most 12")
            .optional()
            .default(12),
    })
    .openapi("MadeForYouTracksQuery");

export type MadeForYouQuerySchema = z.infer<typeof madeForYouQuerySchema>;

export const homePlaylistsQuerySchema = z
    .object({
        limit: z.coerce
            .number()
            .int("limit must be a whole number")
            .min(1, "limit must be at least 1")
            .max(8, "limit must be at most 8")
            .optional()
            .default(8),
    })
    .openapi("HomePlaylistsQuery");

export type HomePlaylistsQuerySchema = z.infer<typeof homePlaylistsQuerySchema>;
