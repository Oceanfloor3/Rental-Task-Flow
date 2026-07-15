import { Router, type IRouter } from "express";
import { db, usersTable, withdrawalRequestsTable, notificationsTable, earningsTable, withdrawalSettingsTable, transactionsTable, siteSettingsTable, taskCompletionsTable, propertiesTable } from "@workspace/db";
import { generateTxId } from "../lib/txid";
import { eq, sql, and, inArray } from "drizzle-orm";
import { sendTemplatedEmail, readSmtpConfig, readEmailTemplate, sendTestEmail } from "../lib/email";
import {
  GetAdminStatsResponse,
  BroadcastNotificationBody,
  GetAdminUsersResponse,
  UpdateAdminUserBody,
  UpdateAdminUserResponse,
  DeleteAdminUserResponse,
  GetAdminWithdrawalRequestsResponse,
  ProcessWithdrawalRequestBody,
  ProcessWithdrawalRequestResponse,
  ActivateUserLevelBody,
  ActivateUserLevelResponse,
  GetWithdrawalSettingsResponse,
  UpdateWithdrawalSettingsBody,
  ToggleUserWithdrawalLockBody,
  ToggleUserWithdrawalLockResponse,
  AdminBalanceAdjustBody,
  AdminBalanceAdjustResponse,
  SetFlashMessageBody,
  GetAdminFlashMessageResponse,
  SetFlashMessageResponse,
  ClearFlashMessageResponse,
  GetKorapaySettingsResponse,
  SetKorapaySettingsBody,
  SetKorapaySettingsResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";
import { addAdminClient, removeAdminClient } from "../lib/admin-sse";

const router: IRouter = Router();

router.get("/admin/events", requireAdmin, (req, res): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addAdminClient(res);

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeAdminClient(res);
  });
});

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [userCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(eq(usersTable.role, "user"));
  const [totalInvestedRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(security_deposit), 0)` })
    .from(usersTable);
  const [approvedWithdrawalsRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.status, "approved"));
  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.status, "pending"));

  const approvedTotal = Number(approvedWithdrawalsRow?.total ?? 0);
  const commissionRate = 0.10;

  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: userCountRow?.count ?? 0,
      totalInvested: Number(totalInvestedRow?.total ?? 0),
      totalCommission: approvedTotal * commissionRate,
      pendingWithdrawals: pendingRow?.count ?? 0,
    }),
  );
});

router.get("/admin/notifications", requireAdmin, async (_req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(sql`${notificationsTable.createdAt} DESC`);

  res.json(
    notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      isBroadcast: n.isBroadcast,
      isRead: n.isRead,
      imageUrl: n.imageUrl ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  );
});

router.post("/admin/notifications", requireAdmin, async (req, res): Promise<void> => {
  const parsed = BroadcastNotificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: null,
    title: parsed.data.title,
    message: parsed.data.message,
    isRead: false,
    isBroadcast: true,
    imageUrl: parsed.data.imageUrl ?? null,
  });

  res.status(201).json({ success: true, message: "Notification sent to all users" });
});

router.delete("/admin/notifications/clear-all", requireAdmin, async (_req, res): Promise<void> => {
  await db.delete(notificationsTable);
  res.json({ success: true, message: "All notifications cleared" });
});

router.delete("/admin/notifications/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  res.json({ success: true, message: "Notification deleted" });
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(sql`${usersTable.createdAt} DESC`);

  res.json(
    GetAdminUsersResponse.parse(
      users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        surname: u.surname,
        username: u.username,
        email: u.email,
        phone: u.phone,
        whatsappNumber: u.whatsappNumber,
        plainPassword: u.plainPassword,
        position: u.position,
        level: u.level,
        role: u.role,
        isActive: u.isActive,
        withdrawalLocked: u.withdrawalLocked,
        balance: Number(u.balance),
        securityDeposit: Number(u.securityDeposit),
        referralCode: u.referralCode,
        createdAt: u.createdAt.toISOString(),
        activatedLevels: (() => { try { return JSON.parse(u.activatedLevels || "[]"); } catch { return []; } })(),
      })),
    ),
  );
});

router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.position !== undefined) updateData.position = parsed.data.position;
  if (parsed.data.level !== undefined) updateData.level = parsed.data.level;
  if (parsed.data.balance !== undefined) updateData.balance = String(parsed.data.balance);
  if (parsed.data.securityDeposit !== undefined) updateData.securityDeposit = String(parsed.data.securityDeposit);
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
  if (parsed.data.surname !== undefined) updateData.surname = parsed.data.surname;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
  if (parsed.data.whatsappNumber !== undefined) { updateData.whatsappNumber = parsed.data.whatsappNumber; updateData.phone = parsed.data.whatsappNumber; }
  if (parsed.data.bankName !== undefined) updateData.bankName = parsed.data.bankName;
  if (parsed.data.accountNumber !== undefined) updateData.accountNumber = parsed.data.accountNumber;
  if (parsed.data.accountHolderName !== undefined) updateData.accountHolderName = parsed.data.accountHolderName;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    UpdateAdminUserResponse.parse({
      id: user.id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      position: user.position,
      level: user.level,
      role: user.role,
      isActive: user.isActive,
      withdrawalLocked: user.withdrawalLocked,
      balance: Number(user.balance),
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
      activatedLevels: (() => { try { return JSON.parse(user.activatedLevels || "[]"); } catch { return []; } })(),
    }),
  );
});

const LEVEL_DEPOSIT_COSTS: Record<string, number> = {
  V0: 30000,
  V1: 50000,
  V2: 100000,
  V3: 150000,
  V4: 250000,
  V5: 500000,
  V6: 1000000,
  V7: 1500000,
  V8: 2450000,
  V9: 5000000,
  V10: 10000000,
  V11: 15000000,
};

router.patch("/admin/users/:id/activate-level", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = ActivateUserLevelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let levels: string[] = [];
  try { levels = JSON.parse(user.activatedLevels || "[]"); } catch { levels = []; }

  let activationDates: Record<string, string> = {};
  try { activationDates = JSON.parse((user as any).levelActivationDates || "{}"); } catch { activationDates = {}; }

  const today = new Date().toISOString().split("T")[0]!;

  const dbSet: Record<string, unknown> = {};

  if (parsed.data.action === "activate") {
    if (!levels.includes(parsed.data.levelKey)) levels.push(parsed.data.levelKey);
    if (!activationDates[parsed.data.levelKey]) {
      activationDates[parsed.data.levelKey] = today;
    }
  } else {
    const levelCost = LEVEL_DEPOSIT_COSTS[parsed.data.levelKey] ?? 0;
    const currentDeposit = Number(user.securityDeposit ?? 0);
    const newDeposit = Math.max(0, currentDeposit - levelCost);
    dbSet.securityDeposit = String(newDeposit);
    levels = levels.filter((l) => l !== parsed.data.levelKey);
    delete activationDates[parsed.data.levelKey];
  }

  dbSet.activatedLevels = JSON.stringify(levels);
  dbSet.levelActivationDates = JSON.stringify(activationDates);

  const [updated] = await db
    .update(usersTable)
    .set(dbSet as any)
    .where(eq(usersTable.id, id))
    .returning();

  res.json(
    ActivateUserLevelResponse.parse({
      id: updated.id,
      firstName: updated.firstName,
      surname: updated.surname,
      email: updated.email,
      phone: updated.phone,
      whatsappNumber: updated.whatsappNumber,
      position: updated.position,
      level: updated.level,
      role: updated.role,
      isActive: updated.isActive,
      withdrawalLocked: updated.withdrawalLocked,
      balance: Number(updated.balance),
      referralCode: updated.referralCode,
      createdAt: updated.createdAt.toISOString(),
      activatedLevels: levels,
    }),
  );
});

router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(usersTable).where(eq(usersTable.id, id));

  res.json(DeleteAdminUserResponse.parse({ success: true, message: "User deleted" }));
});

router.post("/admin/users/:id/reset-account", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.delete(taskCompletionsTable).where(eq(taskCompletionsTable.userId, id));
  await db.delete(earningsTable).where(eq(earningsTable.userId, id));
  await db.delete(transactionsTable).where(eq(transactionsTable.userId, id));

  await db.update(usersTable).set({
    balance: "0",
    securityDeposit: "0",
    activatedLevels: "[]",
    levelActivationDates: "{}",
    level: "",
    position: "",
  }).where(eq(usersTable.id, id));

  res.json({ success: true, message: `Account reset complete for user ${id}` });
});

router.get("/admin/withdrawal-requests", requireAdmin, async (req, res): Promise<void> => {
  const requests = await db
    .select({
      id: withdrawalRequestsTable.id,
      userId: withdrawalRequestsTable.userId,
      amount: withdrawalRequestsTable.amount,
      bankName: withdrawalRequestsTable.bankName,
      accountNumber: withdrawalRequestsTable.accountNumber,
      accountHolderName: withdrawalRequestsTable.accountHolderName,
      status: withdrawalRequestsTable.status,
      createdAt: withdrawalRequestsTable.createdAt,
      firstName: usersTable.firstName,
      surname: usersTable.surname,
    })
    .from(withdrawalRequestsTable)
    .leftJoin(usersTable, eq(withdrawalRequestsTable.userId, usersTable.id))
    .orderBy(sql`${withdrawalRequestsTable.createdAt} DESC`);

  const COMM = 0.10;
  res.json(
    GetAdminWithdrawalRequestsResponse.parse(
      requests.map((r) => {
        const amt = Number(r.amount);
        const commission = r.status === "approved" ? Math.round(amt * COMM * 100) / 100 : undefined;
        const netPayout = commission !== undefined ? Math.round((amt - commission) * 100) / 100 : undefined;
        return {
          id: r.id,
          userId: r.userId,
          userName: `${r.firstName ?? ""} ${r.surname ?? ""}`.trim(),
          accountNumber: r.accountNumber,
          amount: amt,
          commission,
          netPayout,
          bankName: r.bankName,
          accountHolderName: r.accountHolderName,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    ),
  );
});

router.patch("/admin/withdrawal-requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = ProcessWithdrawalRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [request] = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.id, id));

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  await db
    .update(withdrawalRequestsTable)
    .set({
      status: parsed.data.status,
      adminNote: parsed.data.adminNote ?? "",
      processedAt: new Date(),
    })
    .where(eq(withdrawalRequestsTable.id, id));

  const COMMISSION_RATE = 0.10;

  if (parsed.data.status === "approved") {
    const requestedAmount = Number(request.amount);
    const commission = requestedAmount * COMMISSION_RATE;
    const netPayout = requestedAmount - commission;

    // Balance was already deducted at submission time — update the pending transaction to completed
    await db
      .update(transactionsTable)
      .set({
        status: "completed",
        description: `Withdrawal approved — net payout ₦${netPayout.toLocaleString()} after 10% commission (₦${commission.toLocaleString()})`,
      })
      .where(and(eq(transactionsTable.referenceId, id), eq(transactionsTable.type, "withdrawal_requested")));

    await db.insert(notificationsTable).values({
      userId: request.userId,
      title: "Withdrawal Approved ✅",
      message: `Your withdrawal request of ₦${requestedAmount.toLocaleString()} has been approved. After the 10% commission fee (₦${commission.toLocaleString()}), you will receive ₦${netPayout.toLocaleString()}.`,
      isRead: false,
      isBroadcast: false,
    });

    const [wUser] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
    if (wUser?.email) {
      sendTemplatedEmail("withdrawalCompleted", wUser.email, {
        firstName: wUser.firstName ?? "",
        surname: wUser.surname ?? "",
        amount: requestedAmount.toLocaleString(),
        commission: commission.toLocaleString(),
        netPayout: netPayout.toLocaleString(),
        bankName: request.bankName ?? "",
        accountNumber: request.accountNumber ?? "",
        accountHolderName: request.accountHolderName ?? "",
      }).catch((err: Error) => { console.error(`[email:withdrawalCompleted] ${err.message}`); });
    }
  } else {
    const deniedAmount = Number(request.amount);

    // Refund balance — it was deducted at submission
    const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
    if (userRow) {
      const refunded = Number(userRow.balance) + deniedAmount;
      await db.update(usersTable).set({ balance: String(refunded) }).where(eq(usersTable.id, request.userId));
    }

    // Update the pending transaction to denied
    await db
      .update(transactionsTable)
      .set({
        status: "denied",
        description: `Withdrawal denied${parsed.data.adminNote ? `: ${parsed.data.adminNote}` : ""} — amount refunded to balance`,
      })
      .where(and(eq(transactionsTable.referenceId, id), eq(transactionsTable.type, "withdrawal_requested")));

    await db.insert(notificationsTable).values({
      userId: request.userId,
      title: "Withdrawal Denied",
      message: `Your withdrawal request of ₦${deniedAmount.toLocaleString()} was denied. ${parsed.data.adminNote ?? ""} The amount has been refunded to your balance.`,
      isRead: false,
      isBroadcast: false,
    });
  }

  res.json(
    ProcessWithdrawalRequestResponse.parse({
      success: true,
      message: `Withdrawal ${parsed.data.status}`,
    }),
  );
});

router.delete("/admin/withdrawal-requests/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db.delete(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, message: "Withdrawal request deleted" });
});

router.get("/admin/withdrawal-settings", requireAdmin, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(withdrawalSettingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(withdrawalSettingsTable).values({ masterLocked: false, lockDays: 0 }).returning();
  }
  res.json(
    GetWithdrawalSettingsResponse.parse({
      masterLocked: settings.masterLocked,
      lockDays: settings.lockDays,
      lockedAt: settings.lockedAt?.toISOString() ?? null,
      unlockAt: settings.unlockAt?.toISOString() ?? null,
      manualLocked: settings.manualLocked ?? false,
      autoScheduleEnabled: settings.autoScheduleEnabled ?? false,
    }),
  );
});

router.patch("/admin/withdrawal-settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateWithdrawalSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { masterLocked, lockDays = 0, manualLocked, autoScheduleEnabled } = parsed.data;
  const now = new Date();
  const lockedAt = masterLocked ? now : null;
  const unlockAt = masterLocked && lockDays > 0
    ? new Date(now.getTime() + lockDays * 24 * 60 * 60 * 1000)
    : null;

  const updateData: Record<string, unknown> = { masterLocked, lockDays, lockedAt, unlockAt };
  if (manualLocked !== undefined) updateData.manualLocked = manualLocked;
  if (autoScheduleEnabled !== undefined) updateData.autoScheduleEnabled = autoScheduleEnabled;

  let [existing] = await db.select().from(withdrawalSettingsTable).limit(1);
  let settings;
  if (existing) {
    [settings] = await db
      .update(withdrawalSettingsTable)
      .set(updateData)
      .where(eq(withdrawalSettingsTable.id, existing.id))
      .returning();
  } else {
    [settings] = await db.insert(withdrawalSettingsTable).values({ masterLocked, lockDays, lockedAt, unlockAt }).returning();
  }

  res.json(
    GetWithdrawalSettingsResponse.parse({
      masterLocked: settings.masterLocked,
      lockDays: settings.lockDays,
      lockedAt: settings.lockedAt?.toISOString() ?? null,
      unlockAt: settings.unlockAt?.toISOString() ?? null,
      manualLocked: settings.manualLocked ?? false,
      autoScheduleEnabled: settings.autoScheduleEnabled ?? false,
    }),
  );
});

router.patch("/admin/users/:id/withdrawal-lock", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = ToggleUserWithdrawalLockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ withdrawalLocked: parsed.data.locked })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    ToggleUserWithdrawalLockResponse.parse({
      id: user.id,
      firstName: user.firstName,
      surname: user.surname,
      email: user.email,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      position: user.position,
      level: user.level,
      role: user.role,
      isActive: user.isActive,
      withdrawalLocked: user.withdrawalLocked,
      balance: Number(user.balance),
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
      activatedLevels: (() => { try { return JSON.parse(user.activatedLevels || "[]"); } catch { return []; } })(),
    }),
  );
});


router.post("/users/:id/balance-adjust", requireAdmin, async (req, res) => {
  const userId = parseInt(String(req.params.id), 10);
  if (isNaN(userId)) {
    return void res.status(400).json({ error: "Invalid user id" });
  }
  const body = AdminBalanceAdjustBody.safeParse(req.body);
  if (!body.success) {
    return void res.status(400).json({ error: "Invalid request body" });
  }
  const { type, amount, note } = body.data;
  if (amount <= 0) {
    return void res.status(400).json({ error: "Amount must be positive" });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return void res.status(404).json({ error: "User not found" });

  const currentBalance = Number(user.balance);
  const newBalance = type === "credit" ? currentBalance + amount : currentBalance - amount;
  if (newBalance < 0) {
    return void res.status(400).json({ error: "Insufficient balance for debit" });
  }

  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, userId));

  const description = note
    ? `Admin ${type === "credit" ? "credit" : "debit"}: ${note}`
    : `Admin ${type === "credit" ? "credit" : "debit"}`;

  await db.insert(transactionsTable).values({
    userId,
    txid: generateTxId(),
    type: type === "credit" ? "admin_credit" : "admin_debit",
    amount: String(amount),
    description,
  });

  return void res.json({ success: true, newBalance });
});

async function getOrInitSetting(key: string, defaultValue: string | null = null) {
  let [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (!row) {
    [row] = await db.insert(siteSettingsTable).values({ key, value: defaultValue }).returning();
  }
  return row;
}

router.get("/admin/lock-funds-visible", requireAdmin, async (req, res): Promise<void> => {
  const row = await getOrInitSetting("lock_funds_visible", "false");
  res.json({ enabled: row.value === "true" });
});

router.post("/admin/lock-funds-visible", requireAdmin, async (req, res): Promise<void> => {
  const { enabled } = req.body as { enabled: boolean };
  const row = await getOrInitSetting("lock_funds_visible", "false");
  const [updated] = await db
    .update(siteSettingsTable)
    .set({ value: enabled ? "true" : "false", updatedAt: new Date() })
    .where(eq(siteSettingsTable.id, row.id))
    .returning();
  res.json({ enabled: updated.value === "true" });
});

async function getOrInitFlashMessage() {
  let [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "flash_message")).limit(1);
  if (!row) {
    [row] = await db.insert(siteSettingsTable).values({ key: "flash_message", value: null }).returning();
  }
  return row;
}

router.get("/admin/flash-message", requireAdmin, async (req, res): Promise<void> => {
  const row = await getOrInitFlashMessage();
  res.json(GetAdminFlashMessageResponse.parse({ message: row.value ?? null }));
});

router.post("/admin/flash-message", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SetFlashMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const row = await getOrInitFlashMessage();
  const [updated] = await db
    .update(siteSettingsTable)
    .set({ value: parsed.data.message, updatedAt: new Date() })
    .where(eq(siteSettingsTable.id, row.id))
    .returning();
  res.json(SetFlashMessageResponse.parse({ message: updated.value ?? null }));
});

router.delete("/admin/flash-message", requireAdmin, async (req, res): Promise<void> => {
  const row = await getOrInitFlashMessage();
  const [updated] = await db
    .update(siteSettingsTable)
    .set({ value: null, updatedAt: new Date() })
    .where(eq(siteSettingsTable.id, row.id))
    .returning();
  res.json(ClearFlashMessageResponse.parse({ message: updated.value ?? null }));
});


// ── KORAPAY SETTINGS ──────────────────────────────────────────────────────────

const KORA_KEYS = [
  "korapay_mode",
  "korapay_test_secret_key", "korapay_test_public_key", "korapay_test_encryption_key",
  "korapay_live_secret_key", "korapay_live_public_key", "korapay_live_encryption_key",
] as const;

async function readKorapaySettings() {
  const rows = await db.select().from(siteSettingsTable).where(
    inArray(siteSettingsTable.key, [...KORA_KEYS]),
  );
  const map: Record<string, string> = {};
  for (const r of rows) if (r.key && r.value) map[r.key] = r.value;
  const mode = (map["korapay_mode"] ?? "off") as "test" | "live" | "off";
  return {
    mode,
    testKeys: {
      secretKey: map["korapay_test_secret_key"] ?? "",
      publicKey: map["korapay_test_public_key"] ?? "",
      encryptionKey: map["korapay_test_encryption_key"] ?? "",
    },
    liveKeys: {
      secretKey: map["korapay_live_secret_key"] ?? "",
      publicKey: map["korapay_live_public_key"] ?? "",
      encryptionKey: map["korapay_live_encryption_key"] ?? "",
    },
  };
}

async function upsertSetting(key: string, value: string) {
  const existing = await getOrInitSetting(key, value);
  if (existing.value !== value) {
    await db.update(siteSettingsTable)
      .set({ value, updatedAt: new Date() })
      .where(eq(siteSettingsTable.id, existing.id));
  }
}

router.get("/admin/korapay-settings", requireAdmin, async (_req, res): Promise<void> => {
  const settings = await readKorapaySettings();
  res.json(GetKorapaySettingsResponse.parse(settings));
});

router.put("/admin/korapay-settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SetKorapaySettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { mode, testKeys, liveKeys } = parsed.data;
  await Promise.all([
    upsertSetting("korapay_mode", mode),
    upsertSetting("korapay_test_secret_key", testKeys.secretKey),
    upsertSetting("korapay_test_public_key", testKeys.publicKey),
    upsertSetting("korapay_test_encryption_key", testKeys.encryptionKey),
    upsertSetting("korapay_live_secret_key", liveKeys.secretKey),
    upsertSetting("korapay_live_public_key", liveKeys.publicKey),
    upsertSetting("korapay_live_encryption_key", liveKeys.encryptionKey),
  ]);
  const settings = await readKorapaySettings();
  res.json(SetKorapaySettingsResponse.parse(settings));
});

// ── SMTP SETTINGS ─────────────────────────────────────────────────────────────

router.get("/admin/smtp-settings", requireAdmin, async (_req, res): Promise<void> => {
  const cfg = await readSmtpConfig();
  res.json({
    enabled: cfg.enabled,
    host: cfg.host,
    port: String(cfg.port),
    user: cfg.user,
    from: cfg.from,
    hasPassword: cfg.pass.length > 0,
  });
});

router.put("/admin/smtp-settings", requireAdmin, async (req, res): Promise<void> => {
  const { enabled, host, port, user, pass, from: fromAddr } = req.body as Record<string, unknown>;
  await Promise.all([
    upsertSetting("smtp_enabled", String(!!enabled)),
    upsertSetting("smtp_host", String(host ?? "")),
    upsertSetting("smtp_port", String(port ?? "587")),
    upsertSetting("smtp_user", String(user ?? "")),
    ...(typeof pass === "string" && pass.length > 0
      ? [upsertSetting("smtp_pass", pass)]
      : []),
    upsertSetting("smtp_from", String(fromAddr ?? "")),
  ]);
  const cfg = await readSmtpConfig();
  res.json({
    enabled: cfg.enabled,
    host: cfg.host,
    port: String(cfg.port),
    user: cfg.user,
    from: cfg.from,
    hasPassword: cfg.pass.length > 0,
  });
});

router.post("/admin/smtp-settings/test", requireAdmin, async (req, res): Promise<void> => {
  const { toEmail } = req.body as { toEmail?: string };
  if (!toEmail) {
    res.status(400).json({ error: "toEmail is required" });
    return;
  }
  try {
    await sendTestEmail(toEmail);
    res.json({ success: true, message: `Test email sent to ${toEmail}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send test email";
    res.status(500).json({ error: msg });
  }
});

