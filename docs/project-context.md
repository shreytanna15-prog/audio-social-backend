# VibeOGram (Audio App) — Project Context & Architecture

> **Notice for AI Agents:** This document is the primary **product + cross-repo** source of truth for VibeOGram. Read it **before** modifying either codebase. Feature-level API contracts and locked rules live in sibling files under `docs/`. Database shape is defined only in `prisma/schema.prisma`. Do **not** invent Prisma models, storage layouts, or product rules that contradict this file or those docs.

**Working names**

| Name                   | Use                                       |
| ---------------------- | ----------------------------------------- |
| **VibeOGram**          | Product / client-facing name (may change) |
| **audio app**          | Internal / developer shorthand            |
| `audio-social-backend` | Next.js API (+ future admin)              |
| `audio-social-app`     | Expo React Native client                  |

**Repos**

| Path                                            | Role                                                       |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `C:\app-project\audio-app\audio-social-backend` | Backend API, Prisma, OpenAPI, chat Worker, future admin UI |
| `C:\app-project\audio-app\audio-social-app`     | Mobile app (studio + social UI)                            |

There are **only these two repos** for now. No shared monorepo package of types.

---

## 1. System Overview

VibeOGram is an **audio recording / editing app for artists and singers**, with **Spotify-like social listening** so casual listeners can follow artists, play published songs, build playlists, like songs, comment, and chat.

### Two product pillars

1. **Studio (creator)** — Record, import, multitrack, apply effects (Superpowered), save drafts, backup to cloud, publish a finished **mix**.
2. **Social (listener + artist)** — Profiles, follow, library (projects / playlists / albums / liked songs), publish gate, plays, comments, DMs.

### Ownership split (critical)

| Concern                                                                                                              | Owner                                   | Agents                                                                                  |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| Recording, effects, Superpowered, local files, studio UX                                                             | **App**                                 | Do **not** change Superpowered / approved effect values unless the user explicitly asks |
| Auth, users, tracks metadata, publish, projects, playlists, albums, likes/saves, comments, follow, chat, object keys | **Backend**                             | Prefer feature docs + Prisma                                                            |
| Global **listen** player (stream published mix)                                                                      | **App** (separate from studio playback) | Still incomplete; do not confuse with studio engines                                    |
| Admin dashboard                                                                                                      | **Same Next.js backend repo**           | **Later** — out of scope until requested                                                |

### Core philosophy: Track is the audio entity

- A **Track** is the first-class audio work (draft or published).
- **Project** = private workplace **folder** (many-to-many with tracks). Not an album.
- **Playlist** = listener-curated list of **PUBLISHED** tracks (anyone can create; private/public).
- **Album** = artist release of **own PUBLISHED** tracks only (DRAFT / RELEASED; one track ≤ one album).
- **Liked Songs** = song **heart** → `LikedTrack` (not a Playlist row). Same action as “save song to library.”
- **Social publish** exposes the **mix only** (one finished audio), not stems.

---

## 2. Sources of Truth (SSOT)

Agents must trust, in order:

1. **`prisma/schema.prisma`** — database models / enums (never invent alternate schemas).
2. **`docs/project-context.md`** (this file) — product, repos, domain, status, agent rules.
3. **Feature guides in `docs/features/`** — locked decisions + API surfaces for each module (assignment docs for teammates).
4. **Per-repo architecture / skills** — backend `.agents/skills/`: `audio-backend-api-patterns` (SSOT), plus `route-handlers`, `prisma-cli`, `prisma-client-api`, `prisma-postgres`, `prisma-upgrade-v7`. App: `audio-app-codebase-patterns` + kept Expo/RN skills. Product rules stay in `docs/`.

