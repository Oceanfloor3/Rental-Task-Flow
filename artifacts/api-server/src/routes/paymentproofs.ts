import { Router, type IRouter } from "express";
import { db, paymentProofsTable, usersTable, referralsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";

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

        const proofAmount = Number(proof.amount ?? 0);
        const newSecurityDeposit = Number(user.securityDeposit ?? 0) + proofAmount;

        const updates: Record<string, unknown> = {
          securityDeposit: String(newSecurityDeposit),
          position: proof.positionLabel || proof.positionKey,
          level: proof.positionKey,
        };

        const isFirstLevel = levels.length === 0;

        if (!levels.includes(proof.positionKey)) {
          levels.push(proof.positionKey);
          updates.activatedLevels = JSON.stringify(levels);
        }

        await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));

        // Credit 5% one-time referral bonus to upline on first level purchase
        if (isFirstLevel && user.referredBy) {
          const [uplineUser] = await db.select().from(usersTable).where(eq(usersTable.referralCode, user.referredBy));
          if (uplineUser) {
            const referralBonus = Math.round(proofAmount * 0.05 * 100) / 100;
            const [existingReferral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, uplineUser.id));
            if (existingReferral) {
              await db.update(referralsTable)
                .set({
                  referralBonus: String(Number(existingReferral.referralBonus) + referralBonus),
                  totalReferrals: existingReferral.totalReferrals + 1,
                })
                .where(eq(referralsTable.userId, uplineUser.id));
            } else {
              await db.insert(referralsTable).values({
                userId: uplineUser.id,
                referralBonus: String(referralBonus),
                subordinateCommission: "0",
                totalReferrals: 1,
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
