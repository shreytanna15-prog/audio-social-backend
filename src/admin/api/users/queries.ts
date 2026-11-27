"use client";

import { useQuery } from "@tanstack/react-query";
import {
    getAdminUser,
    listAdminUserAlbums,
    listAdminUserFeedClips,
    listAdminUserPlaylists,
    listAdminUserTracks,
    listAdminUsers,
} from "@/admin/api/users/api";
import { QUERY_REGISTRY } from "@/admin/api/registry";
import type { QueryOptions } from "@/admin/api/types";
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

export function useAdminUsers(
    params: UsersListParams,
    options?: QueryOptions<AdminUsersListData>
) {
    return useQuery({
        queryKey: QUERY_REGISTRY.users.list(params),
        queryFn: () => listAdminUsers(params),
        ...options,
    });
}

export function useAdminUser(
    id: string,
    options?: QueryOptions<AdminUserDetail>
) {
    return useQuery({
        queryKey: QUERY_REGISTRY.users.detail(id),
        queryFn: () => getAdminUser(id),
        enabled: Boolean(id),
        ...options,
    });
}

export function useAdminUserTracks(
    id: string,
    params: NestedListParams = {},
    options?: QueryOptions<PageResult<AdminUserTrack>>
) {
    const { enabled, ...rest } = options ?? {};
    return useQuery({
        queryKey: QUERY_REGISTRY.users.tracks(id, params),
        queryFn: () => listAdminUserTracks(id, params),
        enabled: Boolean(id) && (enabled ?? true),
        ...rest,
    });
}

export function useAdminUserPlaylists(
    id: string,
    params: NestedListParams = {},
    options?: QueryOptions<PageResult<AdminUserPlaylist>>
) {
    const { enabled, ...rest } = options ?? {};
    return useQuery({
        queryKey: QUERY_REGISTRY.users.playlists(id, params),
        queryFn: () => listAdminUserPlaylists(id, params),
        enabled: Boolean(id) && (enabled ?? true),
        ...rest,
    });
}

export function useAdminUserAlbums(
    id: string,
    params: NestedListParams = {},
    options?: QueryOptions<PageResult<AdminUserAlbum>>
) {
    const { enabled, ...rest } = options ?? {};
    return useQuery({
        queryKey: QUERY_REGISTRY.users.albums(id, params),
        queryFn: () => listAdminUserAlbums(id, params),
        enabled: Boolean(id) && (enabled ?? true),
        ...rest,
    });
}

export function useAdminUserFeedClips(
    id: string,
    params: NestedListParams = {},
    options?: QueryOptions<PageResult<AdminUserFeedClip>>
) {
    const { enabled, ...rest } = options ?? {};
    return useQuery({
        queryKey: QUERY_REGISTRY.users.feedClips(id, params),
        queryFn: () => listAdminUserFeedClips(id, params),
        enabled: Boolean(id) && (enabled ?? true),
        ...rest,
    });
}
