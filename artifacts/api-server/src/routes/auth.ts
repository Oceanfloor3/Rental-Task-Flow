import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";

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
    avatar: user.avatar,
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
    avatar: (parsed.data.firstName[0] + parsed.data.surname[0]).toUpperCase(),
    homeAddress: parsed.data.homeAddress,
    bankName: parsed.data.bankName,
    accountNumber: parsed.data.accountNumber,
    accountHolderName: parsed.data.accountHolderName,
    zipCode: parsed.data.zipCode,
    referralCode,
    referredBy: parsed.data.referralCode ?? "",
    role: "user",
    isActive: true,
    balance: "0",
    securityDeposit: "0",
  }).returning();

  req.session.userId = user.id;
  req.session.role = user.role;

  res.status(201).json(LoginResponse.parse({ user: toUserFull(user) }));
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
    res.status(403).json({ error: "Account is disabled. Contact support." });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;

  res.json(LoginResponse.parse({ user: toUserFull(user) }));
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
