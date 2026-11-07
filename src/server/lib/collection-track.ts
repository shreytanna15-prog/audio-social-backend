import { TrackStatus, type Track } from "@/generated/prisma/client";
import { objectStorage } from "@/server/lib/object-storage";
import { AppError } from "@/server/utils/global-error";

export const COVER_EXT_BY_TYPE: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export const COLLECTION_TRACK_INCLUDE = {
    track: {
        include: {
            user: { select: { id: true, username: true, name: true } },
        },
    },
} as const;

export type CollectionTrackArtist = {
    id: string;
    username: string;
    name: string | null;
};

export type CollectionTrackItem =
    | {
          id: string;
          position: number;
          addedAt: string;
          available: true;
          kind: string;
          title: string;
          caption: string | null;
          genres: string[];
          durationMs: number;
          mixUrl: string | null;
          coverUrl: string | null;
          playCount: number;
          publishedAt: string | null;
          artist: CollectionTrackArtist;
      }
    | {
          id: string;
          position: number;
          addedAt: string;
          available: false;
          title: string;
      };

export type CollectionTrackLink = {
    position: number;
    addedAt: Date;
    track: Track & { user: CollectionTrackArtist };
};

export async function signedUrlOrNull(
    path: string | null | undefined
): Promise<string | null> {
    return path ? objectStorage.createSignedDownloadUrl(path) : null;
}

export async function toCollectionTrackItem(
    link: CollectionTrackLink
): Promise<CollectionTrackItem> {
    const { track } = link;
    const base = {
        id: track.id,
        position: link.position,
        addedAt: link.addedAt.toISOString(),
    };

    if (track.status !== TrackStatus.PUBLISHED) {
        return { ...base, available: false, title: track.title };
    }

    const [mixUrl, coverUrl] = await Promise.all([
        signedUrlOrNull(track.mixPath),
        signedUrlOrNull(track.coverPath),
    ]);

    return {
        ...base,
        available: true,
        kind: track.kind,
        title: track.title,
        caption: track.caption,
        genres: track.genres,
        durationMs: track.durationMs,
        mixUrl,
        coverUrl,
        playCount: track.playCount,
        publishedAt: track.publishedAt?.toISOString() ?? null,
        artist: {
            id: track.user.id,
            username: track.user.username,
            name: track.user.name,
        },
    };
}

export function assertSamePermutation(
    currentIds: string[],
    incomingIds: string[]
): void {
    const incoming = new Set(incomingIds);
    const matches =
        incoming.size === incomingIds.length &&
        incomingIds.length === currentIds.length &&
        currentIds.every((id) => incoming.has(id));

    if (!matches) {
        throw new AppError(
            "trackIds must contain every current track exactly once",
            400,
            "BAD_REQUEST"
        );
    }
}
