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
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [userCountRow] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "user"));
  const [totalInvestedRow] = await db.select({ total: sql<string>`COALESCE(SUM(security_deposit), 0)` }).from(usersTable);
  const [totalCommissionRow] = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(earningsTable);
  const [pendingRow] = await db.select({ count: sql<number>`count(*)::int` }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "pending"));

  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: userCountRow?.count ?? 0,
      totalInvested: Number(totalInvestedRow?.total ?? 0),
      totalCommission: Number(totalCommissionRow?.total ?? 0) * 0.05,
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

  if (parsed.data.status === "approved") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId));
    if (user) {
      const newBalance = Math.max(0, Number(user.balance) - Number(request.amount));
      await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, request.userId));
    }

    await db.insert(notificationsTable).values({
      userId: request.userId,
      title: "Withdrawal Approved",
      message: `Your withdrawal of NGN ${Number(request.amount).toLocaleString()} has been approved and is being processed.`,
      isRead: false,
      isBroadcast: false,
    });
  } else {
    await db.insert(notificationsTable).values({
      userId: request.userId,
      title: "Withdrawal Denied",
      message: `Your withdrawal request of NGN ${Number(request.amount).toLocaleString()} was denied. ${parsed.data.adminNote ?? ""}`,
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
