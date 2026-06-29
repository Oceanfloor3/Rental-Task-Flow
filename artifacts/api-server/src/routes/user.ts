import { Router, type IRouter } from "express";
import { db, usersTable, earningsTable, taskCompletionsTable, referralsTable, transactionsTable, siteSettingsTable, notificationsTable } from "@workspace/db";
import { generateTxId } from "../lib/txid";
import { eq, sql, desc } from "drizzle-orm";
import {
  GetUserProfileResponse,
  GetUserEarningsResponse,
  UpdateUserProfileBody,
  UpdateUserProfileResponse,
  ChangePasswordBody,
  ChangePasswordResponse,
  UpdateAvatarBody,
  UpdateAvatarResponse,
  UserTransferBody,
  UserTransferResponse,
  GetFlashMessageResponse,
  ChangePinBody,
  ChangePinResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { parseUser, getActiveLevels, getCombinedConfig, WEEKLY_TRANSFER_LIMITS, deriveLevelKeyFromPosition, resolveUserLevelKey } from "../lib/task-levels";
import { toUserFull } from "./auth";
import bcrypt from "bcryptjs";
import { sendToUser } from "../lib/ws-server";
import { sendPushToUser } from "../lib/push";

const router: IRouter = Router();

function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day); // back to Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday.toISOString();
}

