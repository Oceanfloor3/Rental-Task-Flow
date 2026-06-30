import { Router, type IRouter } from "express";
import { createHmac, createCipheriv, randomBytes } from "node:crypto";
import { db, paymentProofsTable, usersTable, referralsTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { generateTxId } from "../lib/txid";
import { logger } from "../lib/logger";
import { broadcastAdminEvent } from "../lib/admin-sse";

const router: IRouter = Router();

const KORAPAY_API = "https://api.korapay.com/merchant/api/v1";
const SECRET_KEY = process.env.KORAPAY_SECRET_KEY ?? "";
const ENCRYPTION_KEY = process.env.KORAPAY_ENCRYPTION_KEY ?? "";

function encryptPayload(data: object): string {
  const text = JSON.stringify(data);
  const iv = randomBytes(12);
  // AES-256-GCM requires exactly 32 bytes — pad/truncate the key to fit
  const key = Buffer.alloc(32);
  Buffer.from(ENCRYPTION_KEY, "utf8").copy(key);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac("sha256", SECRET_KEY).update(rawBody).digest("hex");
  return expected === signature;
}

router.post("/payments/korapay/initialize", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { positionKey, positionLabel, amount } = req.body;

  if (!positionKey || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: "positionKey and amount are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const reference = generateTxId();

  const payload = {
    amount: Number(amount),
    currency: "NGN",
    reference,
    customer: {
      name: `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username,
      email: user.email,
    },
    notification_url: `https://app.meridianflow.site/api/payments/korapay/webhook`,
    redirect_url: `https://app.meridianflow.site/position?payment=success&ref=${reference}`,
    description: `MeridianFlow ${positionLabel ?? positionKey} rank activation`,
    metadata: {
      userId: String(userId),
      positionKey,
      positionLabel: positionLabel ?? positionKey,
    },
  };

  const encrypted = encryptPayload(payload);

  const koraRes = await fetch(`${KORAPAY_API}/charges/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SECRET_KEY}`,
    },
    body: JSON.stringify({ ...payload, encrypted_data: encrypted }),
  });

  const koraData = await koraRes.json() as any;

  if (!koraRes.ok || !koraData?.data?.checkout_url) {
    logger.error({ koraData }, "Korapay initialize failed");
    res.status(502).json({ error: koraData?.message ?? "Failed to initialize payment" });
    return;
  }

  res.json({
    checkoutUrl: koraData.data.checkout_url,
    reference,
  });
});

router.post("/payments/korapay/webhook", async (req, res): Promise<void> => {
  const signature = req.headers["x-korapay-signature"] as string ?? "";
  const rawBody = JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Korapay webhook signature mismatch");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body?.event;
  const data = req.body?.data;

  if (event !== "charge.success" || data?.status !== "success") {
    res.json({ received: true });
    return;
  }

  const { reference, amount: paidAmount, metadata } = data;
  const userId = parseInt(metadata?.userId ?? "0", 10);
  const positionKey = metadata?.positionKey ?? "";
  const positionLabel = metadata?.positionLabel ?? positionKey;

  if (!userId || !positionKey) {
    logger.warn({ reference }, "Korapay webhook missing metadata");
    res.json({ received: true });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    logger.warn({ userId }, "Korapay webhook: user not found");
    res.json({ received: true });
    return;
  }

  let levels: string[] = [];
  try { levels = JSON.parse(user.activatedLevels || "[]"); } catch { levels = []; }

  let activationDates: Record<string, string> = {};
  try { activationDates = JSON.parse((user as any).levelActivationDates || "{}"); } catch { activationDates = {}; }

  const today = new Date().toISOString().split("T")[0]!;
  const proofAmount = Number(paidAmount ?? 0);
  const newSecurityDeposit = Number(user.securityDeposit ?? 0) + proofAmount;
  const isFirstLevel = levels.length === 0;

  const updates: Record<string, unknown> = {
    securityDeposit: String(newSecurityDeposit),
    position: positionLabel,
    level: positionKey,
  };

  if (isFirstLevel) {
    const welcomeBonus = Math.round(proofAmount * 0.02 * 100) / 100;
    updates.balance = String(Number(user.balance ?? 0) + welcomeBonus);
  }

  if (!levels.includes(positionKey)) {
    levels.push(positionKey);
    updates.activatedLevels = JSON.stringify(levels);
  }

  if (!activationDates[positionKey]) {
    activationDates[positionKey] = today;
    updates.levelActivationDates = JSON.stringify(activationDates);
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));

  await db.insert(paymentProofsTable).values({
    userId,
    userName: `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username,
    positionKey,
    positionLabel,
    amount: String(proofAmount),
    fileData: `korapay:${reference}`,
    fileName: "korapay_payment",
    fileType: "korapay",
    status: "approved",
  });

  await db.insert(transactionsTable).values({
    userId,
    txid: generateTxId(),
    type: "activation_deposit",
    amount: String(proofAmount),
    description: `Activation deposit — ${positionLabel} (Korapay ref: ${reference})`,
  });

  if (isFirstLevel) {
    const welcomeBonus = Math.round(proofAmount * 0.02 * 100) / 100;
    await db.insert(transactionsTable).values({
      userId,
      txid: generateTxId(),
      type: "welcome_bonus",
      amount: String(welcomeBonus),
      description: `Welcome bonus (2%) on first level activation — ${positionLabel}`,
    });
  }

  const LEADERSHIP_MILESTONES = [
    { count: 20, reward: 30000 }, { count: 50, reward: 70000 },
    { count: 100, reward: 150000 }, { count: 200, reward: 250000 },
    { count: 500, reward: 500000 }, { count: 1000, reward: 800000 },
    { count: 1500, reward: 1200000 }, { count: 2000, reward: 1500000 },
  ];

  const activatingUserName = `${user.firstName ?? ""} ${user.surname ?? ""}`.trim() || user.username;
  let currentUser = user;
  for (let gen = 1; gen <= 4; gen++) {
    if (!currentUser.referredBy) break;
    const [ancestor] = await db.select().from(usersTable).where(eq(usersTable.referralCode, currentUser.referredBy));
    if (!ancestor) break;

    const [existingReferral] = await db.select().from(referralsTable).where(eq(referralsTable.userId, ancestor.id));

    if (gen === 1 && isFirstLevel) {
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
        description: `5% referral bonus from ${activatingUserName}'s first level (${positionLabel}) via Korapay`,
        relatedUserId: userId,
      });
    } else if (gen > 1) {
      const [alreadyPaid] = await db.select().from(transactionsTable).where(and(
        eq(transactionsTable.userId, ancestor.id),
        eq(transactionsTable.type, "subordinate_commission"),
        eq(transactionsTable.relatedUserId, userId),
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
          description: `1% subordinate commission from ${activatingUserName} (Gen ${gen}) — ${positionLabel}`,
          relatedUserId: userId,
        });
      }
    }

    currentUser = ancestor;
  }

  broadcastAdminEvent({
    type: "payment_proof",
    userName: activatingUserName,
    positionLabel,
    positionKey,
  });

  logger.info({ userId, positionKey, reference }, "Korapay payment fulfilled");
  res.json({ received: true });
});

export default router;
