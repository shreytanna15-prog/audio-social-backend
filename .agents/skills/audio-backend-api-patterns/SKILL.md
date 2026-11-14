---
name: audio-backend-api-patterns
description: >-
  Build or change API modules in audio-social-backend using its Next.js App
  Router, TypeScript, Zod, Prisma, route()/withAuth, AppError, OpenAPI registry,
  object-storage helpers, and server module conventions. Use when adding or
  changing routes, endpoints, validators, services, Prisma models/migrations,
  OpenAPI paths, storage uploads, or backend integrations in this repository.
---

# Audio Backend API Patterns

Use this skill for **all backend API work** in `audio-social-backend`. Treat the existing codebase and the user’s stated conventions as authoritative.

**Golden example module:** `src/server/modules/project/` plus routes under `src/app/api/projects/`. Prefer cloning that shape over the large `track` module unless you are changing tracks specifically.

Do **not** apply Express / Habit Server layouts (no `controller` / `repository` layers, no `src/module` mounting via `router.ts`) unless the user explicitly asks to introduce them.

### Conflict resolution (skill precedence)

| Concern | Follow |
|---------|--------|
| Module layout, `route().use(withAuth)`, envelopes, OpenAPI registry, storage adapter, product rules | **This skill** + `docs/` + `prisma/schema.prisma` |
| Prisma schema / migrate / client query style (v7) | `prisma-cli`, `prisma-client-api`, `prisma-postgres`, `prisma-upgrade-v7` — **adapt** to this repo’s `src/server/config/prisma` + modules |
| Next.js `route.ts` mechanics (methods, `params`, Request/Response) | `route-handlers` — **secondary**; still wire handlers through `route()` + validators + services here |
| Fullstack RSC / Server Actions / shadcn Next apps | **Do not apply** — this backend is mobile API route handlers |
| Supabase Auth / RLS-as-app-backend | **Do not apply** — JWT auth + Prisma; Supabase is DB host + object storage via adapter |

Agent skills live under **`.agents/skills/`** only.

---

## Current stack and sources of truth

- **Framework:** Next.js App Router API routes (`src/app/api/**/route.ts`), TypeScript.
- **Validation:** Zod (v4). Import the OpenAPI-extended instance from `@/server/lib/zod` (not raw `zod`) when schemas are registered for OpenAPI.
- **Database:** PostgreSQL via Prisma 7 + `@prisma/adapter-pg`. Schema and migrations define persisted data: `prisma/schema.prisma`, `prisma/migrations/`.
- **Generated client:** `@/generated/prisma` (and `@/generated/prisma/client`). Do not hand-edit generated output.
- **IDs:** UUIDv7 — `@default(uuid(7)) @db.Uuid`.
- **Auth:** JWT Bearer via `withAuth`. Email/password today; do not invent OAuth unless asked.
- **Aliases:** `@/*` for imports from the project root mapping (e.g. `@/server/...`).
- **Product / domain rules:** `docs/project-context.md` + feature guides in `docs/*.md`. **Never invent Prisma models** that contradict `schema.prisma` or those docs.
- Generic Node/Express skills do **not** override this repository’s Next.js + module conventions.

---

## Existing source layout

```text
src/
├── app/api/                      # Next.js route handlers (HTTP edge)
│   └── <resource>/.../route.ts
├── server/
│   ├── config/                   # env, prisma, supabase, r2
│   ├── constants/                # auth, storage filenames, genres, ...
│   ├── lib/                      # jwt, zod, storage-path, object-storage, helpers
│   ├── middlewares/              # withAuth, validateBody, validateQuery
│   ├── modules/<feature>/        # domain services + validators
│   │   ├── <feature>.service.ts
│   │   └── <feature>.validator.ts
│   ├── openapi/                  # registry, schemas, paths/*.paths.ts
│   ├── types/                    # ApiRequest, ApiError shapes
│   └── utils/                    # route(), AppError, apiWrapper, common.validator
├── generated/prisma/             # generated — do not edit
prisma/
├── schema.prisma
└── migrations/
docs/                             # project-context + feature implementation guides
workers/chat-realtime/            # chat Worker (see docs/chat.md)
tests/                            # vitest unit / integration / e2e
```

Feature modules are **flat and domain-named**:

```text
src/server/modules/<feature>/
├── <feature>.service.ts      # business rules + Prisma / storage orchestration
└── <feature>.validator.ts    # Zod request schemas + inferred types
```

Some domains split services (e.g. `save/like.service.ts` + `save/save.service.ts`) when two closely related surfaces share a folder — fine when intentional; do not create speculative files.

