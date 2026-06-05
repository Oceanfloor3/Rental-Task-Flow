import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, or, isNull, sql } from "drizzle-orm";
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

export default router;
