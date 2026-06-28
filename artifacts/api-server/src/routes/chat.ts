import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable } from "@workspace/db/schema";
import { eq, or, and, asc, desc, ne, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { chatTokens } from "../lib/ws-server";

const router = Router();

/* ── USER ENDPOINTS ── */

router.post("/chat/token", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ chatBanned: usersTable.chatBanned })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));

  if (user?.chatBanned) {
    res.status(403).json({ error: "You have been banned from the chat feature." });
    return;
  }

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
      chatBanned: usersTable.chatBanned,
    })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));

  res.json(users.filter((u) => u.role !== "admin" && u.id !== req.session.userId));
});

/* ── ADMIN ENDPOINTS ── */

router.get("/admin/chat/users", requireAdmin, async (req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      surname: usersTable.surname,
      email: usersTable.email,
      avatar: usersTable.avatar,
      chatBanned: usersTable.chatBanned,
    })
    .from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(asc(usersTable.firstName));

  res.json(users);
});

router.get("/admin/chat/conversations", requireAdmin, async (req, res) => {
  const allMsgs = await db
    .select({
      id: chatMessagesTable.id,
      senderId: chatMessagesTable.senderId,
      receiverId: chatMessagesTable.receiverId,
      message: chatMessagesTable.message,
      createdAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(2000);

  if (!allMsgs.length) { res.json([]); return; }

  const pairMap = new Map<string, { userA: number; userB: number; count: number; lastAt: Date; lastMessage: string }>();
  for (const m of allMsgs) {
    const a = Math.min(m.senderId, m.receiverId);
    const b = Math.max(m.senderId, m.receiverId);
    const key = `${a}_${b}`;
    if (!pairMap.has(key)) {
      pairMap.set(key, { userA: a, userB: b, count: 1, lastAt: m.createdAt, lastMessage: m.message });
    } else {
      pairMap.get(key)!.count++;
    }
  }

  const pairs = [...pairMap.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()).slice(0, 100);
  const ids = [...new Set(pairs.flatMap((p) => [p.userA, p.userB]))];

  if (!ids.length) { res.json([]); return; }

  const usersRows = await db
    .select({ id: usersTable.id, firstName: usersTable.firstName, surname: usersTable.surname, avatar: usersTable.avatar })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::int[])`);

  const userMap = Object.fromEntries(usersRows.map((u) => [u.id, u]));

  res.json(
    pairs.map((p) => ({
      userA: userMap[p.userA] ?? null,
      userB: userMap[p.userB] ?? null,
      messageCount: p.count,
      lastAt: p.lastAt,
      lastMessage: p.lastMessage,
    })),
  );
});

router.get("/admin/chat/messages/:userId1/:userId2", requireAdmin, async (req, res) => {
  const a = parseInt(req.params.userId1 as string, 10);
  const b = parseInt(req.params.userId2 as string, 10);
  if (isNaN(a) || isNaN(b)) { res.status(400).json({ error: "Invalid ids" }); return; }

  const messages = await db
    .select({
      id: chatMessagesTable.id,
      senderId: chatMessagesTable.senderId,
      receiverId: chatMessagesTable.receiverId,
      message: chatMessagesTable.message,
      createdAt: chatMessagesTable.createdAt,
      senderFirstName: usersTable.firstName,
      senderSurname: usersTable.surname,
    })
    .from(chatMessagesTable)
    .innerJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(
      or(
        and(eq(chatMessagesTable.senderId, a), eq(chatMessagesTable.receiverId, b)),
        and(eq(chatMessagesTable.senderId, b), eq(chatMessagesTable.receiverId, a)),
      ),
    )
    .orderBy(asc(chatMessagesTable.createdAt))
    .limit(500);

  res.json(messages);
});

router.post("/admin/chat/ban/:userId", requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  await db.update(usersTable).set({ chatBanned: true }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.delete("/admin/chat/ban/:userId", requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.userId as string, 10);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  await db.update(usersTable).set({ chatBanned: false }).where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

export default router;