Keep `config`, `constants`, `lib`, `middlewares`, `openapi`, `types`, and `utils` as shared roots. Add new shared folders only when genuinely shared. Keep feature-specific logic in its module.

**Routes live under `src/app/api/`**, not inside the module folder. Mirror URL structure with folders (`projects/[id]/tracks/route.ts`, etc.).

---

## Responsibility and request flow

```text
Next.js route.ts
  → route().use(middleware...).handle(handler)
      → validateBody / validateQuery (Zod)
      → withAuth (optional, usually required)
      → handler (thin): read req.user / req.body / req.localsQuery / params
          → <feature>Service method
              → prisma / object-storage / email / etc.
          → NextResponse.json({ success, message, data }, { status? })
```

- **Routes** declare exported `GET` | `POST` | `PATCH` | `PUT` | `DELETE` handlers. They wire middleware and call the service. No Prisma and no domain branching beyond HTTP mapping.
- **Validators** define Zod schemas and export inferred types (`z.infer` / exported `type CreateXSchema`). Request **shape** lives here; **domain rules** (ownership, PUBLISHED-only, etc.) live in the service.
- **Services** own business rules, ownership checks, transactions, and orchestration. Throw `AppError` for expected failures. Export a singleton instance (e.g. `export const projectService = new ProjectService()`).
- **Persistence:** import shared `prisma` from `@/server/config/prisma`. Do not add per-call `if (!prisma)` guards. Use transactions when one API must write multiple related rows atomically.
- **No controller or repository layer** in this codebase today. Do not introduce them while adding an endpoint unless the user asks.

Dynamic segment params come from the route handler’s second argument (`context.params`) — follow neighboring route files for `async` params / Next version conventions. Validate UUIDs with existing helpers such as `@/server/lib/parse-path-uuid` where used.

---

## Follow existing shared helpers

### Routing

- Build handlers with `route()` from `@/server/utils/route`.
- Chain `.use(withAuth)`, `.use(validateBody(schema))`, `.use(validateQuery(schema))`, then `.handle(async (req) => ...)`.
- `apiWrapper` (inside `route()`) maps thrown errors to JSON.

### Auth

- `withAuth` from `@/server/middlewares/with-auth` reads the Bearer access token, verifies JWT, loads the user, sets `req.user`.
- Handlers typically cast `const user = req.user as User` from `@/generated/prisma/client`.

### Validation

- `validateBody(schema)` — parses `req.json()`, assigns `req.body`.
- `validateQuery(schema)` — parses search params into **`req.localsQuery`** (not `req.query`).
- Import schemas from the feature validator. Use `@/server/lib/zod` when attaching `.openapi(...)`.

### Success response

```ts
return NextResponse.json({
  success: true,
  message: "Projects fetched successfully",
  data: projects,
});
// Create often uses { status: 201 }
```

Do not invent a competing envelope. Success bodies in this repo commonly omit a top-level `code` field (unlike some other projects).

### Errors

```ts
throw new AppError("Not found", 404, "NOT_FOUND");
// constructor: (message, status = 500, code = "INTERNAL_SERVER_ERROR")
```

`errorHandler` returns `{ success: false, code, message }` with the HTTP status. Reuse existing `StatusCodeType` values from `@/server/types/api`; do not invent a parallel error system.

### Prisma

```ts
import { prisma } from "@/server/config/prisma";
```

### Object storage

- Path builders: `@/server/lib/storage-path` (and constants in `@/server/constants/storage.config`).
- Uploads / signed URLs: object-storage adapter under `@/server/lib/object-storage` (Supabase today; R2 is the intended direction when credentials exist).
- Do not hardcode public bucket URLs or bypass the adapter for new features.

---

## OpenAPI documentation

- Spec is built from the **code registry** (`@/server/openapi/registry`, `schemas.ts`, `paths/*.paths.ts`), not a hand-edited root `openapi.json` like Habit Server.
- When adding or changing an API:
  1. Add or update `src/server/openapi/paths/<feature>.paths.ts` using `registry.registerPath` / shared schemas.
  2. **Side-effect import** the file from `src/server/openapi/paths/index.ts`.
  3. Keep paths, methods, auth (`bearerSecurity`), bodies, and responses aligned with Zod validators and real service behavior.
- Prefer reusing schemas in `openapi/schemas.ts` and `.openapi("Name")` on Zod objects.
- Do not add a second documentation system. Do not invent fields the implementation does not return.
- Run the repo’s OpenAPI generate script when that is part of the local workflow (`openapi:generate` in `package.json`) if your change requires regenerating artifacts.

