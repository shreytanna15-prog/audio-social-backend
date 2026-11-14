# VibeOGram backend (`audio-social-backend`)

Before changing APIs, Prisma, or OpenAPI in this repo:

1. Read **`docs/project-context.md`** (product + cross-repo map).
2. Read the relevant feature guide under **`docs/features/`** (if any).
3. Follow **`.agents/skills/audio-backend-api-patterns/SKILL.md`** (this repo’s coding SSOT).
4. Use supporting skills only as secondary: `route-handlers`, `prisma-cli`, `prisma-client-api`, `prisma-postgres`, `prisma-upgrade-v7`.
5. Trust **`prisma/schema.prisma`** — do not invent models.

Sibling app: `../audio-social-app` (Expo). Skills live under **`.agents/skills/`** only.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