// ── EMAIL TEMPLATES ────────────────────────────────────────────────────────────

type TemplateKey = "welcome" | "withdrawalRequest" | "withdrawalCompleted" | "activationDeposit" | "userTransfer" | "levelExpiry2Day" | "levelExpiry1Day";

const TEMPLATE_KEYS: TemplateKey[] = ["welcome", "withdrawalRequest", "withdrawalCompleted", "activationDeposit", "userTransfer", "levelExpiry2Day", "levelExpiry1Day"];

async function readAllTemplates() {
  const result: Record<string, { subject: string; body: string; enabled: boolean }> = {};
  await Promise.all(
    TEMPLATE_KEYS.map(async (k) => {
      result[k] = await readEmailTemplate(k);
    }),
  );
  return result as Record<TemplateKey, { subject: string; body: string; enabled: boolean }>;
}

router.get("/admin/email-templates", requireAdmin, async (_req, res): Promise<void> => {
  const templates = await readAllTemplates();
  res.json(templates);
});

router.put("/admin/email-templates", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as Record<TemplateKey, { subject: string; body: string; enabled: boolean }>;
  await Promise.all(
    TEMPLATE_KEYS.flatMap((k) => {
      const tmpl = body[k];
      if (!tmpl) return [];
      return [
        upsertSetting(`email_template_${k}_subject`, tmpl.subject ?? ""),
        upsertSetting(`email_template_${k}_body`, tmpl.body ?? ""),
        upsertSetting(`email_template_${k}_enabled`, String(tmpl.enabled !== false)),
      ];
    }),
  );
  const templates = await readAllTemplates();
  res.json(templates);
});