| Feature doc                                                                             | Topic                                                                              |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`docs/features/projects.md`](./features/projects.md)                                   | Private project folders                                                            |
| [`docs/features/publish.md`](./features/publish.md)                                     | Publish / unpublish / plays / cover / genres                                       |
| [`docs/features/playlists-and-albums.md`](./features/playlists-and-albums.md)           | Playlists + albums                                                                 |
| [`docs/features/library-saves.md`](./features/library-saves.md)                         | Liked Songs + save playlist/album (pilot rewritten format)                         |
| [`docs/features/track-comments.md`](./features/track-comments.md)                       | Comments, 1-level replies, comment likes                                           |
| [`docs/features/follow.md`](./features/follow.md)                                       | Follow + public profile + follower lists                                           |
| [`docs/features/search.md`](./features/search.md)                                       | Instagram-like Search (Recent / Music / Artists)                                   |
| [`docs/features/edit-profile.md`](./features/edit-profile.md)                           | Profile text + avatar/cover                                                        |
| [`docs/features/chat.md`](./features/chat.md)                                           | DMs, requests, voice notes                                                         |
| [`docs/features/admin.md`](./features/admin.md)                                         | Super admin isolation, Admin model, dedicated JWT, withAdminAuth                   |
| [`docs/features/global-player.md`](./features/global-player.md)                         | Social audio streaming, queue, 3-state loop, in-line comments, 30s play accounting |
| [`docs/features/home.md`](./features/home.md)                                           | Home discovery sections (trending, featured artists, latest project, my playlists) |
| [`docs/features/explore.md`](./features/explore.md)                                     | Explore body: all-time tops, rising, featured, public playlists (Search separate)  |
| [`docs/features/taste-and-recommendations.md`](./features/taste-and-recommendations.md) | preferredGenres + TrackPlay heuristic + Made for you tracks                        |
| [`docs/features/_TEMPLATE.md`](./features/_TEMPLATE.md)                                 | Template for new / rewritten guides                                                |

Update **this file** when product direction or cross-cutting status changes. Update **feature docs** when a module’s rules/APIs change.

---

## 3. Technology Stack

### 3.1 Backend (`audio-social-backend`)

- **Runtime:** Next.js (App Router) API routes, TypeScript.
- **DB / ORM:** PostgreSQL + Prisma 7; client output `src/generated/prisma`; IDs **UUIDv7** (`@default(uuid(7)) @db.Uuid`).
- **Validation:** Zod (v4).
- **Auth (current):** Email/password + **JWT** (`withAuth`). Social login / OAuth **not decided**.
- **Docs:** OpenAPI generated/registered under `src/server/openapi/`.
- **Email:** Resend (e.g. password reset).
- **Object storage:**
  - **Today:** Supabase Storage (tracks, covers, chat audio) via object-storage adapter.
  - **Lead decision:** move to **Cloudflare R2** when client provides credentials (better fit / cost); profile media already aimed at R2 in edit-profile work.
- **Realtime chat:** Cloudflare Worker under `workers/chat-realtime/` (see `docs/features/chat.md`).
- **Tests:** Vitest (`tests/unit`, `tests/integration`, `tests/e2e`) — coverage uneven; do not assume all feature docs’ “tests done” checkboxes are accurate.

### 3.2 App (`audio-social-app`)

- **Runtime:** Expo ~56, Expo Router, React Native, TypeScript.
- **UI:** NativeWind / Tailwind v4, shared components under `src/shared/`.
- **Data:** TanStack React Query + feature `api/` clients; Zustand for some local/player state.
- **Audio studio:** `expo-audio`, custom **`superpowered-audio`** native module, FFmpeg kit, Skia, etc.
- **Layout:** Feature folders `src/features/<domain>/` (mandatory pattern).
- **Architecture skills:** Backend `audio-backend-api-patterns` wins over `route-handlers` / Prisma skills when they conflict. App `audio-app-codebase-patterns` wins over generic Expo skills.

---

## 4. Architecture & Code Layout

### 4.1 Backend (typical)

