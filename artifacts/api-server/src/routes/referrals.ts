import { Router, type IRouter } from "express";
import { db, referralsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetReferralsSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.get("/referrals/summary", async (req, res): Promise<void> => {
  const [referral] = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.userId, DEFAULT_USER_ID));

  res.json(
    GetReferralsSummaryResponse.parse({
      referralBonus: Number(referral?.referralBonus ?? 0),
      subordinateCommission: Number(referral?.subordinateCommission ?? 0),
      totalReferrals: referral?.totalReferrals ?? 0,
    }),
  );
});

export default router;
