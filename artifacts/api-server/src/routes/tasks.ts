import { Router, type IRouter } from "express";
import { db, propertiesTable, taskCompletionsTable, usersTable, earningsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetTasksResponse,
  CompleteTaskParams,
  CompleteTaskResponse,
  GetTasksSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.get("/tasks", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const properties = await db.select().from(propertiesTable);

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(
      sql`${taskCompletionsTable.userId} = ${DEFAULT_USER_ID} AND ${taskCompletionsTable.completionDate} = ${today}`,
    );

  const completedPropertyIds = new Set(completedToday.map((c) => c.propertyId));

  const tasks = properties.map((p) => ({
    id: p.id,
    propertyName: p.propertyName,
    propertyType: p.propertyType,
    location: p.location,
    reward: Number(p.reward),
    status: completedPropertyIds.has(p.id) ? "completed" : "pending",
    imageUrl: p.imageUrl,
  }));

  res.json(GetTasksResponse.parse(tasks));
});

router.post("/tasks/:id/complete", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CompleteTaskParams.safeParse({ id: parseInt(rawId, 10) });

  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const [property] = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.id, params.data.id));

  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }

  const existingCompletion = await db
    .select()
    .from(taskCompletionsTable)
    .where(
      sql`${taskCompletionsTable.userId} = ${DEFAULT_USER_ID} AND ${taskCompletionsTable.propertyId} = ${params.data.id} AND ${taskCompletionsTable.completionDate} = ${today}`,
    );

  if (existingCompletion.length > 0) {
    res.status(400).json({ error: "Task already completed today" });
    return;
  }

  await db.insert(taskCompletionsTable).values({
    userId: DEFAULT_USER_ID,
    propertyId: params.data.id,
    completionDate: today,
    reward: property.reward,
  });

  await db.insert(earningsTable).values({
    userId: DEFAULT_USER_ID,
    amount: property.reward,
    earningDate: today,
  });

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, DEFAULT_USER_ID));

  const currentBalance = Number(user?.balance ?? 0);
  const reward = Number(property.reward);
  const newBalance = currentBalance + reward;

  await db
    .update(usersTable)
    .set({ balance: String(newBalance) })
    .where(eq(usersTable.id, DEFAULT_USER_ID));

  res.json(
    CompleteTaskResponse.parse({
      success: true,
      reward,
      message: `You earned NGN ${reward.toLocaleString()} for renting ${property.propertyName}!`,
      newBalance,
    }),
  );
});

router.get("/tasks/summary", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const properties = await db.select().from(propertiesTable);
  const totalTasks = properties.length;

  const completedToday = await db
    .select()
    .from(taskCompletionsTable)
    .where(
      sql`${taskCompletionsTable.userId} = ${DEFAULT_USER_ID} AND ${taskCompletionsTable.completionDate} = ${today}`,
    );

  const [todayRewardRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(reward), 0)` })
    .from(taskCompletionsTable)
    .where(
      sql`${taskCompletionsTable.userId} = ${DEFAULT_USER_ID} AND ${taskCompletionsTable.completionDate} = ${today}`,
    );

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
