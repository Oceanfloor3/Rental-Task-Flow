import { Router, type IRouter } from "express";
import { db, referralsTable } from "@workspace/db";
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
    }),
  );
});

export default router;
