# Chat realtime Worker

Fan-out only. Next.js API remains the source of truth for messages.

## Endpoints

- `GET /health`
- `POST /notify` — backend → Worker (`x-notify-secret`)
- `GET /ws?token=...` — mobile WebSocket join

## Setup

```bash
cd workers/chat-realtime
npm install
npx wrangler secret put NOTIFY_SECRET
npx wrangler secret put REALTIME_TOKEN_SECRET
npx wrangler deploy
```

Then set on the Next API:

```env
REALTIME_WORKER_URL=https://chat-realtime.<your-subdomain>.workers.dev
REALTIME_NOTIFY_SECRET=<same as NOTIFY_SECRET>
REALTIME_TOKEN_SECRET=<same as Worker REALTIME_TOKEN_SECRET>
```
