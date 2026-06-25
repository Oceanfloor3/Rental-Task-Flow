import { Router, type IRouter } from "express";
import { db, propertiesTable, taskCompletionsTable, usersTable, earningsTable, referralsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetTasksResponse,
  CompleteTaskParams,
  CompleteTaskResponse,
  GetTasksSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function dateSeed(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const LEVEL_CONFIG: Record<string, { tasks: number; income: number }> = {
  V1:  { tasks: 10,  income: 2000 },
  V2:  { tasks: 15,  income: 4000 },
  V3:  { tasks: 20,  income: 6000 },
  V4:  { tasks: 25,  income: 10000 },
  V5:  { tasks: 30,  income: 20000 },
  V6:  { tasks: 35,  income: 40000 },
  V7:  { tasks: 40,  income: 60000 },
  V8:  { tasks: 50,  income: 98000 },
  V9:  { tasks: 100, income: 200000 },
  V10: { tasks: 150, income: 400000 },
  V11: { tasks: 200, income: 600000 },
};

const LEVEL_ORDER = ["V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11"];

function countWorkingDays(startDateStr: string, todayStr: string): number {
  const start = new Date(startDateStr + "T00:00:00Z");
  const end   = new Date(todayStr   + "T00:00:00Z");
  if (start > end) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function getActiveLevels(
  activatedLevels: string[],
  activationDates: Record<string, string>,
  today: string,
): string[] {
  return activatedLevels.filter(lvl => {
    const startDate = activationDates[lvl];
    if (!startDate) return true;
    return countWorkingDays(startDate, today) <= 50;
  });
}

function getCombinedConfig(activeLevels: string[]): { tasks: number; income: number } {
  let tasks = 0;
  let income = 0;
  for (const lvl of activeLevels) {
    tasks  += LEVEL_CONFIG[lvl]?.tasks  ?? 0;
    income += LEVEL_CONFIG[lvl]?.income ?? 0;
  }
  return { tasks, income };
}

function distributeIncome(income: number, count: number, seed: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [income];
  let s = seed >>> 0;
  const rands: number[] = [];
  for (let i = 0; i < count; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    rands.push((s % 90) + 10);
  }
  const total = rands.reduce((a, b) => a + b, 0);
  const amounts = rands.map(r => Math.max(1, Math.round((r / total) * income)));
  const diff = income - amounts.reduce((a, b) => a + b, 0);
  amounts[amounts.length - 1] = Math.max(1, (amounts[amounts.length - 1] ?? 1) + diff);
  return amounts;
}

function parseUser(user: { activatedLevels: string; levelActivationDates?: string | null }) {
  let activatedLevels: string[] = [];
  try { activatedLevels = JSON.parse(user.activatedLevels || "[]"); } catch { activatedLevels = []; }

  let activationDates: Record<string, string> = {};
  try { activationDates = JSON.parse((user as any).levelActivationDates || "{}"); } catch { activationDates = {}; }

  return { activatedLevels, activationDates };
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const today = new Date().toISOString().split("T")[0]!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user?.isActive) {
    res.status(403).json({ error: "Account pending activation. Please complete your payment to unlock tasks." });
    return;
  }

  const { activatedLevels, activationDates } = parseUser(user as any);
  const activeLevels = getActiveLevels(activatedLevels, activationDates, today);
  const { tasks: dailyLimit, income: totalIncome } = getCombinedConfig(activeLevels);

  if (dailyLimit === 0) {
    res.json(GetTasksResponse.parse([]));
    return;
  }

  const properties = await db.select().from(propertiesTable);
  const shuffled = seededShuffle(properties, dateSeed(today));
  const limitedProperties = shuffled.slice(0, dailyLimit);

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(sql`${taskCompletionsTable.userId} = ${userId} AND ${taskCompletionsTable.completionDate} = ${today}`);

  const completedPropertyIds = new Set(completedToday.map((c) => c.propertyId));

  const rewards = distributeIncome(totalIncome, limitedProperties.length, dateSeed(today) ^ userId);

  const tasks = limitedProperties.map((p, idx) => ({
    id: p.id,
    propertyName: p.propertyName,
    propertyType: p.propertyType,
    location: p.location,
    reward: rewards[idx] ?? Number(p.reward),
    status: completedPropertyIds.has(p.id) ? "completed" : "pending",
    imageUrl: p.imageUrl || "",
  }));

  res.json(GetTasksResponse.parse(tasks));
});

router.post("/tasks/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CompleteTaskParams.safeParse({ id: parseInt(rawId, 10) });

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [actingUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!actingUser?.isActive) {
    res.status(403).json({ error: "Account pending activation." });
    return;
  }

  const today = new Date().toISOString().split("T")[0]!;

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, params.data.id));

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const existingCompletion = await db
    .select()
    .from(taskCompletionsTable)
    .where(sql`${taskCompletionsTable.userId} = ${userId} AND ${taskCompletionsTable.propertyId} = ${params.data.id} AND ${taskCompletionsTable.completionDate} = ${today}`);

  if (existingCompletion.length > 0) {
    res.status(400).json({ error: "Task already completed today" });
    return;
  }

  const { activatedLevels, activationDates } = parseUser(actingUser as any);
  const activeLevels = getActiveLevels(activatedLevels, activationDates, today);
  const { tasks: dailyLimit, income: totalIncome } = getCombinedConfig(activeLevels);

  const allProperties = await db.select().from(propertiesTable);
  const shuffled = seededShuffle(allProperties, dateSeed(today));
  const limitedProperties = shuffled.slice(0, dailyLimit);
  const propertyIdx = limitedProperties.findIndex(p => p.id === params.data.id);
  const rewards = distributeIncome(totalIncome, limitedProperties.length, dateSeed(today) ^ userId);
  const computedReward = (propertyIdx >= 0 && rewards[propertyIdx] != null)
    ? rewards[propertyIdx]!
    : Math.round(totalIncome / Math.max(dailyLimit, 1));

  await db.insert(taskCompletionsTable).values({
    userId,
    propertyId: params.data.id,
    completionDate: today,
    reward: String(computedReward),
  });

  await db.insert(earningsTable).values({
    userId,
    amount: String(computedReward),
    earningDate: today,
  });

  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const currentBalance = Number(userRow?.balance ?? 0);
  const newBalance = currentBalance + computedReward;

  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, userId));

  res.json(
    CompleteTaskResponse.parse({
      success: true,
      reward: computedReward,
      message: `You earned ₦${computedReward.toLocaleString()} for renting ${property.propertyName}!`,
      newBalance,
    }),
  );
});

