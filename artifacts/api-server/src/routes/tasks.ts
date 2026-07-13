import { Router, type IRouter } from "express";
import { db, propertiesTable, taskCompletionsTable, usersTable, earningsTable, referralsTable, transactionsTable } from "@workspace/db";
import { generateTxId } from "../lib/txid";
import { eq, sql } from "drizzle-orm";
import {
  GetTasksResponse,
  CompleteTaskParams,
  CompleteTaskResponse,
  GetTasksSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { parseUser, getActiveLevels, getCombinedConfig } from "../lib/task-levels";

const router: IRouter = Router();

function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00Z").getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

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

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const today = new Date().toISOString().split("T")[0]!;

  if (isWeekend(today)) {
    res.json(GetTasksResponse.parse([]));
    return;
  }

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
  const LUXURY_TYPES = new Set(["Diamond", "Gold Jewelry", "Gemstone", "Luxury Watch"]);
  const luxuryPool = properties.filter(p => LUXURY_TYPES.has(p.propertyType ?? ""));
  const rentalPool = properties.filter(p => !LUXURY_TYPES.has(p.propertyType ?? ""));

  // Guarantee ~40% luxury items in the daily mix
  const luxuryCount = Math.max(1, Math.round(dailyLimit * 0.4));
  const rentalCount = dailyLimit - luxuryCount;

  const daySeed = dateSeed(today) ^ userId;
  const shuffledLuxury = seededShuffle(luxuryPool, daySeed ^ 0xABCD);
  const shuffledRental = seededShuffle(rentalPool, daySeed);

  const pickedLuxury = shuffledLuxury.slice(0, Math.min(luxuryCount, shuffledLuxury.length));
  const pickedRental = shuffledRental.slice(0, Math.min(rentalCount, shuffledRental.length));

  // Fill any gap if one pool is too small
  const combined = [...pickedLuxury, ...pickedRental];
  if (combined.length < dailyLimit) {
    const remaining = dailyLimit - combined.length;
    const extraRental = shuffledRental.slice(pickedRental.length, pickedRental.length + remaining);
    combined.push(...extraRental);
  }
  const limitedProperties = seededShuffle(combined, dateSeed(today) ^ 0x1234);

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
  const today = new Date().toISOString().split("T")[0]!;

  if (isWeekend(today)) {
    res.status(403).json({ error: "No quests on weekends. Come back Monday!" });
    return;
  }

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
  const LUXURY_TYPES_C = new Set(["Diamond", "Gold Jewelry", "Gemstone", "Luxury Watch"]);
  const luxuryPoolC = allProperties.filter(p => LUXURY_TYPES_C.has(p.propertyType ?? ""));
  const rentalPoolC = allProperties.filter(p => !LUXURY_TYPES_C.has(p.propertyType ?? ""));
  const luxuryCountC = Math.max(1, Math.round(dailyLimit * 0.4));
  const rentalCountC = dailyLimit - luxuryCountC;
  const daySeedC = dateSeed(today) ^ userId;
  const shuffledLuxuryC = seededShuffle(luxuryPoolC, daySeedC ^ 0xABCD);
  const shuffledRentalC = seededShuffle(rentalPoolC, daySeedC);
  const pickedLuxuryC = shuffledLuxuryC.slice(0, Math.min(luxuryCountC, shuffledLuxuryC.length));
  const pickedRentalC = shuffledRentalC.slice(0, Math.min(rentalCountC, shuffledRentalC.length));
  const combinedC = [...pickedLuxuryC, ...pickedRentalC];
  if (combinedC.length < dailyLimit) {
    combinedC.push(...shuffledRentalC.slice(pickedRentalC.length, pickedRentalC.length + (dailyLimit - combinedC.length)));
  }
  const limitedProperties = seededShuffle(combinedC, dateSeed(today) ^ 0x1234);
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

  await db.insert(transactionsTable).values({
    userId,
    txid: generateTxId(),
    type: "quest_earning",
    amount: String(computedReward),
    description: `Quest completed: ${property.propertyName}`,
  });

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

  if (isWeekend(today)) {
    res.json(GetTasksSummaryResponse.parse({ totalTasks: 0, completedToday: 0, remainingToday: 0, totalRewardToday: 0 }));
    return;
  }

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
