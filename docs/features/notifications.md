# Notifications — Implementation Guide

**Audience:** teammates and AI agents implementing this feature end-to-end.  
**Repos:** backend (`audio-social-backend`) + mobile app (`audio-social-app`).  
**Status:** `Done` (v1 inbox) — lean inbox (FOLLOW / LIKE / COMMENT), mark-read, unread badge on Me + dedicated count endpoint; app wired.  
**Next (planned):** Contest results / win notification types — [`./contest-rewards-ux.md`](./contest-rewards-ux.md).  
**Do not** invent alternate activity tables; use `Notification` in `prisma/schema.prisma`.

**Related docs:** [`../project-context.md`](../project-context.md), [`./follow.md`](./follow.md), [`./library-saves.md`](./library-saves.md), [`./track-comments.md`](./track-comments.md), [`./contest-rewards-ux.md`](./contest-rewards-ux.md), [`./contests.md`](./contests.md)

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

- Push / email delivery (unless already free to wire; not required for contest rewards v1)
- Collab / remix / DM notification types (v1)
- Perfect fan-out / digests / aggregation (“X and 3 others”)
- Claimable-coin notification CTAs (contest payouts are auto-credit)

---

## 3. Locked product decisions

1. Types (shipped): `FOLLOW` | `LIKE` | `COMMENT`.
2. Types (planned — see [`./contest-rewards-ux.md`](./contest-rewards-ux.md)): contest **results out** (participants) and contest **won / coins credited** (winners when `creditCoins` succeeds). Exact enum names chosen at implement time to match Prisma.
3. Never notify yourself (`recipientId === actorId` skipped).
4. Emission is **best-effort** — failures must not fail the primary action (including contest payout).
5. Like notifies only on a **new** like row; follow only when a new edge is created.
6. Comment notifies track owner; replies also notify parent author when different.
7. Mark-read: omit/empty `ids` → mark **all** unread.
8. Opening a contest win notification should trigger the one-shot celebration modal and mark that notification read/seen.

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
- [ ] Contest results / win types + emission (planned — [`./contest-rewards-ux.md`](./contest-rewards-ux.md))
