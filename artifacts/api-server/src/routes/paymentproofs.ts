import { Router, type IRouter } from "express";
import { db, paymentProofsTable, usersTable, referralsTable, transactionsTable } from "@workspace/db";
import { generateTxId } from "../lib/txid";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { broadcastAdminEvent } from "../lib/admin-sse";
import { sendTemplatedEmail } from "../lib/email";

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

        // Record the activation deposit itself
        await db.insert(transactionsTable).values({
          userId: user.id,
          txid: generateTxId(),
          type: "activation_deposit",
          amount: String(proofAmount),
          description: `Activation deposit — ${proof.positionLabel || proof.positionKey}`,
        });

        // Record welcome bonus transaction
        if (isFirstLevel) {
          const welcomeBonus = Math.round(proofAmount * 0.02 * 100) / 100;
          await db.insert(transactionsTable).values({
            userId: user.id,
            txid: generateTxId(),
            type: "welcome_bonus",
            amount: String(welcomeBonus),
            description: `Welcome bonus (2%) on first level activation — ${proof.positionLabel || proof.positionKey}`,
          });
        }

        // Credit upline commissions — walk up to 4 generations
        // Gen 1 (direct referrer): 5% referral bonus on first level only, NO sub-commission
        // Gen 2–4: 1% subordinate commission, ONE-TIME per referred user
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

        const activatingUserName = `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username;
        const levelLabel = proof.positionLabel || proof.positionKey;

        let currentUser = user;
        for (let gen = 1; gen <= 4; gen++) {
          if (!currentUser.referredBy) break;

          const [ancestor] = await db.select().from(usersTable).where(eq(usersTable.referralCode, currentUser.referredBy));
          if (!ancestor) break;

          const [existingReferral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, ancestor.id));

          if (gen === 1) {
            // Direct referrer: 5% referral bonus on first level purchase only
            if (isFirstLevel) {
              const referralBonus = Math.round(proofAmount * 0.05 * 100) / 100;
              const newTotalReferrals = existingReferral ? existingReferral.totalReferrals + 1 : 1;

              if (existingReferral) {
                const milestoneUpdate: Record<string, string | number> = {
                  referralBonus: String(Number(existingReferral.referralBonus) + referralBonus),
                  totalReferrals: newTotalReferrals,
                };
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
                await db.update(referralsTable).set(milestoneUpdate).where(eq(referralsTable.userId, ancestor.id));
              } else {
                await db.insert(referralsTable).values({
                  userId: ancestor.id,
                  referralBonus: String(referralBonus),
                  subordinateCommission: "0",
                  totalReferrals: 1,
                } as any);
              }

              await db.insert(transactionsTable).values({
                userId: ancestor.id,
                txid: generateTxId(),
                type: "referral_bonus",
                amount: String(referralBonus),
                description: `5% referral bonus from ${activatingUserName}'s first level purchase (${levelLabel})`,
                relatedUserId: user.id,
              });
            }
          } else {
            // Gen 2–4: 1% subordinate commission, one-time per user
            const [alreadyPaid] = await db
              .select()
              .from(transactionsTable)
              .where(and(
                eq(transactionsTable.userId, ancestor.id),
                eq(transactionsTable.type, "subordinate_commission"),
                eq(transactionsTable.relatedUserId, user.id),
              ));

            if (!alreadyPaid) {
              const subCommission = Math.round(proofAmount * 0.01 * 100) / 100;

              if (existingReferral) {
                await db.update(referralsTable)
                  .set({ subordinateCommission: String(Number(existingReferral.subordinateCommission) + subCommission) })
                  .where(eq(referralsTable.userId, ancestor.id));
              } else {
                await db.insert(referralsTable).values({
                  userId: ancestor.id,
                  referralBonus: "0",
                  subordinateCommission: String(subCommission),
                  totalReferrals: 0,
                } as any);
              }

              await db.insert(transactionsTable).values({
                userId: ancestor.id,
                txid: generateTxId(),
                type: "subordinate_commission",
                amount: String(subCommission),
                description: `1% subordinate commission from ${activatingUserName} (Gen ${gen}) — ${levelLabel}`,
                relatedUserId: user.id,
              });
            }
          }

          currentUser = ancestor;
        }
      }
    }
  }

  if (status === "approved") {
    const [approvedProof] = await db.select().from(paymentProofsTable).where(eq(paymentProofsTable.id, id));
    if (approvedProof) {
      const [approvedUser] = await db.select().from(usersTable).where(eq(usersTable.id, approvedProof.userId));
      if (approvedUser?.email) {
        const proofAmount = Number(approvedProof.amount ?? 0);
        const newSecDep = Number(approvedUser.securityDeposit ?? 0);
        sendTemplatedEmail("activationDeposit", approvedUser.email, {
          firstName: approvedUser.firstName ?? "",
          surname: approvedUser.surname ?? "",
          positionLabel: approvedProof.positionLabel || approvedProof.positionKey || "",
          amount: proofAmount.toLocaleString(),
          securityDeposit: newSecDep.toLocaleString(),
        }).catch((err: Error) => { console.error(`[email:activationDeposit] ${err.message}`); });
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
