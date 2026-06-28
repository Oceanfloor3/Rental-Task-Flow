import { Router, type IRouter } from "express";
import { db, paymentProofsTable, usersTable, referralsTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { broadcastAdminEvent } from "../lib/admin-sse";

const router: IRouter = Router();

router.post("/payment-proofs", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const { positionKey, positionLabel, amount, fileData, fileName, fileType } = req.body;

  if (!positionKey || !fileData) {
    res.status(400).json({ error: "positionKey and fileData are required" });
    return;
  }

  if (fileData.length > 5 * 1024 * 1024) {
    res.status(400).json({ error: "File too large (max 5MB)" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const userName = user ? `${user.firstName} ${user.surname}`.trim() || user.username : "Unknown";

  const [proof] = await db.insert(paymentProofsTable).values({
    userId,
    userName,
    positionKey,
    positionLabel: positionLabel ?? positionKey,
    amount: String(Number(amount) || 0),
    fileData,
    fileName: fileName ?? "screenshot",
    fileType: fileType ?? "image/jpeg",
    status: "pending",
  }).returning();

  broadcastAdminEvent({
    type: "payment_proof",
    userName,
    positionLabel: positionLabel ?? positionKey,
    positionKey,
  });

  res.status(201).json({
    success: true,
    id: proof.id,
    message: "Payment proof submitted successfully. Admin will review and activate your level shortly.",
  });
});

router.get("/admin/payment-proofs", requireAdmin, async (req, res): Promise<void> => {
  const proofs = await db
    .select()
    .from(paymentProofsTable)
    .orderBy(sql`${paymentProofsTable.createdAt} DESC`);

  res.json(proofs.map(p => ({
    id: p.id,
    userId: p.userId,
    userName: p.userName,
    positionKey: p.positionKey,
    positionLabel: p.positionLabel,
    amount: Number(p.amount ?? 0),
    fileData: p.fileData,
    fileName: p.fileName,
    fileType: p.fileType,
    status: p.status,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
  })));
});

router.patch("/admin/payment-proofs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { status } = req.body;

  if (!["pending", "approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  await db.update(paymentProofsTable).set({ status }).where(eq(paymentProofsTable.id, id));

  if (status === "approved") {
    const [proof] = await db.select().from(paymentProofsTable).where(eq(paymentProofsTable.id, id));
    if (proof) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, proof.userId));
      if (user) {
        let levels: string[] = [];
        try { levels = JSON.parse(user.activatedLevels || "[]"); } catch { levels = []; }

        let activationDates: Record<string, string> = {};
        try { activationDates = JSON.parse((user as any).levelActivationDates || "{}"); } catch { activationDates = {}; }

        const today = new Date().toISOString().split("T")[0]!;
        const proofAmount = Number(proof.amount ?? 0);
        const newSecurityDeposit = Number(user.securityDeposit ?? 0) + proofAmount;

        const updates: Record<string, unknown> = {
          securityDeposit: String(newSecurityDeposit),
          position: proof.positionLabel || proof.positionKey,
          level: proof.positionKey,
        };

        const isFirstLevel = levels.length === 0;

        // One-time 2% welcome bonus on first-ever level purchase
        if (isFirstLevel) {
          const welcomeBonus = Math.round(proofAmount * 0.02 * 100) / 100;
          updates.balance = String(Number(user.balance ?? 0) + welcomeBonus);
        }

        if (!levels.includes(proof.positionKey)) {
          levels.push(proof.positionKey);
          updates.activatedLevels = JSON.stringify(levels);
        }

        // Record activation date so the 50-working-day clock starts correctly
        if (!activationDates[proof.positionKey]) {
          activationDates[proof.positionKey] = today;
          updates.levelActivationDates = JSON.stringify(activationDates);
        }

        await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));

        // Record welcome bonus transaction
        if (isFirstLevel) {
          const welcomeBonus = Math.round(proofAmount * 0.02 * 100) / 100;
          await db.insert(transactionsTable).values({
            userId: user.id,
            type: "welcome_bonus",
            amount: String(welcomeBonus),
            description: `Welcome bonus (2%) on first level activation — ${proof.positionLabel || proof.positionKey}`,
          });
        }

        // Credit upline commissions if user was referred
        if (user.referredBy) {
          const [uplineUser] = await db.select().from(usersTable).where(eq(usersTable.referralCode, user.referredBy));
          if (uplineUser) {
            const [existingReferral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, uplineUser.id));

            // 5% one-time referral bonus on first level purchase
            const referralBonus = isFirstLevel ? Math.round(proofAmount * 0.05 * 100) / 100 : 0;
            // 1% subordinate commission on every level purchase
            const subCommission = Math.round(proofAmount * 0.01 * 100) / 100;

            // Leadership milestones: SET balance (replace, not add) when new milestone threshold crossed
            const LEADERSHIP_MILESTONES: { count: number; reward: number }[] = [
              { count: 20, reward: 30000 },
              { count: 50, reward: 70000 },
              { count: 100, reward: 150000 },
              { count: 200, reward: 250000 },
              { count: 500, reward: 500000 },
              { count: 1000, reward: 800000 },
              { count: 1500, reward: 1200000 },
              { count: 2000, reward: 1500000 },
            ];

            if (existingReferral) {
              const newTotalReferrals = isFirstLevel ? existingReferral.totalReferrals + 1 : existingReferral.totalReferrals;
              const milestoneUpdate: Record<string, string | number> = {
                referralBonus: String(Number(existingReferral.referralBonus) + referralBonus),
                subordinateCommission: String(Number(existingReferral.subordinateCommission) + subCommission),
                totalReferrals: newTotalReferrals,
              };

              if (isFirstLevel) {
                // Find the highest milestone reached that hasn't been credited yet
                let highestMilestone: { count: number; reward: number } | null = null;
                for (const m of LEADERSHIP_MILESTONES) {
                  if (newTotalReferrals >= m.count && m.count > existingReferral.leadershipMilestonePaid) {
                    highestMilestone = m;
                  }
                }
                if (highestMilestone) {
                  milestoneUpdate.leadershipBalance = String(highestMilestone.reward);
                  milestoneUpdate.leadershipMilestonePaid = highestMilestone.count;
                }
              }

              await db.update(referralsTable)
                .set(milestoneUpdate)
                .where(eq(referralsTable.userId, uplineUser.id));
            } else {
              const newTotalReferrals = isFirstLevel ? 1 : 0;
              const insertData: Record<string, string | number> = {
                userId: uplineUser.id,
                referralBonus: String(referralBonus),
                subordinateCommission: String(subCommission),
                totalReferrals: newTotalReferrals,
              };
              // New referral record — check if already at milestone (unlikely but safe)
              if (isFirstLevel) {
                let highestMilestone: { count: number; reward: number } | null = null;
                for (const m of LEADERSHIP_MILESTONES) {
                  if (newTotalReferrals >= m.count) highestMilestone = m;
                }
                if (highestMilestone) {
                  insertData.leadershipBalance = String(highestMilestone.reward);
                  insertData.leadershipMilestonePaid = highestMilestone.count;
                }
              }
              await db.insert(referralsTable).values(insertData as any);
            }

            // Record commission transactions for the upline user
            if (referralBonus > 0) {
              const newUserName = `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username;
              await db.insert(transactionsTable).values({
                userId: uplineUser.id,
                type: "referral_bonus",
                amount: String(referralBonus),
                description: `5% referral bonus from ${newUserName}'s first level purchase (${proof.positionLabel || proof.positionKey})`,
                relatedUserId: user.id,
              });
            }
            if (subCommission > 0) {
              const newUserName = `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username;
              await db.insert(transactionsTable).values({
                userId: uplineUser.id,
                type: "subordinate_commission",
                amount: String(subCommission),
                description: `1% subordinate commission from ${newUserName}'s level purchase (${proof.positionLabel || proof.positionKey})`,
                relatedUserId: user.id,
              });
            }
          }
        }
      }
    }
  }

  res.json({ success: true, message: "Status updated" });
});

router.delete("/admin/payment-proofs/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(paymentProofsTable).where(eq(paymentProofsTable.id, id));
  res.json({ success: true, message: "Payment proof deleted" });
});

export default router;