```text
src/
├── app/api/                 # Next.js route handlers per resource
├── server/
│   ├── modules/<feature>/   # *.service.ts, *.validator.ts
│   ├── middlewares/         # withAuth, validateBody/Query
│   ├── lib/                 # storage-path, object-storage, helpers
│   ├── constants/           # storage.config, track-genres, ...
│   ├── openapi/             # paths + schemas
│   └── utils/               # route(), AppError, apiWrapper
├── generated/prisma/        # generated client (do not hand-edit)
prisma/
├── schema.prisma
└── migrations/
docs/                        # project-context + feature guides
workers/chat-realtime/       # chat realtime worker
```

**Request flow**

```text
App Router route.ts
  → route().use(withAuth).use(validateBody|Query).handle(...)
      → module service
          → Prisma / object storage
      → NextResponse.json({ success, message, data })
```

**Success envelope** (consistent):

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

**Errors:** `AppError` → global wrapper; body shaped with `success: false`, `code`, `message` (see `src/server/utils/global-error.ts`).

### 4.2 App (typical)

```text
src/
├── app/                     # Expo Router screens / tabs
├── features/<domain>/       # screens, components, api/, hooks, types
├── shared/                  # UI kit, navigation, lib
└── modules/                 # native / local packages (superpowered, input-monitor)
```

**Patterns to copy:** `features/tracks`, `features/users`, `features/projects`, `features/saves`, `features/comments`.

---

## 5. Domain Model Summary

Full detail: `prisma/schema.prisma`. Agents must not redefine these.

### User & social graph

- **User** — email, username, password hash, profile fields, avatar/cover paths.
- **Follow** — artist follow edges.
- **SearchRecent** — recent search chips (artist / song / album / playlist).
- **Conversation / Message** — DM requests + text/audio messages.

### Track & studio sync

- **Track** — `kind` (`SINGLE` | `MULTI`), `status` (`DRAFT` | `PUBLISHED`), `storageState` (`LOCAL_ONLY` | `SYNCED` | `CLOUD_ONLY`), mix/cover paths, publish meta (caption, description, genres[], keywords[]), `publishedAt`, `playCount`, `likeCount`, `commentCount`.
- **TrackLayer** — per-layer stem/source paths, timing, effects JSON, peaks.
- **TrackPlay** — play events (feeds `playCount`).

**SINGLE vs MULTI (product):**  
App-side editing modes. SINGLE = one audio timeline; MULTI = multiple layers (vocals, instruments, etc.). **Publish always ships one mix** — the finished bounce — even for MULTI.

**Storage states (backend + app sync):**

| State        | Meaning                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| `LOCAL_ONLY` | Metadata may exist on server; audio not fully backed up / dirty after edit |
| `SYNCED`     | Backup complete; eligible to publish (with cover etc.)                     |
| `CLOUD_ONLY` | Cloud copy without full local set (restore flows)                          |

Editing a `SYNCED` draft typically marks storage dirty again (`SYNCED` → `LOCAL_ONLY`) until re-backup. Exact client file layout is app-owned; cloud keys use helpers in `src/server/lib/storage-path.ts`.

**Audio files (naming):**

| File         | Role                                             |
| ------------ | ------------------------------------------------ |
| `mix.wav`    | Finished listen/publish audio                    |
| `stem.wav`   | Per-layer processed stem                         |
| `source.wav` | Per-layer pre-effect source for re-edit fidelity |

### Projects

- **Project** + **ProjectTrack** — private M2M folder. Deleting a project does not delete tracks unless an explicit delete-tracks option is used (see `docs/features/projects.md`).

### Playlists & albums

- **Playlist** / **PlaylistTrack** — `PRIVATE` | `PUBLIC`; `saveCount`.
- **Album** / **AlbumTrack** — `DRAFT` | `RELEASED`; `AlbumTrack.trackId` **globally unique** (one album per track).
- Unpublished members kept in joins → UI **Unavailable** (do not auto-remove).

### Likes & saves

- **LikedTrack** — song heart / Liked Songs; bumps **`Track.likeCount`**.
- **SavedPlaylist** / **SavedAlbum** — bookmark others’ public playlist / released album; playlist bumps **`Playlist.saveCount`**. No album save count in v1.
- Own playlist/album: **cannot** save. Own published track: **can** like.

