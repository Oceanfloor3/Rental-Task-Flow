import { Router } from "express";
import { randomUUID } from "crypto";
import path from "path";
import multer from "multer";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable, siteSettingsTable } from "@workspace/db/schema";
import { eq, or, and, asc, desc, ne, sql, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { chatTokens, broadcastToAll } from "../lib/ws-server";
import { UPLOADS_DIR } from "../app";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

/* ── HELPERS ── */

async function getChatFeatureSettings() {
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, ["chat_enabled", "calling_enabled"]));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    chatEnabled: map["chat_enabled"] !== "false",
    callingEnabled: map["calling_enabled"] !== "false",
  };
}

/* ── USER ENDPOINTS ── */

router.post("/chat/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, name: req.file.originalname, type: req.file.mimetype });
});

router.get("/chat/settings", requireAuth, async (_req, res) => {
  res.json(await getChatFeatureSettings());
});

/**
 * Returns ICE server config (STUN + TURN) for WebRTC calls.
 * TURN is required for cross-network calls (mobile data ↔ WiFi, etc.).
 * If METERED_API_KEY env var is set, fetches fresh ephemeral credentials
 * from Metered.ca; otherwise falls back to the public Open Relay TURN servers.
 */
router.get("/chat/ice-servers", requireAuth, async (_req, res) => {
  const apiKey = process.env.METERED_API_KEY;
  if (apiKey) {
    try {
      const r = await fetch(
        `https://openrelay.metered.ca/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`,
      );
      if (r.ok) {
        const servers = await r.json() as object[];
        res.json({ iceServers: servers });
        return;
      }
    } catch { /* fall through to defaults */ }
  }

  // Free public TURN relay — Open Relay Project (openrelay.metered.ca)
  // These cover UDP port 80, UDP port 443, TCP port 443, and TLS — maximising
  // the chance of punching through any firewall or carrier-grade NAT.
  res.json({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      {
        urls: [
          "turn:openrelay.metered.ca:80",
          "turn:openrelay.metered.ca:443",
          "turn:openrelay.metered.ca:443?transport=tcp",
          "turns:openrelay.metered.ca:443",
        ],
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
  });
});

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
  const settings = await getChatFeatureSettings();
  if (!settings.chatEnabled) {
    res.json([]);
    return;
  }

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

router.get("/admin/chat-feature-settings", requireAdmin, async (_req, res) => {
  res.json(await getChatFeatureSettings());
});

router.put("/admin/chat-feature-settings", requireAdmin, async (req, res) => {
  const { chatEnabled, callingEnabled } = req.body as { chatEnabled: boolean; callingEnabled: boolean };

  for (const [key, value] of Object.entries({ chat_enabled: String(chatEnabled), calling_enabled: String(callingEnabled) })) {
    await db
      .insert(siteSettingsTable)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
  }

  broadcastToAll({ type: "settings_update", chatEnabled, callingEnabled });
  res.json({ ok: true });
});

router.get("/admin/chat/users", requireAdmin, async (_req, res) => {
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

router.get("/admin/chat/conversations", requireAdmin, async (_req, res) => {
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
