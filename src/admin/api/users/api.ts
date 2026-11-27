import { adminRequest } from "@/admin/api/client";
import type {
    AdminUserAlbum,
    AdminUserDetail,
    AdminUserFeedClip,
    AdminUserPlaylist,
    AdminUserTrack,
    AdminUsersListData,
    NestedListParams,
    PageResult,
    UsersListParams,
} from "@/admin/api/users/types";

function toQuery(params?: Record<string, string | number | undefined>) {
    const search = new URLSearchParams();
    if (!params) return "";
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === "") continue;
        search.set(key, String(value));
    }
    const qs = search.toString();
    return qs ? `?${qs}` : "";
}

export function listAdminUsers(params: UsersListParams = {}) {
    return adminRequest<AdminUsersListData>(
        `/api/admin/users${toQuery(params)}`
    );
}

export function getAdminUser(id: string) {
    return adminRequest<AdminUserDetail>(`/api/admin/users/${id}`);
}

export function listAdminUserTracks(id: string, params: NestedListParams = {}) {
    return adminRequest<PageResult<AdminUserTrack>>(
        `/api/admin/users/${id}/tracks${toQuery(params)}`
    );
}

export function listAdminUserPlaylists(
    id: string,
    params: NestedListParams = {}
) {
    return adminRequest<PageResult<AdminUserPlaylist>>(
        `/api/admin/users/${id}/playlists${toQuery(params)}`
    );
}

export function listAdminUserAlbums(id: string, params: NestedListParams = {}) {
    return adminRequest<PageResult<AdminUserAlbum>>(
        `/api/admin/users/${id}/albums${toQuery(params)}`
    );
}

export function listAdminUserFeedClips(
    id: string,
    params: NestedListParams = {}
) {
    return adminRequest<PageResult<AdminUserFeedClip>>(
        `/api/admin/users/${id}/feed-clips${toQuery(params)}`
    );
}