### Comments

- **TrackComment** — max **300** chars; optional `parentId` for **one-level** reply only.
- **TrackCommentLike** — likes on comments (≠ song like).
- **Hard delete**; author only; deleting a parent cascades replies. Track owner cannot delete others’ comments in v1.
- **`Track.commentCount`** includes top-level + replies.

---

## 6. Implemented / Partial / Deferred Features

Status is approximate (~app **60–70%** overall). Nothing is fully finalized; expect polish, bugs, and rework. Prefer feature docs for API detail.

| Area                                        | Status              | Notes / doc                                                                                                                             |
| ------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Auth (email/password, JWT, password reset)  | Partial / Done-ish  | Improve structure later; social login undecided                                                                                         |
| Edit profile                                | Done                | Avatar/cover R2 + Edit Profile UI — `docs/features/edit-profile.md`                                                                     |
| Studio record / multitrack / effects        | Partial             | App + Superpowered — **do not touch** unless asked                                                                                      |
| Track create / backup / restore / delete    | Largely Done        | Track module + app sync                                                                                                                 |
| Projects                                    | Done                | `docs/features/projects.md`                                                                                                             |
| Publish / unpublish / play / cover / genres | Done                | `docs/features/publish.md`                                                                                                              |
| Playlists & albums                          | Partial             | Detail song-list shipped; remaining: ⋮ → Edit form screen (name/desc/cover), collage, reorder — `docs/features/playlists-and-albums.md` |
| Liked Songs + save playlist/album           | Partial             | Core shipped; track GET DTOs still omit `likeCount` / `isLiked` — [`library-saves.md`](./features/library-saves.md)                     |
| Track comments                              | Partial             | Core shipped; Newest/Top sort UI open — `docs/features/track-comments.md`                                                               |
| Follow + public profile                     | Done                | [`follow.md`](./features/follow.md)                                                                                                     |
| Search (Explore)                            | Done                | Instagram-like UX + Music API — [`search.md`](./features/search.md)                                                                     |
| Chat                                        | Done (core)         | `docs/features/chat.md`; Worker deploy + env; block users later                                                                         |
| Global listen player                        | Planned (Arch Done) | Streaming queue, 3-state repeat, 30s play accounting, single-track API — [`global-player.md`](./features/global-player.md)              |
| Home discovery                              | Done                | Home discovery sections (trending, featured artists, latest project, my playlists, recently played) — [`home.md`](./features/home.md) |
| Explore discovery                           | Planned             | Body fixtures → [`explore.md`](./features/explore.md); Search is a separate plan                                                        |
| Feed (reels/shorts)                         | Planned (Arch Done) | 10s–30s snippet trimmer, dedicated FeedClip model, 3-loop feed player, semi-random discovery — [`feed.md`](./features/feed.md) |
| Notifications                               | Deferred            | Fixtures only                                                                                                                           |
| Taste / Made for you                        | Planned             | Small heuristic — [`taste-and-recommendations.md`](./features/taste-and-recommendations.md) (not full ML Recommendation)                |
| Tanpura (studio)                            | Deferred            | Not started app or backend                                                                                                              |
| Concerts + rewards / coins                  | Deferred            | Not started                                                                                                                             |
| Subscriptions + payments                    | Deferred            | Not started                                                                                                                             |
| Admin (foundation)                          | Planned (Arch Done) | Separate Admin model, dedicated JWT, withAdminAuth middleware — [`admin.md`](./features/admin.md)                                      |
| Import format/limits hardening              | Open                | Still to specify fully                                                                                                                  |

### Recommended build priority (product)

1. Studio reliability
2. Publish
3. Library (projects / playlists / albums / likes)
4. Social (comments, follow, profile, chat polish)
5. Home discovery + taste / Made for you ([`home.md`](./features/home.md), [`taste-and-recommendations.md`](./features/taste-and-recommendations.md))
6. Explore body ([`explore.md`](./features/explore.md)) then Search ([`search.md`](./features/search.md))
7. Feed
8. Concerts / coins / tanpura / subscriptions / admin

