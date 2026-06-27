import { Router, type IRouter } from "express";
import { db, referralsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetReferralsSummaryResponse } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/referrals/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const [referral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, userId));

  res.json(
    GetReferralsSummaryResponse.parse({
      referralBonus: Number(referral?.referralBonus ?? 0),
      subordinateCommission: Number(referral?.subordinateCommission ?? 0),
      totalReferrals: referral?.totalReferrals ?? 0,
      leadershipBalance: Number(referral?.leadershipBalance ?? 0),
    }),
  );
});

router.post("/referrals/transfer", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const [referral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, userId));

  const bonus = Number(referral?.referralBonus ?? 0);
  const commission = Number(referral?.subordinateCommission ?? 0);
  const total = bonus + commission;

  if (total <= 0) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true, transferred: 0, newBalance: Number(user?.balance ?? 0), message: "No referral balance to transfer" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = Number(user.balance) + total;

  await db.update(usersTable)
    .set({ balance: String(newBalance) })
    .where(eq(usersTable.id, userId));

  await db.update(referralsTable)
    .set({ referralBonus: "0", subordinateCommission: "0" })
    .where(eq(referralsTable.userId, userId));

  res.json({ success: true, transferred: total, newBalance, message: `₦${total.toLocaleString("en-NG")} transferred to your main balance` });
});

router.post("/referrals/leadership-transfer", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const [referral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, userId));
  const amount = Number(referral?.leadershipBalance ?? 0);

  if (amount <= 0) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    res.json({ success: true, transferred: 0, newBalance: Number(user?.balance ?? 0), message: "No leadership balance to transfer" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = Number(user.balance) + amount;

  await db.update(usersTable)
    .set({ balance: String(newBalance) })
    .where(eq(usersTable.id, userId));

  await db.update(referralsTable)
    .set({ leadershipBalance: "0" })
    .where(eq(referralsTable.userId, userId));

  res.json({ success: true, transferred: amount, newBalance, message: `₦${amount.toLocaleString("en-NG")} transferred to your main balance` });
});

export default router;