router.get("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const weekStart = getWeekStart();
  const [weekTransferRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${transactionsTable.amount} AS NUMERIC)), 0)` })
    .from(transactionsTable)
    .where(sql`${transactionsTable.userId} = ${userId} AND ${transactionsTable.type} = 'transfer_sent' AND ${transactionsTable.createdAt} >= ${weekStart}`);

  const levelKey = resolveUserLevelKey(user);
  const weeklyTransferLimit = levelKey ? (WEEKLY_TRANSFER_LIMITS[levelKey] ?? WEEKLY_TRANSFER_LIMITS["V0"]) : undefined;
  const weeklyTransferUsed = Number(weekTransferRow?.total ?? 0);

  res.json(GetUserProfileResponse.parse({
    ...toUserFull(user),
    weeklyTransferUsed,
    weeklyTransferLimit,
  }));
});

router.patch("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
  if (parsed.data.middleName !== undefined) updateData.middleName = parsed.data.middleName;
  if (parsed.data.surname !== undefined) updateData.surname = parsed.data.surname;
  if (parsed.data.whatsappNumber !== undefined) updateData.whatsappNumber = parsed.data.whatsappNumber;
  if (parsed.data.homeAddress !== undefined) updateData.homeAddress = parsed.data.homeAddress;
  if (parsed.data.bankName !== undefined) updateData.bankName = parsed.data.bankName;
  if (parsed.data.accountNumber !== undefined) updateData.accountNumber = parsed.data.accountNumber;
  if (parsed.data.accountHolderName !== undefined) updateData.accountHolderName = parsed.data.accountHolderName;
  if (parsed.data.zipCode !== undefined) updateData.zipCode = parsed.data.zipCode;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId)).returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(UpdateUserProfileResponse.parse(toUserFull(user)));
});

router.patch("/user/avatar", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = UpdateAvatarBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(usersTable).set({ avatar: parsed.data.avatarUrl }).where(eq(usersTable.id, userId));
  res.json(UpdateAvatarResponse.parse({ success: true, message: "Avatar updated successfully" }));
});

router.patch("/user/password", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash, plainPassword: parsed.data.newPassword }).where(eq(usersTable.id, userId));

  res.json(ChangePasswordResponse.parse({ success: true, message: "Password changed successfully" }));
});

router.get("/user/earnings", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split("T")[0];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  const [allRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(eq(earningsTable.userId, userId));

  const [todayRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(sql`${earningsTable.userId} = ${userId} AND ${earningsTable.earningDate} = ${today}`);

  const [yesterdayRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(sql`${earningsTable.userId} = ${userId} AND ${earningsTable.earningDate} = ${yesterday}`);

  const [weekRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(sql`${earningsTable.userId} = ${userId} AND ${earningsTable.earningDate} >= ${weekStart}`);

  const [monthRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(sql`${earningsTable.userId} = ${userId} AND ${earningsTable.earningDate} >= ${monthStart}`);

  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  const { activatedLevels, activationDates } = parseUser(userRow as any);
  const activeLevels = getActiveLevels(activatedLevels, activationDates, today);
  const { tasks: dailyLimit } = getCombinedConfig(activeLevels);

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(sql`${taskCompletionsTable.userId} = ${userId} AND ${taskCompletionsTable.completionDate} = ${today}`);

  const remainingToday = Math.max(0, dailyLimit - completedToday.length);

  const [referralRow] = await db.select().from(referralsTable).where(eq(referralsTable.userId, userId));

  res.json(
    GetUserEarningsResponse.parse({
      yesterdayEarnings: Number(yesterdayRows?.total ?? 0),
      todayEarnings: Number(todayRows?.total ?? 0),
      totalEarnings: Number(allRows?.total ?? 0),
      weeklyEarnings: Number(weekRows?.total ?? 0),
      monthlyEarnings: Number(monthRows?.total ?? 0),
      completedToday: completedToday.length,
      remainingToday,
      subordinateCommission: Number(referralRow?.subordinateCommission ?? 0),
      referralBonus: Number(referralRow?.referralBonus ?? 0),
    }),
  );
});


router.get("/user/transactions", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rows = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      txid: transactionsTable.txid,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      status: transactionsTable.status,
      referenceId: transactionsTable.referenceId,
      relatedUserId: transactionsTable.relatedUserId,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(100);

  // Fetch related user names for transfers
  const relatedIds = [...new Set(rows.filter((r) => r.relatedUserId != null).map((r) => r.relatedUserId as number))];
  const relatedUsers: Record<number, string> = {};
  for (const rid of relatedIds) {
    const [u] = await db.select({ id: usersTable.id, firstName: usersTable.firstName, surname: usersTable.surname }).from(usersTable).where(eq(usersTable.id, rid)).limit(1);
    if (u) relatedUsers[u.id] = `${u.firstName} ${u.surname}`;
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      txid: r.txid,
      type: r.type,
      amount: Number(r.amount),
      description: r.description,
      status: r.status,
      referenceId: r.referenceId ?? undefined,
      relatedUserId: r.relatedUserId ?? undefined,
      relatedUserName: r.relatedUserId ? relatedUsers[r.relatedUserId] : undefined,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.post("/user/transfer", requireAuth, async (req, res): Promise<void> => {
  const senderId = req.session.userId!;
  const body = UserTransferBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { recipientUsername, amount } = body.data;
  if (amount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
  if (!sender) { res.status(404).json({ error: "Sender not found" }); return; }

  // Verify transaction PIN
  const pin = (body.data as any).transactionPin as string | undefined;
  if (!pin) {
    res.status(400).json({ error: "Transaction PIN is required" });
    return;
  }
  if (!sender.transactionPin) {
    res.status(400).json({ error: "No transaction PIN set. Please set one in your profile under Account Security." });
    return;
  }
  const pinValid = await bcrypt.compare(pin, sender.transactionPin);
  if (!pinValid) {
    res.status(401).json({ error: "Incorrect transaction PIN" });
    return;
  }

  if (Number(sender.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Enforce weekly transfer limit
  const senderLevelKey = resolveUserLevelKey(sender);
  const weeklyLimit = senderLevelKey ? (WEEKLY_TRANSFER_LIMITS[senderLevelKey] ?? WEEKLY_TRANSFER_LIMITS["V0"]) : null;
  if (weeklyLimit !== null) {
    const weekStart = getWeekStart();
    const [weekRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${transactionsTable.amount} AS NUMERIC)), 0)` })
      .from(transactionsTable)
      .where(sql`${transactionsTable.userId} = ${senderId} AND ${transactionsTable.type} = 'transfer_sent' AND ${transactionsTable.createdAt} >= ${weekStart}`);
    const weeklyUsed = Number(weekRow?.total ?? 0);
    if (weeklyUsed + amount > weeklyLimit) {
      const remaining = Math.max(0, weeklyLimit - weeklyUsed);
      res.status(400).json({
        error: `Weekly transfer limit reached. Your level allows ₦${weeklyLimit.toLocaleString()} per week. You have ₦${remaining.toLocaleString()} remaining this week.`,
      });
      return;
    }
  }

  // Find recipient by username (referral code) or email
  const allUsers = await db.select().from(usersTable);
  const recipient = allUsers.find(
    (u) =>
      u.id !== senderId &&
      (u.referralCode?.toLowerCase() === recipientUsername.toLowerCase() ||
        u.email?.toLowerCase() === recipientUsername.toLowerCase()),
  );
  if (!recipient) {
    res.status(404).json({ error: "Recipient not found. Use their username (referral code) or email." });
    return;
  }

  // Block transfers to accounts that have never activated any rank level.
  // Admin accounts are exempt. A recipient qualifies if they have ever paid
  // for at least one level — even if their 50 working days have since expired.
  if (recipient.role !== "admin") {
    let recipientEverActivated = false;

    // Check activatedLevels array (primary system)
    try {
      const levels = JSON.parse(recipient.activatedLevels || "[]");
      if (Array.isArray(levels) && levels.length > 0) recipientEverActivated = true;
    } catch { /* ignore */ }

    // Fallback: legacy position string set by admin (e.g. "V1 FOUNDATION")
    if (!recipientEverActivated && deriveLevelKeyFromPosition(recipient.position)) {
      recipientEverActivated = true;
    }

    if (!recipientEverActivated) {
      res.status(400).json({
        error: "Transfer failed. The recipient has not activated any Rank Level. They must complete at least one Activation Deposit before they can receive transfers.",
      });
      return;
    }
  }

  const newSenderBalance = Number(sender.balance) - amount;
  const newRecipientBalance = Number(recipient.balance) + amount;

  await db.update(usersTable).set({ balance: String(newSenderBalance) }).where(eq(usersTable.id, senderId));
  await db.update(usersTable).set({ balance: String(newRecipientBalance) }).where(eq(usersTable.id, recipient.id));

  await db.insert(transactionsTable).values({
    userId: senderId,
    txid: generateTxId(),
    type: "transfer_sent",
    amount: String(amount),
    description: `Transfer to ${recipient.firstName} ${recipient.surname}`,
    relatedUserId: recipient.id,
  });
  await db.insert(transactionsTable).values({
    userId: recipient.id,
    txid: generateTxId(),
    type: "transfer_received",
    amount: String(amount),
    description: `Transfer from ${sender.firstName} ${sender.surname}`,
    relatedUserId: senderId,
  });

  // Notify the recipient of the incoming transfer (DB + in-app WS + background push)
  const notifTitle = "Transfer Received 💰";
  const notifMessage = `You received ₦${amount.toLocaleString("en-NG")} from ${sender.firstName} ${sender.surname}`;
  await db.insert(notificationsTable).values({
    userId: recipient.id,
    title: notifTitle,
    message: notifMessage,
    isRead: false,
    isBroadcast: false,
  });
  sendToUser(recipient.id, { type: "notification", title: notifTitle, message: notifMessage });
  await sendPushToUser(recipient.id, { title: notifTitle, message: notifMessage, url: "/wallet" });

  res.json({
    success: true,
    message: `Successfully transferred ₦${amount.toLocaleString()} to ${recipient.firstName} ${recipient.surname}`,
    newBalance: newSenderBalance,
  });
});

router.post("/user/change-pin", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = ChangePinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { newPin, currentPin } = parsed.data;
  if (!/^\d{4}$/.test(newPin)) {
    res.status(400).json({ error: "New PIN must be exactly 4 digits" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.transactionPin) {
    if (!currentPin) {
      res.status(400).json({ error: "Current PIN is required" });
      return;
    }
    const valid = await bcrypt.compare(currentPin, user.transactionPin);
    if (!valid) {
      res.status(401).json({ error: "Incorrect current PIN" });
      return;
    }
  }
  const hash = await bcrypt.hash(newPin, 10);
  await db.update(usersTable).set({ transactionPin: hash }).where(eq(usersTable.id, userId));
  res.json(ChangePinResponse.parse({ success: true, message: "Transaction PIN updated successfully" }));
});

router.get("/lock-funds-visible", requireAuth, async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "lock_funds_visible")).limit(1);
  res.json({ enabled: row?.value === "true" });
});

router.get("/flash-message", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "flash_message")).limit(1);
  res.json(GetFlashMessageResponse.parse({ message: row?.value ?? null }));
});

export default router;