---

## 7. Key Locked Product Rules

1. **Publish** requires `SYNCED` + mix + cover (+ genres/keywords rules in publish doc). While `PUBLISHED`, track audio/meta are **frozen**.
2. **Edit published work:** **unpublish → edit → re-backup if needed → publish again**. No in-place published edit for now.
3. **Social playback** = mix URL from object storage; studio uses local/Superpowered/`expo-audio` pipelines.
4. **Playlist** membership: PUBLISHED tracks only at attach time; anyone may create playlists.
5. **Album** membership: owner’s PUBLISHED tracks only; album DRAFT does **not** hide singles from public profile.
6. **Song heart** = Liked Songs (`LikedTrack`), not a second “social like” system. Comment likes are separate.
7. **Share** = OS share for MVP (no share-count API required).
8. **Chat** starts as a **message request** even if users follow each other.
9. **Follow** = artists only (no private accounts / follow requests in current scope).
10. **Unavailable** pattern: keep join/save rows when a track is unpublished or a playlist goes private / album unreleased; show Unavailable in UI.
11. **Comments:** 300 max; 1-level replies; hard delete own only; sort `newest` | `top`.
12. **Superpowered / approved DSP values:** treat as sacred unless the user explicitly requests changes.

---

## 8. Agent Rules (both repos)

1. Read **this file** + relevant **`docs/<feature>.md`** + **`schema.prisma`** before coding.
2. Do **not** invent Prisma models or rename Like/Save concepts.
3. Prefer **small diffs**; match existing module patterns (`service` + Zod + `route().use(withAuth)` on backend; feature `api/hooks` on app).
4. Comments in code: only non-obvious **why** (see `.cursor/rules/comments.mdc` / AGENTS guidance).
5. Do **not** casually rewrite Superpowered, effect presets, or native audio patches.
6. Do **not** start Feed, Notifications, Admin, Payments, Concerts, Tanpura, or Recommendation unless explicitly requested.
7. Feature API tables belong in feature docs; keep this file as the map + status + decisions.
8. When shipping a cross-cutting change, **update this doc’s status table** and the feature doc in the same PR/session when practical.
9. Other developers’ work may be incomplete or wrong — verify against docs; fix rather than invent parallel systems.
10. Follow **codebase architecture skills** in each repo’s `.agents/skills/` for folder/API patterns; do not add parallel `.claude/skills` trees.

---

## 9. Environment & Ops (high level)

- Backend local API commonly on Next ports used in `package.json` scripts (e.g. `3015` dev).
- App talks to backend via configured API base URL + JWT (SecureStore / app auth hooks).
- Never commit secrets (`.env`, credentials). Prefer documenting **names** of required env vars in feature docs, not values.
- Prisma migrations live under `prisma/migrations/` — apply with project’s usual `prisma migrate` workflow.

---

## 10. What “done” means here

The product is **actively evolving**. “Done” in a feature doc usually means:

- Schema + migrations exist
- Core APIs exist and roughly match the doc
- App may still lack polish (collage, reorder, sort UI, real player, etc.)

Always re-check code against docs before assuming a checkbox is literally complete (especially unit tests).

---

## 11. Maintenance

| When                                      | Update                                           |
| ----------------------------------------- | ------------------------------------------------ |
| New major feature planned                 | Add/adjust Deferred table + link new `docs/*.md` |
| Module ships or scope changes             | Feature doc + status row here                    |
| Storage provider switches (Supabase → R2) | §3.1 + publish/edit-profile docs                 |
| Auth gains OAuth/social login             | §3.1 + this decisions list                       |
| Architecture skills land                  | §2 + §8 pointer                                  |

**Last aligned with product discussion:** 2026-11-13 (studio + social split, unpublish-then-edit, deferred concerts/coins/tanpura/feed/subscriptions/admin, Like = Liked Songs, comments v1 locked).
