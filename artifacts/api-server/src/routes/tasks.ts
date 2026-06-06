import { Router, type IRouter } from "express";
import { db, propertiesTable, taskCompletionsTable, usersTable, earningsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetTasksResponse,
  CompleteTaskParams,
  CompleteTaskResponse,
  GetTasksSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function getDailyLimit(position: string | null): number {
  if (!position) return 50;
  const upper = position.toUpperCase();
  if (upper.includes("V5")) return 300;
  if (upper.includes("V4")) return 200;
  if (upper.includes("V3")) return 150;
  if (upper.includes("V2")) return 100;
  return 50;
}

router.get("/tasks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const today = new Date().toISOString().split("T")[0];

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user?.isActive) {
    res.status(403).json({ error: "Account pending activation. Please complete your payment to unlock tasks." });
    return;
  }

  const dailyLimit = getDailyLimit(user?.position ?? null);

  const properties = await db.select().from(propertiesTable);
  const limitedProperties = properties.slice(0, dailyLimit);

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(sql`${taskCompletionsTable.userId} = ${userId} AND ${taskCompletionsTable.completionDate} = ${today}`);

  const completedPropertyIds = new Set(completedToday.map((c) => c.propertyId));

  const tasks = limitedProperties.map((p) => ({
    id: p.id,
    propertyName: p.propertyName,
    propertyType: p.propertyType,
    location: p.location,
    reward: Number(p.reward),
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

  const today = new Date().toISOString().split("T")[0];

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

  await db.insert(taskCompletionsTable).values({
    userId,
    propertyId: params.data.id,
    completionDate: today,
    reward: property.reward,
  });

  await db.insert(earningsTable).values({
    userId,
    amount: property.reward,
    earningDate: today,
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const currentBalance = Number(user?.balance ?? 0);
  const reward = Number(property.reward);
  const newBalance = currentBalance + reward;

  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, userId));

  res.json(
    CompleteTaskResponse.parse({
      success: true,
      reward,
      message: `You earned ₦${reward.toLocaleString()} for renting ${property.propertyName}!`,
      newBalance,
    }),
  );
});

router.get("/tasks/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const today = new Date().toISOString().split("T")[0];

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user?.isActive) {
    res.json(GetTasksSummaryResponse.parse({ totalTasks: 0, completedToday: 0, remainingToday: 0, totalRewardToday: 0 }));
    return;
  }

  const dailyLimit = getDailyLimit(user?.position ?? null);

  const properties = await db.select().from(propertiesTable);
  const totalTasks = Math.min(properties.length, dailyLimit);

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
