import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable } from "@workspace/db/schema";
import { eq, or, and, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { chatTokens } from "../lib/ws-server";

const router = Router();

router.post("/chat/token", requireAuth, (req, res) => {
  const token = randomUUID();
  chatTokens.set(token, req.session.userId!);
  setTimeout(() => chatTokens.delete(token), 30_000);
  res.json({ token });
});

router.get("/chat/history/:userId", requireAuth, async (req, res) => {
  const me = req.session.userId!;
  const other = parseInt(req.params.userId as string, 10);
  if (isNaN(other)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(
      or(
        and(eq(chatMessagesTable.senderId, me), eq(chatMessagesTable.receiverId, other)),
        and(eq(chatMessagesTable.senderId, other), eq(chatMessagesTable.receiverId, me)),
      ),
    )
    .orderBy(asc(chatMessagesTable.createdAt))
    .limit(200);

  res.json(messages);
});

router.get("/chat/users", requireAuth, async (req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      surname: usersTable.surname,
      avatar: usersTable.avatar,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));

  res.json(users.filter((u) => u.role !== "admin" && u.id !== req.session.userId));
});

export default router;