router.get("/tasks/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const today = new Date().toISOString().split("T")[0]!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user?.isActive) {
    res.json(GetTasksSummaryResponse.parse({ totalTasks: 0, completedToday: 0, remainingToday: 0, totalRewardToday: 0 }));
    return;
  }

  const { activatedLevels, activationDates } = parseUser(user as any);
  const activeLevels = getActiveLevels(activatedLevels, activationDates, today);
  const { tasks: dailyLimit } = getCombinedConfig(activeLevels);

  const properties = await db.select().from(propertiesTable);
  const totalTasks = Math.min(seededShuffle(properties, dateSeed(today)).length, dailyLimit);

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(sql`${taskCompletionsTable.userId} = ${userId} AND ${taskCompletionsTable.completionDate} = ${today}`);

  const [todayRewardRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(reward), 0)` })
    .from(taskCompletionsTable)
    .where(sql`${taskCompletionsTable.userId} = ${userId} AND ${taskCompletionsTable.completionDate} = ${today}`);

  res.json(
    GetTasksSummaryResponse.parse({
      totalTasks,
      completedToday: completedToday.length,
      remainingToday: Math.max(0, totalTasks - completedToday.length),
      totalRewardToday: Number(todayRewardRow?.total ?? 0),
    }),
  );
});

export default router;
