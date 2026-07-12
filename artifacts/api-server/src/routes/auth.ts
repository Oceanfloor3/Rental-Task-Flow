import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { RegisterBody, LoginBody, LoginResponse, GetMeResponse, ForgotPasswordBody, ResetPasswordBody } from "@workspace/api-zod";
import { sendPasswordResetEmail, sendTemplatedEmail } from "../lib/email";
import { parseUser } from "../lib/task-levels";

const router: IRouter = Router();

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function toUserFull(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    surname: user.surname,
    phone: user.whatsappNumber || user.phone,
    whatsappNumber: user.whatsappNumber,
    username: user.username,
    email: user.email,
    gender: user.gender,
    avatar: user.avatar,
    activatedLevels: parseUser(user as any).activatedLevels,
    levelActivationDates: (() => { try { return JSON.parse(user.levelActivationDates || "{}"); } catch { return {}; } })(),
    homeAddress: user.homeAddress,
    bankName: user.bankName,
    accountNumber: user.accountNumber,
    accountHolderName: user.accountHolderName,
    zipCode: user.zipCode,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    position: user.position,
    level: user.level,
    role: user.role,
    isActive: user.isActive,
    withdrawalLocked: user.withdrawalLocked,
    balance: Number(user.balance),
    securityDeposit: Number(user.securityDeposit),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const plainPassword = parsed.data.password;
  const pinHash = parsed.data.transactionPin ? await bcrypt.hash(parsed.data.transactionPin, 10) : null;

  let referralCode = generateReferralCode();
  let codeExists = true;
  while (codeExists) {
    const found = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (found.length === 0) codeExists = false;
    else referralCode = generateReferralCode();
  }

  const username = `${parsed.data.firstName} ${parsed.data.surname}`;

  const [user] = await db.insert(usersTable).values({
    firstName: parsed.data.firstName,
    middleName: parsed.data.middleName ?? "",
    surname: parsed.data.surname,
    phone: parsed.data.whatsappNumber,
    whatsappNumber: parsed.data.whatsappNumber,
    username,
    email: parsed.data.email,
    passwordHash,
    plainPassword,
    gender: parsed.data.gender ?? "male",
    avatar: parsed.data.gender === "female"
      ? `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(parsed.data.firstName + parsed.data.surname)}&backgroundColor=ffd5dc,c0aede,f5d0fe,fbcfe8,ddd6fe`
      : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(parsed.data.firstName + parsed.data.surname)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ddd6fe,bfdbfe`,
    homeAddress: parsed.data.homeAddress,
    bankName: parsed.data.bankName,
    accountNumber: parsed.data.accountNumber,
    accountHolderName: parsed.data.accountHolderName,
    zipCode: parsed.data.zipCode,
    referralCode,
    referredBy: parsed.data.referralCode ?? "",
    transactionPin: pinHash,
    role: "user",
    isActive: true,
    balance: "0",
    securityDeposit: "0",
  }).returning();

  req.session.userId = user.id;
  req.session.role = user.role;

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session could not be saved" });
      return;
    }
    res.status(201).json(LoginResponse.parse({ user: toUserFull(user) }));
  });

  sendTemplatedEmail("welcome", user.email!, {
    firstName: user.firstName ?? "",
    surname: user.surname ?? "",
    email: user.email ?? "",
    referralCode: user.referralCode ?? "",
    position: user.position ?? "",
    level: user.level ?? "",
  }).catch((err: Error) => { console.error(`[email:welcome] ${err.message}`); });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Your account has been disabled. Please contact support for assistance." });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session could not be saved" });
      return;
    }
    res.json(LoginResponse.parse({ user: toUserFull(user) }));
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const domains = (process.env.REPLIT_DOMAINS || "").split(",").filter(Boolean);
    const baseUrl = domains[0] ? `https://${domains[0]}` : "http://localhost:80";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);
  }

  res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const now = new Date();
  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, parsed.data.token),
        eq(passwordResetTokensTable.used, false),
        gt(passwordResetTokensTable.expiresAt, now)
      )
    );

  if (!record) {
    res.status(400).json({ error: "This reset link is invalid or has expired." });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db.update(usersTable).set({ passwordHash, plainPassword: parsed.data.password }).where(eq(usersTable.id, record.userId));
  await db.update(passwordResetTokensTable).set({ used: true }).where(eq(passwordResetTokensTable.id, record.id));

  res.json({ success: true, message: "Password reset successfully." });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(GetMeResponse.parse(toUserFull(user)));
});

export default router;
