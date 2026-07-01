import { Router, type IRouter } from "express";
import { createHmac } from "node:crypto";
import { db, paymentProofsTable, usersTable, referralsTable, transactionsTable, siteSettingsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { generateTxId } from "../lib/txid";
import { logger } from "../lib/logger";
import { broadcastAdminEvent } from "../lib/admin-sse";

const router: IRouter = Router();

const KORAPAY_API = "https://api.korapay.com/merchant/api/v1";

async function getActiveKeys(): Promise<{ secretKey: string; publicKey: string; encryptionKey: string; mode: "test" | "live" | "off" } | null> {
  const keys = [
    "korapay_mode",
    "korapay_test_secret_key", "korapay_test_public_key", "korapay_test_encryption_key",
    "korapay_live_secret_key", "korapay_live_public_key", "korapay_live_encryption_key",
  ];
  const rows = await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, keys));
  const map: Record<string, string> = {};
  for (const r of rows) if (r.key && r.value) map[r.key] = r.value;

  const mode = (map["korapay_mode"] ?? "off") as "test" | "live" | "off";

  if (mode === "test") {
    return {
      mode,
      secretKey: map["korapay_test_secret_key"] ?? process.env.KORAPAY_SECRET_KEY ?? "",
      publicKey: map["korapay_test_public_key"] ?? process.env.KORAPAY_PUBLIC_KEY ?? "",
      encryptionKey: map["korapay_test_encryption_key"] ?? process.env.KORAPAY_ENCRYPTION_KEY ?? "",
    };
  }
  if (mode === "live") {
    return {
      mode,
      secretKey: map["korapay_live_secret_key"] ?? "",
      publicKey: map["korapay_live_public_key"] ?? "",
      encryptionKey: map["korapay_live_encryption_key"] ?? "",
    };
  }
  return { mode: "off", secretKey: "", publicKey: "", encryptionKey: "" };
}

function verifyWebhookSignature(rawBody: string | Buffer, signature: string, secretKey: string): boolean {
  const expected = createHmac("sha256", secretKey).update(rawBody).digest("hex");
  return expected === signature;
}

/** Public status endpoint — the position page calls this to know if Korapay is ready */
router.get("/payments/korapay/status", requireAuth, async (_req, res): Promise<void> => {
  const keys = await getActiveKeys();
  const mode = keys?.mode ?? "off";
  const configured = mode !== "off" && !!keys?.secretKey;
  res.json({ mode, configured });
});

/** Admin: verify that the saved keys actually work by calling Korapay's account endpoint */
router.get("/admin/korapay-settings/verify", async (req, res): Promise<void> => {
  if (!(req as any).session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const keys = await getActiveKeys();
  if (!keys || keys.mode === "off" || !keys.secretKey) {
    res.json({ ok: false, error: "No API keys configured. Enter your keys and enable Test or Live mode first." });
    return;
  }
  try {
    // Hit charges/initialize with a dummy payload; auth errors (401/403) mean bad keys,
    // any other response (400/422) confirms the key is accepted.
    const r = await fetch(`${KORAPAY_API}/charges/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${keys.secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reference: "_verify_" }),
    });
    const body = await r.json() as any;
    if (r.status === 401 || r.status === 403) {
      res.json({ ok: false, error: body?.message ?? "Invalid API key — Korapay rejected the request with 401/403. Check your key." });
    } else {
      res.json({ ok: true, mode: keys.mode, message: `Keys are valid (${keys.mode} mode). Korapay accepted the authorization.` });
    }
  } catch (err: any) {
    res.json({ ok: false, error: err?.message ?? "Network error reaching Korapay" });
  }
});

router.post("/payments/korapay/initialize", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const { positionKey, positionLabel, amount } = req.body;

  if (!positionKey || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: "positionKey and amount are required" });
    return;
  }

  const activeKeys = await getActiveKeys();

  if (!activeKeys || activeKeys.mode === "off") {
    res.status(503).json({ error: "Payment gateway is currently offline. Please use manual payment." });
    return;
  }

  if (!activeKeys.secretKey) {
    res.status(503).json({ error: "Payment gateway is not configured. Please contact support." });
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
      mode: activeKeys.mode,
    },
  };

  const koraRes = await fetch(`${KORAPAY_API}/charges/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeKeys.secretKey}`,
    },
    body: JSON.stringify(payload),
  });

  const koraData = await koraRes.json() as any;

  if (!koraRes.ok || !koraData?.data?.checkout_url) {
    logger.error({ status: koraRes.status, koraData }, "Korapay initialize failed");
    res.status(502).json({ error: koraData?.message ?? koraData?.error ?? "Failed to initialize payment. Check your Korapay API keys in Settings." });
    return;
  }

  res.json({
    checkoutUrl: koraData.data.checkout_url,
    reference,
  });
});

router.post("/payments/korapay/webhook", async (req, res): Promise<void> => {
  const signature = req.headers["x-korapay-signature"] as string ?? "";
  // Use the raw body buffer captured by the verify callback — do NOT re-serialize
  const rawBody: Buffer | string = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));

  const keys = await getActiveKeys();
  const secretKey = keys?.secretKey ?? process.env.KORAPAY_SECRET_KEY ?? "";

  if (!verifyWebhookSignature(rawBody, signature, secretKey)) {
    logger.warn({ signatureReceived: signature, mode: keys?.mode }, "Korapay webhook signature mismatch");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body?.event;
  const data = req.body?.data;

  logger.info({ event, status: data?.status, reference: data?.reference }, "Korapay webhook received");

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
