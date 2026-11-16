import "server-only";
import { env } from "@/server/config/env";

export type RealtimeEvent =
    | {
          type: "message.created";
          conversationId: string;
          message: Record<string, unknown>;
      }
    | {
          type: "conversation.accepted";
          conversationId: string;
      }
    | {
          type: "conversation.declined";
          conversationId: string;
      };

/**
 * Fan-out to Cloudflare Worker. No-op when Worker URL / secret are unset.
 */
export async function notifyRealtime(
    event: RealtimeEvent
): Promise<void> {
    const baseUrl = env.REALTIME_WORKER_URL;
    const secret = env.REALTIME_NOTIFY_SECRET;

    if (!baseUrl || !secret) {
        if (env.NODE_ENV === "development") {
            const partial =
                Boolean(baseUrl) !== Boolean(secret)
                    ? " (partial: set both REALTIME_WORKER_URL and REALTIME_NOTIFY_SECRET)"
                    : "";
            console.info(
                `[realtime-notify] skipped (not configured)${partial}`,
                event.type
            );
        }
        return;
    }

    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/notify`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-notify-secret": secret,
            },
            body: JSON.stringify(event),
        });

        if (!response.ok && env.NODE_ENV === "development") {
            console.warn(
                "[realtime-notify] worker responded",
                response.status,
                await response.text().catch(() => "")
            );
        }
    } catch (error) {
        if (env.NODE_ENV === "development") {
            console.warn("[realtime-notify] failed", error);
        }
    }
}
