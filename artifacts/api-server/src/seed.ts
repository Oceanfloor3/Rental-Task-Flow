import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

const ADMIN_EMAIL = "admin@realestate.ng";
const ADMIN_PASSWORD = "Admin@123456";

export async function seedAdmin(): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL));

    if (existing) {
      logger.info("Admin account already exists, skipping seed");
      return;
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await db.insert(usersTable).values({
      firstName: "Admin",
      middleName: "",
      surname: "User",
      phone: "00000000000",
      whatsappNumber: "00000000000",
      username: "admin",
      email: ADMIN_EMAIL,
      passwordHash,
      gender: "male",
      avatar: "",
      homeAddress: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      zipCode: "",
      referralCode: "ADMINROOT",
      referredBy: "",
      role: "admin",
      isActive: true,
      balance: "0",
      securityDeposit: "0",
      position: "",
      level: "",
      activatedLevels: "[]",
    });

    logger.info("Admin account created successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}
