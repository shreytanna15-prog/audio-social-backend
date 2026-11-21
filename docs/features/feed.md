# Feed (reels / shorts) — Implementation Guide

**Audience:** teammates and AI agents implementing this feature end-to-end.  
**Repos:** backend (`audio-social-backend`) + mobile app (`audio-social-app`).  
**Status:** `Done` — published-track feed API + app vertical reels wired (likes / comments / play / follow).  
**Do not** invent Prisma models; reuse `Track` / `LikedTrack` / `Follow` / `TrackPlay`.

**Related docs:** [`../project-context.md`](../project-context.md), [`./publish.md`](./publish.md), [`./library-saves.md`](./library-saves.md), [`./track-comments.md`](./track-comments.md), [`./follow-and-artist-search.md`](./follow-and-artist-search.md)

**Naming:**

| Term | Meaning |
|------|---------|
| **Feed** | Vertical reels of PUBLISHED tracks (mix only) |
| **Vibe** | App UI name for one feed card |

---

## 1. Goal

1. Serve a cursor-paginated feed of PUBLISHED tracks suitable for full-screen vertical UI.
2. Reuse existing like / comment / play / follow APIs — no parallel social systems.
3. Replace app `feed-vibes.fixtures.ts` with live data.

---

## 2. Scope

### In scope

| # | Item |
|---|------|
| 1 | `GET /api/feed` auth + cursor pagination |
| 2 | DTO: mixUrl, cover, artist, likeCount, isLiked, caption, commentCount, genres |
| 3 | App: infinite list, preview from mixUrl, open full track in listen player |
| 4 | Wire like / follow / comments (via player) / play recording |

### Out of scope

- Personalized ranking / ML
- BPM or verified badge (not in schema)
- Share-count API (OS share only)
- Separate “save” entity (heart = Liked Songs)

---

## 3. Locked product decisions

1. Feed members are **PUBLISHED** tracks with a **mix** (`mixPath` present).
2. Order: `publishedAt desc`, then `id desc`.
3. Song heart on the rail uses existing `LikedTrack` like/unlike endpoints.
4. Comments open the global listen player (existing comments UI), not a separate sheet in v1.
5. Preview audio = signed `mixUrl` (no separate clip asset).

---

## 4. Data model (reference only)

Source of truth: `prisma/schema.prisma`. No new tables for Feed.

| Model / field | Role |
|---------------|------|
| `Track` (PUBLISHED) | Feed items |
| `LikedTrack` | `isLiked` / likeCount |
| `Follow` | `artist.isFollowing` |

---

## 5. Backend APIs

Auth + envelope: `{ success, message, data }` / `AppError`.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/feed?cursor=&limit=` | Auth. Default limit 10, max 30. `data: { items, nextCursor }` |

### Feed item DTO

```ts
{
  id, title, caption, durationMs,
  coverUrl, mixUrl,
  likeCount, commentCount, isLiked,
  publishedAt, genres,
  artist: { id, username, name, avatarUrl, isFollowing }
}
```

Related (existing):

| Method | Path |
|--------|------|
| `POST` / `DELETE` | `/api/tracks/:id/like` |
| `POST` | `/api/tracks/:id/play` |
| `GET` / `POST` | `/api/tracks/:id/comments` |
| `POST` / `DELETE` | `/api/users/:id/follow` |

---

## 6. Business rules (service)

- Only `status = PUBLISHED` and `publishedAt != null` and `mixPath != null`.
- Invalid cursor → `400 BAD_REQUEST`.
- Viewer likes and follow edges loaded in the same response (no N+1 per card for flags).

---

## 7. Architecture notes

```text
App FeedScreen → GET /api/feed → feed.service → Prisma Track
  like / play / follow → existing modules
```

---

## 8. Backend code map

| Area | Path |
|------|------|
| Service | `src/server/modules/feed/feed.service.ts` |
| Validator | `src/server/modules/feed/feed.validator.ts` |
| Route | `src/app/api/feed/route.ts` |
| OpenAPI | `src/server/openapi/paths/feed.paths.ts` |

---

## 9. Mobile app

### Flows

- Vertical paging list; active card previews `mixUrl`.
- Open Full Track → listen player with real track UUID + mixUrl (records play).
- Like / Follow call existing hooks; comments → push `/player`.

### Code map

| Area | Path |
|------|------|
| Feature | `src/features/feed/` |
| API | `src/features/feed/api/` |

---

## 10. Defaults

| Topic | v1 default |
|-------|------------|
| Page size | 10 |
| Ranking | newest published |
| Preview | full mix stream |

---

## 11. Task list

### Backend

- [x] Feed service + route + OpenAPI

### App

- [x] Replace fixtures with API
- [x] Wire like / follow / play / comments navigation

### Docs / polish

- [x] Feature doc + project-context status
- [x] Unit tests (cursor validation + page mapping)

---

## 12. Non-goals reminder

- No Superpowered / studio changes
- No share-count or BPM fields
