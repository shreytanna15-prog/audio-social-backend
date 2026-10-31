export interface Env {
  CONVERSATION_ROOM: DurableObjectNamespace;
  NOTIFY_SECRET: string;
  REALTIME_TOKEN_SECRET: string;
}

type NotifyBody =
  | {
      type: "message.created";
      conversationId: string;
      message: unknown;
    }
  | {
      type: "conversation.accepted" | "conversation.declined";
      conversationId: string;
    };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function verifyRealtimeToken(
  token: string,
  secret: string
): Promise<{ conversationId: string; userId: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedData = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToBytes(signatureB64);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    signedData
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payloadB64))
    ) as {
      conversationId?: string;
      userId?: string;
      purpose?: string;
      exp?: number;
    };
    if (
      payload.purpose !== "chat-realtime" ||
      !payload.conversationId ||
      !payload.userId
    ) {
      return null;
    }
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      conversationId: payload.conversationId,
      userId: payload.userId,
    };
  } catch {
    return null;
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/notify") {
      const secret = request.headers.get("x-notify-secret");
      if (!secret || secret !== env.NOTIFY_SECRET) {
        return json({ success: false, message: "Unauthorized" }, 401);
      }

      let body: NotifyBody;
      try {
        body = (await request.json()) as NotifyBody;
      } catch {
        return json({ success: false, message: "Invalid JSON" }, 400);
      }

      if (!body?.conversationId || !body?.type) {
        return json({ success: false, message: "Invalid payload" }, 400);
      }

      const id = env.CONVERSATION_ROOM.idFromName(body.conversationId);
      const stub = env.CONVERSATION_ROOM.get(id);
      await stub.fetch("https://room/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      return json({ success: true });
    }

    if (request.method === "GET" && url.pathname === "/ws") {
      const token = url.searchParams.get("token");
      if (!token) {
        return json({ success: false, message: "Missing token" }, 400);
      }

      const claims = await verifyRealtimeToken(
        token,
        env.REALTIME_TOKEN_SECRET
      );
      if (!claims) {
        return json({ success: false, message: "Invalid token" }, 401);
      }

      if (request.headers.get("Upgrade") !== "websocket") {
        return json({ success: false, message: "Expected websocket" }, 426);
      }

      const id = env.CONVERSATION_ROOM.idFromName(claims.conversationId);
      const stub = env.CONVERSATION_ROOM.get(id);
      return stub.fetch(request);
    }

    return json({ success: false, message: "Not found" }, 404);
  },
};

export class ConversationRoom {
  private sessions = new Set<WebSocket>();

  constructor(
    private readonly ctx: DurableObjectState,
    _env: Env
  ) {
    this.ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/broadcast") {
      const payload = await request.text();
      for (const socket of [...this.sessions]) {
        try {
          socket.send(payload);
        } catch {
          this.sessions.delete(socket);
        }
      }
      return json({ ok: true });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return json({ success: false, message: "Expected websocket" }, 426);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.sessions.add(server);
    server.addEventListener("close", () => {
      this.sessions.delete(server);
    });
    server.addEventListener("error", () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
