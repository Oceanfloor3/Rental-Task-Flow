import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RechargeWalletBody, RechargeWalletResponse, WithdrawWalletBody, WithdrawWalletResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.post("/wallet/recharge", async (req, res): Promise<void> => {
  const parsed = RechargeWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = Number(user.balance) + Number(parsed.data.amount);
  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, DEFAULT_USER_ID));

  res.json(RechargeWalletResponse.parse({
    success: true,
    newBalance,
    message: `Successfully recharged NGN ${parsed.data.amount.toLocaleString()}`,
  }));
});

router.post("/wallet/withdraw", async (req, res): Promise<void> => {
  const parsed = WithdrawWalletBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const currentBalance = Number(user.balance);
  if (parsed.data.amount > currentBalance) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const newBalance = currentBalance - parsed.data.amount;
  await db.update(usersTable).set({ balance: String(newBalance) }).where(eq(usersTable.id, DEFAULT_USER_ID));

  res.json(WithdrawWalletResponse.parse({
    success: true,
    newBalance,
    message: `Successfully withdrew NGN ${parsed.data.amount.toLocaleString()}`,
  }));
});

export default router;
