import webpush from "web-push";
import { db, pushSubscriptionsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@meridianflow.site";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  message: string;
  url?: string;
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
    } catch (err: any) {
      // 410 Gone = subscription expired/unsubscribed — clean it up
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
      } else {
        logger.warn({ err }, "Web push delivery failed");
      }
    }
  }
}

export async function createAndPushNotification(
  userId: number,
  title: string,
  message: string,
  url = "/",
): Promise<void> {
  await db.insert(notificationsTable).values({
    userId,
    title,
    message,
    isRead: false,
    isBroadcast: false,
  });
  await sendPushToUser(userId, { title, message, url });
}