---

## Project context documentation (`docs/project-context.md`)

- Do **not** update `docs/project-context.md` on every small incremental change.
- Update it when completing a **major milestone**, when cross-cutting product status changes, or when the user asks — and **ask before git commits**.
- Keep it high-level for AI transfer (architecture, domain, standards, status). Transient checklists belong in feature docs or the task at hand.
- Feature-specific API contracts and locked rules belong in `docs/<feature>.md` (e.g. `projects.md`, `publish.md`). Update those when the module’s contract changes.

---

## Module conventions (from `project` and peers)

- Filenames: lowercase, domain-prefixed, role-specific — `project.service.ts`, `project.validator.ts`.
- Export singleton service instances; routes import that instance.
- Shared code: `@/server/...`. Module-local: `./...`.
- Comments: only for non-obvious **why**; short; follow `.cursor/rules/comments.mdc`. No narrating the next line.
- Ownership: services must verify the authenticated user owns the resource (or the doc’s public-read rules). Prefer `404` when leaking existence matters (e.g. others’ private playlists).
- Idempotent toggles (like/save): follow existing `like.service` / `save.service` patterns (createMany/deleteMany style) when adding similar endpoints.
- Denormalized counts (`likeCount`, `saveCount`, `commentCount`, `playCount`): bump only when a row is actually inserted/deleted; use transactions where needed.

---

## Implementation workflow

When adding an endpoint or module:

1. Read `docs/project-context.md`, the relevant `docs/<feature>.md` (if any), `prisma/schema.prisma`, and a sibling module (`project` / `playlist` / `follow`).
2. If persistence changes: update Prisma schema + add a migration; do not invent alternate tables.
3. Add/update Zod schemas in `<feature>.validator.ts` (with `.openapi` when listed in OpenAPI).
4. Implement or extend `<feature>.service.ts` — domain rules + `AppError`.
5. Add/update `src/app/api/.../route.ts` with `route().use(withAuth)...`.
6. Add/update OpenAPI paths and import them in `paths/index.ts`.
7. Keep handlers thin; keep HTTP envelope consistent.
8. Add or update tests under `tests/` when the area already has coverage or the user asks; do not claim tests exist in docs without adding them.
9. Avoid unrelated refactors, new dependencies, speculative folders, and alternate response patterns.

---

## Minimal route shape (copy from projects)

```ts
import { NextResponse } from "next/server";
import { route } from "@/server/utils/route";
import { withAuth } from "@/server/middlewares/with-auth";
import { validateBody } from "@/server/middlewares/validate";
import { projectService } from "@/server/modules/project/project.service";
import {
    createProjectSchema,
    type CreateProjectSchema,
} from "@/server/modules/project/project.validator";
import type { User } from "@/generated/prisma/client";

export const POST = route()
    .use(withAuth)
    .use(validateBody(createProjectSchema))
    .handle(async (req) => {
        const user = req.user as User;
        const payload = req.body as CreateProjectSchema;
        const project = await projectService.createProject(user.id, payload);

        return NextResponse.json(
            {
                success: true,
                message: "Project created successfully",
                data: project,
            },
            { status: 201 }
        );
    });
```

---

## Important boundaries

- This is **Next.js App Router**, not Express. Do not add `app.ts` / `router.ts` / controllers / repositories to “match” other repos.
- Do not put mobile wizard-step endpoints in the API unless product docs require them; clients may keep draft UI state and submit once.
- Do not silently change public routes, envelopes, or schema contracts while implementing.
- Do not start deferred product areas (Feed, Notifications, Admin, Payments, Concerts, Tanpura, Recommendation) unless the user explicitly requests them — see `docs/project-context.md`.
- Studio / Superpowered / local recording pipelines live in **audio-social-app**. Do not “fix” them from this backend skill.
- Object storage: prefer the adapter + path helpers; lead direction is R2 when credentials arrive, Supabase is current.
- Treat incomplete or inconsistent older code as something to align toward these patterns when touching it — do not proliferate a third style.

---

## Quick checklist

- [ ] Schema/docs consulted; no invented models  
- [ ] Validator + service + `app/api` route  
- [ ] `withAuth` / validate middleware as appropriate  
- [ ] `AppError` for expected failures; success `{ success, message, data }`  
- [ ] OpenAPI path file + `paths/index.ts` import  
- [ ] Ownership / PUBLISHED-or-public rules match feature doc  
- [ ] No drive-by refactors; comments only when necessary  
