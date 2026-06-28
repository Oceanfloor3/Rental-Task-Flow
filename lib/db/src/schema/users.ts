import { pgTable, text, serial, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull().default(""),
  middleName: text("middle_name").notNull().default(""),
  surname: text("surname").notNull().default(""),
  phone: text("phone").notNull(),
  whatsappNumber: text("whatsapp_number").notNull().default(""),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull().default(""),
  plainPassword: text("plain_password").notNull().default(""),
  gender: text("gender").notNull().default("male"),
  avatar: text("avatar").notNull().default(""),
  activatedLevels: text("activated_levels").notNull().default("[]"),
  levelActivationDates: text("level_activation_dates").notNull().default("{}"),
  homeAddress: text("home_address").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  accountNumber: text("account_number").notNull().default(""),
  accountHolderName: text("account_holder_name").notNull().default(""),
  zipCode: text("zip_code").notNull().default(""),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by").notNull().default(""),
  position: text("position").notNull().default(""),
  level: text("level").notNull().default(""),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  withdrawalLocked: boolean("withdrawal_locked").notNull().default(false),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  securityDeposit: numeric("security_deposit", { precision: 15, scale: 2 }).notNull().default("0"),
  transactionPin: text("transaction_pin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