router.post("/admin/seed-properties", requireAdmin, async (_req, res): Promise<void> => {
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(propertiesTable);
  const existing = countRow?.count ?? 0;
  if (existing >= 500) {
    res.json({ ok: true, message: `Already seeded — ${existing} properties exist`, inserted: 0 });
    return;
  }

  const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;
  const IMAGES: Record<string, string[]> = {
    "Luxury Watch": [U("1547996160-81dfa63595aa"),U("1523170335258-f5ed11844a49"),U("1619134778706-7015d8e57dea"),U("1614164185128-e4ec99c436d7"),U("1587836374828-4dbafa94cf0e"),U("1508685096489-7aacd43bd3b1"),U("1533139502658-0198f920d8e7"),U("1548169874-53e85f753f1e"),U("1606220945770-b5b6c2c55bf1"),U("1542496658-e33a6d0d82a0"),U("1612817288484-6f916006741a"),U("1523275335684-37898b6baf30"),U("1638131855685-c6ccc63e0add"),U("1598300042247-d088f8ab3a91"),U("1583937443604-8de7d0ddc6aa"),U("1651074987779-00e73cd0a29b"),U("1624637862608-eaddf32a0d41"),U("1625998316553-e0f4e15e7f72"),U("1617038260897-41a1f14a8ca0"),U("1612817288484-6f916006741a")],
    "Diamond": [U("1515629527531-e8b5af52dce6"),U("1573408301185-9519f94816b5"),U("1596944924616-7b38e7cfac36"),U("1515562141207-7a88fb7ce338"),U("1605100804763-247f67b3557e"),U("1586500036706-41963de24d8b"),U("1602751584552-8ba73aad10e1"),U("1608042314455-ef1387b4b2e9"),U("1611652022419-a9419f74343d"),U("1634556626878-8a71b87a5e5f"),U("1559561853-2da5ee0c4e96"),U("1560264418-c4445382edbc"),U("1594495894542-a46cc73b081f"),U("1617128734662-e3e28ffa6a3a"),U("1551717519-3b56c6a0e0af"),U("1625739955846-f3bc2f7e0bbc"),U("1635367498943-2bd7b6700ce8"),U("1639047263186-36e1e6d9e06d"),U("1584302179602-e4c3d3def6e7"),U("1611591437281-460bfbe1220a")],
    "Gold Jewelry": [U("1611591437281-460bfbe1220a"),U("1599643478518-a784e5dc4c8f"),U("1535632066927-ab7c9ab60908"),U("1610296669228-602fa827fc1f"),U("1506630448388-4e683c67ddb0"),U("1620657800794-61a8d0d2a9e1"),U("1617128734662-e3e28ffa6a3a"),U("1583292650898-7d22cd27ca6f"),U("1574643156929-51ea5f1c1e57"),U("1561828995-84da52c4c5b7"),U("1627034534735-61b0ce36a0b1"),U("1618354691792-d1d42acfd860"),U("1640130783284-f4ea98e4fc94"),U("1646495771478-a9def00fb24f"),U("1651065296001-0bd20eba57f4"),U("1598302548228-f6b9b8ccc61e"),U("1636042676022-4b748b0c8fc9"),U("1567532939604-b6b5b0db2604"),U("1573841733895-3a0d476e5aa7"),U("1602752093261-1e0cc893d3c9")],
    "Gemstone": [U("1586078780430-80e60c85bb5d"),U("1601999009382-1f8c92ed1dd9"),U("1559563458-527698bf5295"),U("1583292650898-7d22cd27ca6f"),U("1615486511484-92e172cc4b0f"),U("1617038260897-41a1f14a8ca0"),U("1598300042247-d088f8ab3a91"),U("1627034534735-61b0ce36a0b1"),U("1594495894542-a46cc73b081f"),U("1584302179602-e4c3d3def6e7"),U("1636042676022-4b748b0c8fc9"),U("1646495771478-a9def00fb24f"),U("1625739955846-f3bc2f7e0bbc"),U("1635367498943-2bd7b6700ce8"),U("1639047263186-36e1e6d9e06d"),U("1563288523-a87b46b67a34"),U("1651074987779-00e73cd0a29b"),U("1624637862608-eaddf32a0d41"),U("1574643156929-51ea5f1c1e57"),U("1561828995-84da52c4c5b7")],
    "Apartment": [U("1613977257363-707ba9348227"),U("1560448204-e02f11c3d0e2"),U("1502672260266-1c1ef2d93688"),U("1493809842364-78817add7ffb"),U("1567496898669-ee935f5f647a"),U("1600596542815-ffad4c1539a9"),U("1600585154340-be6161a56a0c"),U("1512917774080-9991f1c4c750"),U("1554995207-c2c203ce0ea8"),U("1600047509358-9dc75507daeb"),U("1583847268964-b28dc8f51f92"),U("1626178793926-22b28830aa30"),U("1600607687939-ce8a6c25118c"),U("1579546929518-9e396f3cc809"),U("1524758631624-e2822b8fe9f2"),U("1558905586-8aede28cc9fc"),U("1617104678098-de229db51175"),U("1611347375006-e2b35b5a3e05"),U("1629140727571-9b5ae7ad6316"),U("1600210492486-724a4d60fe5b"),U("1600210491892-03d54b02c821"),U("1600610780220-7b6e43d9fa7b"),U("1558618666-fcd25c85cd64"),U("1564013799919-ab600027ffc6")],
    "Villa": [U("1580587771525-78b9dba3b914"),U("1600047509358-9dc75507daeb"),U("1626178793926-22b28830aa30"),U("1564013799919-ab600027ffc6"),U("1512917774080-9991f1c4c750"),U("1600585154340-be6161a56a0c"),U("1600596542815-ffad4c1539a9"),U("1613977257363-707ba9348227"),U("1527030280862-64139eacd8dc"),U("1598228723793-52759bba239c"),U("1569597503-1612c2a31cdc"),U("1523217582562-09d05ab3d74b"),U("1587582423116-ec07a6988d9d"),U("1637225202994-1dda7b46b4ed"),U("1572120360610-d8cd77542842"),U("1613490493576-4d0d6d8b3e1e")],
    "Condo": [U("1567496898669-ee935f5f647a"),U("1560448204-e02f11c3d0e2"),U("1502672260266-1c1ef2d93688"),U("1600210491892-03d54b02c821"),U("1579546929518-9e396f3cc809"),U("1554995207-c2c203ce0ea8"),U("1600607687939-ce8a6c25118c"),U("1493809842364-78817add7ffb"),U("1524758631624-e2822b8fe9f2"),U("1558905586-8aede28cc9fc"),U("1617104678098-de229db51175"),U("1611347375006-e2b35b5a3e05")],
    "Penthouse": [U("1584738766473-61c083514bf4"),U("1600210492486-724a4d60fe5b"),U("1600610780220-7b6e43d9fa7b"),U("1629140727571-9b5ae7ad6316"),U("1613977257363-707ba9348227"),U("1600596542815-ffad4c1539a9"),U("1600585154340-be6161a56a0c"),U("1502672260266-1c1ef2d93688"),U("1617104678098-de229db51175"),U("1611347375006-e2b35b5a3e05")],
    "Loft": [U("1583847268964-b28dc8f51f92"),U("1524758631624-e2822b8fe9f2"),U("1558905586-8aede28cc9fc"),U("1554995207-c2c203ce0ea8"),U("1493809842364-78817add7ffb"),U("1560448204-e02f11c3d0e2"),U("1579546929518-9e396f3cc809"),U("1600607687939-ce8a6c25118c")],
    "Residence": [U("1598228723793-52759bba239c"),U("1569597503-1612c2a31cdc"),U("1523217582562-09d05ab3d74b"),U("1512917774080-9991f1c4c750"),U("1600047509358-9dc75507daeb"),U("1564013799919-ab600027ffc6"),U("1527030280862-64139eacd8dc"),U("1587582423116-ec07a6988d9d"),U("1637225202994-1dda7b46b4ed"),U("1572120360610-d8cd77542842")],
    "Mansion": [U("1564013799919-ab600027ffc6"),U("1523217582562-09d05ab3d74b"),U("1600047509358-9dc75507daeb"),U("1580587771525-78b9dba3b914"),U("1587582423116-ec07a6988d9d"),U("1637225202994-1dda7b46b4ed"),U("1572120360610-d8cd77542842"),U("1527030280862-64139eacd8dc")],
    "Estate": [U("1564013799919-ab600027ffc6"),U("1580587771525-78b9dba3b914"),U("1598228723793-52759bba239c"),U("1626178793926-22b28830aa30"),U("1523217582562-09d05ab3d74b"),U("1527030280862-64139eacd8dc"),U("1637225202994-1dda7b46b4ed"),U("1572120360610-d8cd77542842")],
    "Suite": [U("1579546929518-9e396f3cc809"),U("1613977257363-707ba9348227"),U("1502672260266-1c1ef2d93688"),U("1560448204-e02f11c3d0e2"),U("1629140727571-9b5ae7ad6316"),U("1600210492486-724a4d60fe5b"),U("1584738766473-61c083514bf4"),U("1611347375006-e2b35b5a3e05")],
    "Studio": [U("1493809842364-78817add7ffb"),U("1558905586-8aede28cc9fc"),U("1524758631624-e2822b8fe9f2"),U("1583847268964-b28dc8f51f92"),U("1554995207-c2c203ce0ea8"),U("1600607687939-ce8a6c25118c"),U("1617104678098-de229db51175"),U("1611347375006-e2b35b5a3e05")],
    "Commercial": [U("1558618666-fcd25c85cd64"),U("1600210491892-03d54b02c821"),U("1600610780220-7b6e43d9fa7b"),U("1629140727571-9b5ae7ad6316"),U("1554995207-c2c203ce0ea8"),U("1560448204-e02f11c3d0e2"),U("1579546929518-9e396f3cc809"),U("1524758631624-e2822b8fe9f2")],
  };
  const LOCS: Record<string, string[]> = {
    "Luxury Watch": ["Geneva, Switzerland","Tokyo, Japan","New York, USA","Milan, Italy","Paris, France","Dubai, UAE","Hong Kong","London, UK","Singapore","Monaco","Los Angeles, USA","Zurich, Switzerland"],
    "Diamond": ["Antwerp, Belgium","New York, USA","Dubai, UAE","Mumbai, India","London, UK","Hong Kong","Johannesburg, SA","Tel Aviv, Israel","Geneva, Switzerland","Tokyo, Japan","Paris, France","Singapore"],
    "Gold Jewelry": ["Dubai, UAE","Mumbai, India","Istanbul, Turkey","Cairo, Egypt","Bangkok, Thailand","Lagos, Nigeria","Accra, Ghana","Nairobi, Kenya","London, UK","Paris, France","New York, USA","Milan, Italy"],
    "Gemstone": ["Jaipur, India","Colombo, Sri Lanka","Bangkok, Thailand","Nairobi, Kenya","Lusaka, Zambia","Antwerp, Belgium","New York, USA","Dubai, UAE","London, UK","Hong Kong","Singapore","Geneva, Switzerland"],
    rental: ["Victoria Island, Lagos","Lekki Phase 1, Lagos","Ikoyi, Lagos","Maitama, Abuja","Asokoro, Abuja","Wuse 2, Abuja","GRA, Port Harcourt","Trans Amadi, Port Harcourt","Banana Island, Lagos","Eko Atlantic, Lagos","Jabi, Abuja","Katampe, Abuja","Independence Layout, Enugu","GRA, Enugu","Oniru, Lagos","Ajah, Lagos","Kado Estate, Abuja","Life Camp, Abuja","Osapa London, Lagos","Chevron Drive, Lagos","Ikeja GRA, Lagos","Maryland, Lagos","Utako, Abuja","Central Business District, Abuja"],
  };
  const WATCH_BRANDS = ["Rolex Submariner","Patek Philippe Calatrava","Audemars Piguet Royal Oak","Richard Mille RM 11","Vacheron Constantin Overseas","IWC Portugieser","Jaeger-LeCoultre Reverso","Breguet Classique","Hublot Big Bang","Omega Seamaster","TAG Heuer Monaco","Cartier Santos","Panerai Luminor","Breitling Navitimer","Blancpain Fifty Fathoms","Zenith El Primero","A. Lange & Söhne Datograph","Grand Seiko Snowflake","Greubel Forsey GMT Sport","H. Moser & Cie Endeavour"];
  const WATCH_SFX = ["18K Gold Case","Rose Gold Bracelet","Diamond Bezel","Platinum Limited","Skeleton Dial","Tourbillon","Blue Dial","White Gold Edition","Anniversary Edition","Chronograph","Perpetual Calendar","GMT Edition"];
  const DIA_NAMES = ["Round Brilliant Cut","Princess Cut Solitaire","Oval Diamond Ring","Pear-Shaped Pendant","Cushion Cut Engagement","Emerald Cut Tennis","Radiant Cut Halo","Marquise Diamond Ring","Heart-Shaped Solitaire","Asscher Cut Diamond","Trillion Cut Pendant","Old Mine Cut Antique","Rose Cut Diamond","Briolette Cut Drop","European Cut Classic"];
  const DIA_CT = ["1.0ct","1.5ct","2.0ct","2.5ct","3.0ct","3.5ct","4.0ct","5.0ct","0.75ct","1.25ct","1.75ct","2.25ct"];
  const DIA_GR = ["VVS1","VVS2","VS1","VS2","FL","IF","SI1","SI2"];
  const GOLD_NAMES = ["18K Gold Chain Necklace","24K Gold Bangle Bracelet","22K Gold Hoop Earrings","14K White Gold Ring","Rose Gold Charm Bracelet","Gold Pendant Necklace","Italian Gold Rope Chain","Gold Figaro Necklace","Gold Cuban Link Chain","Gold Tennis Bracelet","Gold Choker Necklace","Gold Cuff Bracelet","Gold Signet Ring","Gold Cluster Ring","Gold Eternity Band","Gold Herringbone Chain","Gold Franco Bracelet","Gold Lariat Necklace"];
  const KARATS = ["18K","22K","24K","14K","10K"];
  const WEIGHTS = [10,15,20,25,30,40,50];
  const GEM_NAMES = ["Burmese Ruby","Colombian Emerald","Kashmir Sapphire","Alexandrite","Paraíba Tourmaline","Padparadscha Sapphire","Tsavorite Garnet","Mandarin Garnet","Tanzanite","Spinel","Demantoid Garnet","Chrome Tourmaline","Imperial Topaz","Red Spinel","Blue Zircon","Ethiopian Opal","Watermelon Tourmaline","Bi-Color Sapphire","Star Ruby Cabochon","Pigeon Blood Ruby"];
  const GEM_WT = ["2ct","3ct","4ct","5ct","6ct","8ct","10ct","1.5ct","2.5ct","3.5ct"];
  const GEM_CL = ["AAA","AA","Eye Clean","Unheated","Certified","Premium"];
  const PFX = ["Azure","Grand","Royal","Prestige","Elite","Premier","Luxe","Heritage","Skyline","Meridian","Pinnacle","Sovereign","Opulent","Majestic","Imperial","Regal","Splendid","Serene","Tranquil","Radiant","Glorious","Sublime","Magnificent","Noble","Luminary","Golden","Platinum","Diamond","Crystal","Pearl"];
  const ADJ = ["Waters","Heights","Towers","Gardens","Park","Place","Court","Square","Boulevard","Avenue","Estate","Manor","Ridge","View","Bay","Terrace","Haven","Point","Gate","Palace","Residences","Collection","Suites","Bridge"];

  const gi = (t: string, i: number) => { const p = IMAGES[t] ?? IMAGES["Apartment"]!; return p[i % p.length]!; };
  const lo = (t: string, i: number) => { const p = LOCS[t] ?? LOCS["rental"]!; return p[i % p.length]!; };

  type Row = { propertyName: string; propertyType: string; location: string; reward: string; imageUrl: string };
  const rows: Row[] = [];

  for (let i = 0; i < 150; i++) rows.push({ propertyName: `${WATCH_BRANDS[i%WATCH_BRANDS.length]} — ${WATCH_SFX[i%WATCH_SFX.length]} #${i+1}`, propertyType: "Luxury Watch", location: lo("Luxury Watch",i), reward:"100.00", imageUrl:gi("Luxury Watch",i) });
  for (let i = 0; i < 150; i++) rows.push({ propertyName: `${DIA_NAMES[i%DIA_NAMES.length]} ${DIA_CT[i%DIA_CT.length]} ${DIA_GR[i%DIA_GR.length]} #${i+1}`, propertyType: "Diamond", location: lo("Diamond",i), reward:"100.00", imageUrl:gi("Diamond",i) });
  for (let i = 0; i < 150; i++) rows.push({ propertyName: `${KARATS[i%KARATS.length]} ${GOLD_NAMES[i%GOLD_NAMES.length]} ${WEIGHTS[i%WEIGHTS.length]}g #${i+1}`, propertyType: "Gold Jewelry", location: lo("Gold Jewelry",i), reward:"100.00", imageUrl:gi("Gold Jewelry",i) });
  for (let i = 0; i < 130; i++) rows.push({ propertyName: `${GEM_NAMES[i%GEM_NAMES.length]} ${GEM_WT[i%GEM_WT.length]} ${GEM_CL[i%GEM_CL.length]} #${i+1}`, propertyType: "Gemstone", location: lo("Gemstone",i), reward:"100.00", imageUrl:gi("Gemstone",i) });
  for (const [type, count] of [["Apartment",100],["Villa",70],["Condo",55],["Penthouse",45],["Loft",35],["Residence",40],["Mansion",25],["Estate",20],["Suite",20],["Studio",10],["Commercial",10]] as [string,number][]) {
    for (let i = 0; i < count; i++) {
      const beds = type==="Studio"?"Studio":type==="Commercial"?"Office Space":`${(i%4)+1} Bed`;
      rows.push({ propertyName:`${PFX[(i*3)%PFX.length]} ${ADJ[(i*7+3)%ADJ.length]} ${type} — ${beds} #${i+1}`, propertyType:type, location:lo("rental",i), reward:"100.00", imageUrl:gi(type,i) });
    }
  }

  const BATCH = 50;
  let inserted = 0;
  for (let s = 0; s < rows.length; s += BATCH) {
    await db.insert(propertiesTable).values(rows.slice(s, s + BATCH));
    inserted += Math.min(BATCH, rows.length - s);
  }
  res.json({ ok: true, message: `Seeded ${inserted} properties`, inserted, total: existing + inserted });
});

export default router;
