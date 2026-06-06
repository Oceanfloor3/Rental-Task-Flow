import { Router, type IRouter } from "express";
import { db, usersTable, withdrawalRequestsTable, notificationsTable, earningsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

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
  const commissionRate = 0.15;

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
        email: u.email,
        phone: u.phone,
        whatsappNumber: u.whatsappNumber,
        position: u.position,
        level: u.level,
        role: u.role,
        isActive: u.isActive,
        balance: Number(u.balance),
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

  if (parsed.data.action === "activate") {
    if (!levels.includes(parsed.data.levelKey)) levels.push(parsed.data.levelKey);
  } else {
    levels = levels.filter((l) => l !== parsed.data.levelKey);
  }

  const [updated] = await db
    .update(usersTable)
    .set({ activatedLevels: JSON.stringify(levels) })
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

  res.json(
    GetAdminWithdrawalRequestsResponse.parse(
      requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: `${r.firstName ?? ""} ${r.surname ?? ""}`.trim(),
        accountNumber: r.accountNumber,
        amount: Number(r.amount),
        bankName: r.bankName,
        accountHolderName: r.accountHolderName,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
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

  const COMMISSION_RATE = 0.15;

  if (parsed.data.status === "approved") {
    const requestedAmount = Number(request.amount);
    const commission = requestedAmount * COMMISSION_RATE;
    const netPayout = requestedAmount - commission;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
    if (user) {
      const newBalance = Math.max(0, Number(user.balance) - requestedAmount);
      await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, request.userId));
    }

    await db.insert(notificationsTable).values({
      userId: request.userId,
      title: "Withdrawal Approved ✅",
      message: `Your withdrawal request of ₦${requestedAmount.toLocaleString()} has been approved. After the 15% commission fee (₦${commission.toLocaleString()}), you will receive ₦${netPayout.toLocaleString()}.`,
      isRead: false,
      isBroadcast: false,
    });
  } else {
    await db.insert(notificationsTable).values({
      userId: request.userId,
      title: "Withdrawal Denied",
      message: `Your withdrawal request of ₦${Number(request.amount).toLocaleString()} was denied. ${parsed.data.adminNote ?? ""}`,
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

export default router;
