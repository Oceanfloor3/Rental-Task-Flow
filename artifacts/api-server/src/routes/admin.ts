import { Router, type IRouter } from "express";
import { db, usersTable, withdrawalRequestsTable, notificationsTable, earningsTable, withdrawalSettingsTable, transactionsTable, siteSettingsTable } from "@workspace/db";
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

  if (parsed.data.action === "activate") {
    if (!levels.includes(parsed.data.levelKey)) levels.push(parsed.data.levelKey);
    if (!activationDates[parsed.data.levelKey]) {
      activationDates[parsed.data.levelKey] = today;
    }
  } else {
    levels = levels.filter((l) => l !== parsed.data.levelKey);
    delete activationDates[parsed.data.levelKey];
  }

  const [updated] = await db
    .update(usersTable)
    .set({ activatedLevels: JSON.stringify(levels), levelActivationDates: JSON.stringify(activationDates) } as any)
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
      }).catch(() => { /* fire-and-forget */ });
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

type TemplateKey = "welcome" | "withdrawalRequest" | "withdrawalCompleted" | "activationDeposit";

const TEMPLATE_KEYS: TemplateKey[] = ["welcome", "withdrawalRequest", "withdrawalCompleted", "activationDeposit"];

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

export default router;
