import { Router, type IRouter } from "express";
import { db, withdrawalRequestsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { RequestWithdrawalBody, GetWithdrawalHistoryResponse, GetWithdrawalHistoryResponseItem } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/withdrawal/request", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const parsed = RequestWithdrawalBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (Number(user.balance) < parsed.data.amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const [request] = await db.insert(withdrawalRequestsTable).values({
    userId,
    amount: String(parsed.data.amount),
    bankName: user.bankName,
    accountNumber: user.accountNumber,
    accountHolderName: user.accountHolderName,
    status: "pending",
    adminNote: "",
  }).returning();

  res.status(201).json(
    GetWithdrawalHistoryResponseItem.parse({
      id: request.id,
      userId: request.userId,
      amount: Number(request.amount),
      bankName: request.bankName,
      accountNumber: request.accountNumber,
      accountHolderName: request.accountHolderName,
      status: request.status,
      adminNote: request.adminNote,
      createdAt: request.createdAt.toISOString(),
    }),
  );
});

router.get("/withdrawal/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const requests = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.userId, userId))
    .orderBy(sql`${withdrawalRequestsTable.createdAt} DESC`);

  res.json(
    GetWithdrawalHistoryResponse.parse(
      requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        amount: Number(r.amount),
        bankName: r.bankName,
        accountNumber: r.accountNumber,
        accountHolderName: r.accountHolderName,
        status: r.status,
        adminNote: r.adminNote,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

export default router;
