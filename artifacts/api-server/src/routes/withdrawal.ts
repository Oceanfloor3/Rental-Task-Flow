import { Router, type IRouter } from "express";
import { db, withdrawalRequestsTable, usersTable, withdrawalSettingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { RequestWithdrawalBody, GetWithdrawalHistoryResponse, GetWithdrawalHistoryResponseItem, GetWithdrawalLockStatusResponse } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { broadcastAdminEvent } from "../lib/admin-sse";

const router: IRouter = Router();

function computeUserUnlockAt(userCreatedAt: Date, lockDays: number): Date | null {
  if (lockDays <= 0) return null;
  return new Date(userCreatedAt.getTime() + lockDays * 24 * 60 * 60 * 1000);
}

function getLevelKey(levelStr: string | null | undefined): string | null {
  if (!levelStr) return null;
  const upper = levelStr.toUpperCase();
  for (let i = 11; i >= 0; i--) {
    if (upper.includes(`V${i}`)) return `V${i}`;
  }
  return null;
}

const WEDNESDAY_LEVELS = ["V0", "V1", "V2", "V3", "V4", "V5", "V6"];
const FRIDAY_LEVELS = ["V7", "V8", "V9", "V10", "V11"];

// WAT = UTC+1.  Allowed windows (in UTC):
//   V1-V6 : Wednesday 11:00–23:00 UTC  (= Wed 12pm–Thu midnight WAT)
//   V7-V11: Friday   11:00–23:00 UTC  (= Fri 12pm–Sat midnight WAT)
function isWithinAutoScheduleWindow(levelKey: string | null): boolean {
  if (!levelKey) return false;
  const now = new Date();
  const utcDay = now.getUTCDay();   // 0=Sun 1=Mon … 3=Wed 5=Fri
  const utcHour = now.getUTCHours();
  if (WEDNESDAY_LEVELS.includes(levelKey)) {
    return utcDay === 3 && utcHour >= 11 && utcHour < 23;
  }
  if (FRIDAY_LEVELS.includes(levelKey)) {
    return utcDay === 5 && utcHour >= 11 && utcHour < 23;
  }
  return false;
}

router.get("/withdrawal/lock-status", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.withdrawalLocked) {
    res.json(GetWithdrawalLockStatusResponse.parse({ locked: true, reason: "personal", unlockAt: null }));
    return;
  }

  const [settings] = await db.select().from(withdrawalSettingsTable).limit(1);

  // Manual lock (simple toggle — highest priority after per-user lock)
  if (settings?.manualLocked) {
    res.json(GetWithdrawalLockStatusResponse.parse({ locked: true, reason: "manual", unlockAt: null }));
    return;
  }

  // Auto schedule — withdrawals only open during designated time windows per level
  if (settings?.autoScheduleEnabled) {
    const levelKey = getLevelKey(user.level);
    if (!isWithinAutoScheduleWindow(levelKey)) {
      res.json(GetWithdrawalLockStatusResponse.parse({ locked: true, reason: "schedule", unlockAt: null }));
      return;
    }
  }

  // Legacy master lock (time-based)
  if (settings?.masterLocked) {
    const now = new Date();
    const unlockAt = computeUserUnlockAt(user.createdAt, settings.lockDays);
    const isExpired = unlockAt ? now >= unlockAt : false;
    if (!isExpired) {
      res.json(GetWithdrawalLockStatusResponse.parse({
        locked: true,
        reason: "master",
        unlockAt: unlockAt?.toISOString() ?? null,
      }));
      return;
    }
  }

  res.json(GetWithdrawalLockStatusResponse.parse({ locked: false, reason: null, unlockAt: null }));
});

router.post("/withdrawal/request", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = RequestWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.withdrawalLocked) {
    res.status(403).json({ error: "Your withdrawals have been restricted. Please contact support." });
    return;
  }

  const [settings] = await db.select().from(withdrawalSettingsTable).limit(1);

  if (settings?.manualLocked) {
    res.status(403).json({ error: "Withdrawals are currently locked by the administrator." });
    return;
  }

  if (settings?.autoScheduleEnabled) {
    const levelKey = getLevelKey(user.level);
    if (!isWithinAutoScheduleWindow(levelKey)) {
      const levelGroup = WEDNESDAY_LEVELS.includes(levelKey ?? "") ? "Wednesday" : FRIDAY_LEVELS.includes(levelKey ?? "") ? "Friday" : null;
      const msg = levelGroup
        ? `Your withdrawal window opens every ${levelGroup} at 12:00 PM (WAT).`
        : "Your withdrawal window is not currently open.";
      res.status(403).json({ error: `Withdrawals are scheduled. ${msg}` });
      return;
    }
  }

  if (settings?.masterLocked) {
    const now = new Date();
    const unlockAt = computeUserUnlockAt(user.createdAt, settings.lockDays);
    const isExpired = unlockAt ? now >= unlockAt : false;
    if (!isExpired) {
      const unlockMsg = unlockAt
        ? ` Your withdrawals unlock on ${unlockAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}.`
        : "";
      res.status(403).json({ error: `Withdrawals are currently locked by the administrator.${unlockMsg}` });
      return;
    }
  }

  if (Number(user.balance) < parsed.data.amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const [request] = await db.insert(withdrawalRequestsTable).values({
    userId,
    amount: String(parsed.data.amount),
    bankName: user.bankName,
    accountNumber: user.accountNumber,
    accountHolderName: user.accountHolderName,
    status: "pending",
    adminNote: "",
  }).returning();

  broadcastAdminEvent({
    type: "withdrawal",
    userName: `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username,
    amount: parsed.data.amount,
    bankName: user.bankName,
    accountNumber: user.accountNumber,
  });

  res.status(201).json(
    GetWithdrawalHistoryResponseItem.parse({
      id: request.id,
      userId: request.userId,
      amount: Number(request.amount),
      bankName: request.bankName,
      accountNumber: request.accountNumber,
      accountHolderName: request.accountHolderName,
      status: request.status,
      adminNote: request.adminNote,
      createdAt: request.createdAt.toISOString(),
    }),
  );
});

router.get("/withdrawal/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const requests = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.userId, userId))
    .orderBy(sql`${withdrawalRequestsTable.createdAt} DESC`);

  res.json(
    GetWithdrawalHistoryResponse.parse(
      requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        amount: Number(r.amount),
        bankName: r.bankName,
        accountNumber: r.accountNumber,
        accountHolderName: r.accountHolderName,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

export default router;
