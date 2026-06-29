import { Router, type IRouter } from "express";
import { db, notificationsTable, pushSubscriptionsTable } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { GetNotificationsResponse, MarkNotificationReadResponse } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(
      or(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isBroadcast, true),
      ),
    )
    .orderBy(sql`${notificationsTable.createdAt} DESC`);

  res.json(
    GetNotificationsResponse.parse(
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        isBroadcast: n.isBroadcast,
        createdAt: n.createdAt.toISOString(),
      })),
    ),
  );
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));

  res.json({ success: true, message: "Marked as read" });
});

// Returns the VAPID public key so the frontend can subscribe
router.get("/notifications/vapid-key", requireAuth, (req, res): void => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
});

// Save a push subscription for the logged-in user
router.post("/notifications/subscribe", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { endpoint, keys } = req.body ?? {};

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription object" });
    return;
  }

  // Upsert — if endpoint already exists update user_id, otherwise insert
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { userId, p256dh: keys.p256dh, auth: keys.auth },
    });

  res.json({ success: true });
});

// Remove a push subscription (called when user unsubscribes)
router.post("/notifications/unsubscribe", requireAuth, async (req, res): Promise<void> => {
  const { endpoint } = req.body ?? {};
  if (endpoint) {
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
  }
  res.json({ success: true });
});

export default router;
