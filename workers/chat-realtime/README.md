# Chat realtime Worker

Fan-out only. Next.js API remains the source of truth for messages.

## Endpoints

- `GET /health`
- `POST /notify` — backend → Worker (`x-notify-secret`)
- `GET /ws?token=...` — mobile WebSocket join (token from `POST /api/conversations/:id/realtime-token`)

## Required secrets (Worker)

| Worker secret | Must match Next.js env |
|---------------|------------------------|
| `NOTIFY_SECRET` | `REALTIME_NOTIFY_SECRET` |
| `REALTIME_TOKEN_SECRET` | `REALTIME_TOKEN_SECRET` (or `JWT_ACCESS_SECRET` if that is unset) |

## Local development

```bash
cd workers/chat-realtime
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars — use the same secrets as audio-social-backend/.env
npm run dev
```

Wrangler prints a local URL (typically `http://127.0.0.1:8787`).

On the Next API `.env`:

```env
REALTIME_WORKER_URL=http://127.0.0.1:8787
REALTIME_NOTIFY_SECRET=<same as .dev.vars NOTIFY_SECRET>
REALTIME_TOKEN_SECRET=<same as .dev.vars REALTIME_TOKEN_SECRET>
```

Restart `next dev` after changing env. The API returns a `ws://` / `wss://` join URL to the app; REST history still works if these are unset.

Physical device → local Worker: use your LAN IP instead of `127.0.0.1` for `REALTIME_WORKER_URL` (and allow the Worker port on the firewall).

## Deploy (needs Cloudflare account + `wrangler login`)

```bash
cd workers/chat-realtime
npm install
npx wrangler secret put NOTIFY_SECRET
npx wrangler secret put REALTIME_TOKEN_SECRET
npx wrangler deploy
```

Then set on the Next API (production / preview):

```env
REALTIME_WORKER_URL=https://chat-realtime.<your-subdomain>.workers.dev
REALTIME_NOTIFY_SECRET=<same as Worker NOTIFY_SECRET>
REALTIME_TOKEN_SECRET=<same as Worker REALTIME_TOKEN_SECRET>
```

## Smoke checks

1. `GET {REALTIME_WORKER_URL}/health` → `{ "ok": true }`
2. Open a conversation in the app with both env sides configured → WS connects; send a message from another client → live append without refresh
3. With `REALTIME_*` unset → chat REST still works; notify is a no-op
