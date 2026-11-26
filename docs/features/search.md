# Search — Implementation Guide

**Audience:** teammates and AI agents implementing this feature end-to-end.  
**Repos:** backend (`audio-social-backend`) + mobile app (`audio-social-app`).  
**Status:** `Done` — catalog + artist + recent APIs and Instagram-like Search screen with Recent, Music, and Artists tabs wired.  
**Do not** invent Prisma models. Follow graph stays in [`./follow.md`](./follow.md). Explore body is [`./explore.md`](./explore.md).

**Related docs:** [`../project-context.md`](../project-context.md), [`./explore.md`](./explore.md), [`./follow.md`](./follow.md), [`./publish.md`](./publish.md), [`./playlists-and-albums.md`](./playlists-and-albums.md)

**Naming:**

| Term | Meaning |
|------|---------|
| **Recent** | Backend `SearchRecent` history when the query field is empty |
| **Music** | Flat mixed songs + playlists + albums (Spotify-style “Music” chip) |
| **Artists** | User / artist search only |
| **Unified music search** | Ranked mixed list from one endpoint (not three client-merged lists) |

---

## 1. Goal

1. Instagram-like Search: empty → history; typing → live results; chips filter the **same** query.
2. Chips when typing: **Music | Artists** (drop Results + Local).
3. **Music** = one flat ranked list (songs, playlists, albums).
4. **Artists** = existing user search.
5. Recent supports `ARTIST | SONG | PLAYLIST | ALBUM`; record on open/play.
6. Rework Search screen UI as needed — do not preserve Figma chips that conflict with this UX.

```mermaid
flowchart TB
  empty[Query empty] --> recent[Recent history]
  typing[Query non-empty] --> hideRecent[Hide Recent list]
  hideRecent --> chips[Music | Artists]
  chips -->|default Music| music[GET /api/search/music]
  chips -->|Artists| artists[GET /api/users/search]
```

---

## 2. Scope

### In scope

| # | Item |
|---|------|
| 1 | Instagram-like Search screen UX (may redesign current UI) |
| 2 | Empty query → Recent only |
| 3 | Non-empty → hide Recent; chips Music \| Artists; default **Music** |
| 4 | `GET /api/search/music` ranked flat mix |
| 5 | Artists chip → `GET /api/users/search` |
| 6 | Recent list / record / clear / remove (existing APIs) |
| 7 | Song row: play + `mixUrl` + record `SONG` |
| 8 | Playlist/album row: open detail + record recent + play first available track |
| 9 | Auth-required Search (app logged-in) |

### Out of scope

- Local / on-device search  
- Explore discovery rails ([`./explore.md`](./explore.md))  
- Follow button mechanics beyond navigating to artist (see [`./follow.md`](./follow.md))  
- Full player queue product (still pass `mixUrl` / first track)  
- Logged-out public search  

---

## 3. Locked product decisions

### 3.1 UX (Instagram-like — mandatory)

1. **Empty query:** show **Recent** only (clear / swipe-remove / tap to reopen). Do **not** show Music/Artists result lists.
2. **On first non-empty query:** Recent **disappears** from the results area; show filter chips **Music | Artists**.
3. Chips filter the **same** debounced `q` — switching chip does not clear the field.
4. Default chip when typing starts: **Music**.
5. Selecting **Artists** shows artist rows only; **Music** shows flat mixed catalog rows.
6. Remove chips: **Results**, **Local**. Remove “Coming soon” Local.
7. UI may change freely (layout, row components, chip strip) to match this behavior — current `search-tabs.ts` / Results≡Artists logic is obsolete.

### 3.2 Product

8. **Music** label is intentional (even though playlists/albums are included) — Spotify-style naming.
9. Music list is **flat mixed**, not three section headers. Rank **more relevant first** (server-side).
10. Per-type fetch budget ~**10** (unified limit e.g. 30 total or `limit=30` with internal caps).
11. Catalog eligibility: tracks `PUBLISHED`, playlists `PUBLIC`, albums `RELEASED`.
12. **Auth:** entire Search experience requires login (`withAuth` on search + recent). Keep as today.
13. Debounce ~**300ms** (keep).

### 3.3 Row actions

14. **Song:** `play({ id, title, artist, coverUrl, mixUrl, … })` + `POST /api/search/recent` kind `SONG`.  
15. **Playlist / album:** navigate to detail + record recent (`PLAYLIST` / `ALBUM`) + **start playback of first available member track** (with `mixUrl`). If no playable track, open detail only.  
16. **Artist** (Artists chip or recent ARTIST): record recent + `/artist/[id]`.  
17. Recent reopen: same actions by kind (resolve fresh `mixUrl` for songs if snapshot stale).

---

## 4. Data model (reference only)

| Model | Role |
|-------|------|
| `SearchRecent` + `SearchRecentKind` | Recent history (cap **20**) |
| `Track` / `Playlist` / `Album` / `User` | Search targets |

No new tables required for unified music search (query + rank in service).

---

## 5. Backend APIs

All **auth required**. Envelope `{ success, message, data }`.

### 5.1 Unified Music search (new)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/search/music?q=&limit=` | `q` min 1 trimmed; `limit` default 30, max 30 |

**Response:** ordered flat list:

```ts
type MusicSearchItem =
  | {
      type: "song";
      id: string;
      title: string;
      subtitle: string; // artist name
      coverUrl: string | null;
      mixUrl: string | null;
      playCount: number;
      artist: { id: string; username: string; name: string | null };
    }
  | {
      type: "playlist";
      id: string;
      title: string;
      subtitle: string; // owner
      coverUrl: string | null;
      trackCount: number;
      saveCount: number;
      // for “play first track” without a second round-trip when possible:
      firstTrack?: {
        id: string;
        title: string;
        mixUrl: string | null;
        coverUrl: string | null;
        artistName: string;
      } | null;
    }
  | {
      type: "album";
      id: string;
      title: string;
      subtitle: string; // artist
      coverUrl: string | null;
      trackCount: number;
      firstTrack?: { /* same shape */ } | null;
    };
```

**Ranking (v1 heuristic):**

1. Fetch candidates in parallel from existing catalog rules (title/description/owner match) — up to ~10 per type.  
2. Score each hit: stronger **prefix / exact title** match > substring; boost songs by `playCount`, playlists by `saveCount`, albums by recency/`playCount` if available.  
3. Interleave into one list by score desc (stable tie-break: type order song → playlist → album, then id).  
4. Do **not** rely on client-side merge for final order.

Existing typed endpoints (`/api/tracks|playlists|albums/search`) may remain for other clients; **Search Music chip must use `/api/search/music`**.

### 5.2 Artists (existing)

`GET /api/users/search?q=&limit=` — limit default/max as today (use ~10–20 on Artists chip).

### 5.3 Recent (existing)

| Method | Path |
|--------|------|
| `GET` | `/api/search/recent` |
| `POST` | `/api/search/recent` |
| `DELETE` | `/api/search/recent` |
| `DELETE` | `/api/search/recent/:id` |

POST body unchanged (`ARTIST` vs media kinds). Cap 20.

---

## 6. Business rules (service)

- Empty `q` → do not call music/artists search (client shows recent only).  
- Music search: only eligible catalog rows; skip unavailable first tracks in `firstTrack` (pick next available or null).  
- Recent record failures must not block navigation/playback.

---

## 7. Architecture notes

```text
Explore search bar → /(tabs)/explore/search

Empty q:
  GET /api/search/recent

Non-empty q + Music:
  GET /api/search/music?q=

Non-empty q + Artists:
  GET /api/users/search?q=

Tap song → play + POST recent SONG
Tap playlist/album → POST recent + push detail + play firstTrack
Tap artist → POST recent ARTIST + push /artist/[id]
```

---

## 8. Backend code map

| Area | Path (suggested) |
|------|------------------|
| Unified search | `src/server/modules/search/music-search.service.ts` |
| Route | `src/app/api/search/music/route.ts` |
| Reuse | `catalog-search.service.ts` helpers or shared match queries |
| Recent | `search-recent.service.ts` (existing) |
| OpenAPI | `search.paths.ts` |

### Backend implement order

1. `GET /api/search/music` + ranking + optional `firstTrack`  
2. OpenAPI  
3. Keep typed search routes unless unused later  

---

## 9. Mobile app

### UX rebuild checklist

- [ ] Replace chip model: no Results/Local; Instagram empty vs typing states  
- [ ] Default to Music when query becomes non-empty  
- [ ] Flat Music rows (type affordance: icon or small label Song/Playlist/Album)  
- [ ] Artists list unchanged in data source, polish rows as needed  
- [ ] Recent rows for all kinds; correct reopen  
- [ ] Pass `mixUrl` on play; playlist/album first-track play  

### Code map

| Area | Path |
|------|------|
| Screen | `src/features/explore/screens/search-screen.tsx` |
| Tabs (rewrite) | `src/features/explore/data/search-tabs.ts` |
| Rows | `search-artist-row`, `search-recent-row`, + music row component |
| API | `src/features/users/api` or new `src/features/search/api` for `/api/search/music` |

Prefer a dedicated `features/search` API module if Explore feature stays UI-only — optional cleanup.

---

## 10. Defaults

| Topic | v1 default |
|-------|------------|
| Debounce | 300ms |
| Empty state | Recent only |
| Typing default chip | Music |
| Music limit | 30 ranked items |
| Artists limit | 10–20 |
| Recent cap | 20 |
| Auth | Required |
| Local search | Out |

---

## 11. Task list

### Backend

- [ ] `GET /api/search/music` + ranking + `firstTrack` where possible  
- [ ] OpenAPI  
- [x] Typed catalog search + recent (already shipped; reused)  
- [x] `GET /api/users/search`  

### App

- [ ] Instagram-like Search UI/UX rewrite  
- [ ] Wire Music → `/api/search/music`  
- [ ] Wire Artists → users search  
- [ ] Recent media record + reopen for song/playlist/album  
- [ ] Song play with `mixUrl`; playlist/album detail + first track  
- [ ] Remove Results/Local chips and Coming soon  

### Docs

- [x] This guide  
- [x] Follow doc split ([`./follow.md`](./follow.md))  
- [x] `project-context` links  

---

## 12. Non-goals reminder

- Not Explore discovery body  
- Not Local/device files search  
- Not client-only merge as the long-term Music ranking  
- Not follow-list screens (follow doc)  

---

## 13. Code review notes

Baseline **2026-11-21:**

- UI still Recent | Results | Artists | Local; Results≡Artists; catalog hooks unused in Search UI.  
- `/api/tracks|playlists|albums/search` + recent exist; **no** `/api/search/music` yet.  
- Former claims in old follow+search doc that multi-kind Results were done were **overclaims**.
