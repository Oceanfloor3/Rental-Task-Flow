import { Router, type IRouter } from "express";
import { db, usersTable, earningsTable, taskCompletionsTable, referralsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetUserProfileResponse,
  GetUserEarningsResponse,
  UpdateUserProfileBody,
  UpdateUserProfileResponse,
  ChangePasswordBody,
  ChangePasswordResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { toUserFull } from "./auth";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

router.get("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetUserProfileResponse.parse(toUserFull(user)));
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
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));

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

  function getDailyLimit(position: string | null | undefined): number {
    if (!position) return 50;
    const upper = position.toUpperCase();
    if (upper.includes("V5")) return 300;
    if (upper.includes("V4")) return 200;
    if (upper.includes("V3")) return 150;
    if (upper.includes("V2")) return 100;
    return 50;
  }

  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const dailyLimit = getDailyLimit(userRow?.position);

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

export default router;
