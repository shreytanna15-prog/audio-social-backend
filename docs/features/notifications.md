# Notifications — Implementation Guide

**Audience:** teammates and AI agents implementing this feature end-to-end.  
**Repos:** backend (`audio-social-backend`) + mobile app (`audio-social-app`).  
**Status:** `Done` — lean inbox (FOLLOW / LIKE / COMMENT), mark-read, unread badge on Me + dedicated count endpoint; app wired.  
**Do not** invent alternate activity tables; use `Notification` in `prisma/schema.prisma`.

**Related docs:** [`../project-context.md`](../project-context.md), [`./follow.md`](./follow.md), [`./library-saves.md`](./library-saves.md), [`./track-comments.md`](./track-comments.md)

---

## 1. Goal

1. Persist in-app activity for follow / track like / track comment.
2. List + mark-read APIs and an unread badge for Home/header.
3. Replace app `notifications.fixtures.ts`.

---

## 2. Scope

### In scope

| # | Item |
|---|------|
| 1 | `Notification` model + migration |
| 2 | List (cursor) + mark-read + unread-count |
| 3 | `Me.unreadNotificationCount` |
| 4 | Emit from follow / like / comment (best-effort) |
| 5 | App inbox + header badge |

### Out of scope

- Push / email delivery
- Collab / remix / DM notification types (v1)
- Perfect fan-out / digests / aggregation (“X and 3 others”)

---

## 3. Locked product decisions

1. Types: `FOLLOW` | `LIKE` | `COMMENT` only.
2. Never notify yourself (`recipientId === actorId` skipped).
3. Emission is **best-effort** — failures must not fail the primary action.
4. Like notifies only on a **new** like row; follow only when a new edge is created.
5. Comment notifies track owner; replies also notify parent author when different.
6. Mark-read: omit/empty `ids` → mark **all** unread.

---

## 4. Data model

| Field | Role |
|-------|------|
| `recipientId` | Inbox owner |
| `actorId` | Who acted |
| `type` | FOLLOW / LIKE / COMMENT |
| `trackId` | LIKE / COMMENT |
| `commentId` | COMMENT (optional FK not enforced) |
| `readAt` | null = unread |

Migration: `20261114170000_notifications`.

---

## 5. Backend APIs

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/notifications?cursor=&limit=` | Auth. Default 30, max 50 |
| `GET` | `/api/notifications/unread-count` | `{ count }` |
| `POST` | `/api/notifications/read` | Body `{ ids?: uuid[] }` |
| `GET` | `/api/user` | Includes `unreadNotificationCount` |

### Notification item DTO

```ts
{
  id, type, createdAt, readAt,
  actor: { id, username, name, avatarUrl },
  track: { id, title, coverUrl } | null
}
```

---

## 6. Emission points

| Action | Module | Recipient |
|--------|--------|-----------|
| Follow create | `follow.service` | Followed user |
| New track like | `like.service` | Track owner |
| New comment | `comment.service` | Track owner (+ parent author on reply) |

---

## 7. Backend code map

| Area | Path |
|------|------|
| Service | `src/server/modules/notification/notification.service.ts` |
| Validator | `src/server/modules/notification/notification.validator.ts` |
| Routes | `src/app/api/notifications/**` |
| OpenAPI | `src/server/openapi/paths/notifications.paths.ts` |

---

## 8. Mobile app

| Area | Path |
|------|------|
| Feature | `src/features/notifications/` |
| Badge | Home `AppHeader` via `useMe().unreadNotificationCount` |

On inbox focus: fetch list; mark all unread as read; invalidate Me / unread count.

---

## 9. Task list

- [x] Schema + migrate
- [x] List / read / unread-count + Me field
- [x] Emit from follow / like / comment
- [x] App replace fixtures + badge
- [x] Docs
