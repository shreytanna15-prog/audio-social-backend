export type GrowthRange = "7d" | "30d";

export type GrowthPoint = {
    date: string;
    usersCreated: number;
    tracksPublished: number;
};

export type GrowthMetrics = {
    range: GrowthRange;
    series: GrowthPoint[];
    totals: {
        totalUsers: number;
        totalPublishedTracks: number;
    };
};
