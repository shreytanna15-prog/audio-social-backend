export type AdminUserListItem = {
    id: string;
    email: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: string;
    publishedTrackCount: number;
    followerCount: number;
    followingCount: number;
};

export type AdminUsersListData = {
    items: AdminUserListItem[];
    page: number;
    pageSize: number;
    total: number;
};

export type AdminUserDetail = {
    id: string;
    email: string;
    username: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    createdAt: string;
    counts: {
        publishedTracks: number;
        playlists: number;
        albums: number;
        feedClips: number;
        followers: number;
        following: number;
    };
};

export type PageResult<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
};

export type AdminUserTrack = {
    id: string;
    title: string;
    coverUrl: string | null;
    publishedAt: string | null;
    playCount: number;
    likeCount: number;
};

export type AdminUserPlaylist = {
    id: string;
    title: string;
    visibility: string;
    trackCount: number;
    updatedAt: string;
};

export type AdminUserAlbum = {
    id: string;
    title: string;
    status: string;
    releasedAt: string | null;
    trackCount: number;
};

export type AdminUserFeedClip = {
    id: string;
    trackId: string;
    trackTitle: string;
    durationMs: number;
    likeCount: number;
    createdAt: string;
};

export type UsersListParams = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export type NestedListParams = {
    page?: number;
    pageSize?: number;
};
