import { Router, type IRouter } from "express";
import { db, usersTable, earningsTable, taskCompletionsTable, propertiesTable, referralsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetUserProfileResponse,
  GetUserEarningsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.get("/user/profile", async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, DEFAULT_USER_ID));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetUserProfileResponse.parse({
      id: user.id,
      phone: user.phone,
      username: user.username,
      avatar: user.avatar,
      position: user.position,
      level: user.level,
      balance: Number(user.balance),
      securityDeposit: Number(user.securityDeposit),
    }),
  );
});

router.get("/user/earnings", async (req, res): Promise<void> => {
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
    .where(eq(earningsTable.userId, DEFAULT_USER_ID));

  const [todayRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(
      sql`${earningsTable.userId} = ${DEFAULT_USER_ID} AND ${earningsTable.earningDate} = ${today}`,
    );

  const [yesterdayRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(
      sql`${earningsTable.userId} = ${DEFAULT_USER_ID} AND ${earningsTable.earningDate} = ${yesterday}`,
    );

  const [weekRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(
      sql`${earningsTable.userId} = ${DEFAULT_USER_ID} AND ${earningsTable.earningDate} >= ${weekStart}`,
    );

  const [monthRows] = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(earningsTable)
    .where(
      sql`${earningsTable.userId} = ${DEFAULT_USER_ID} AND ${earningsTable.earningDate} >= ${monthStart}`,
    );

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(
      sql`${taskCompletionsTable.userId} = ${DEFAULT_USER_ID} AND ${taskCompletionsTable.completionDate} = ${today}`,
    );

  const totalProperties = await db.select().from(propertiesTable);
  const remainingToday = Math.max(0, totalProperties.length - completedToday.length);

  const [referralRow] = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.userId, DEFAULT_USER_ID));

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
