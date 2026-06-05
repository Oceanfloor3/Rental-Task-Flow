import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  username: text("username").notNull(),
  avatar: text("avatar").notNull().default("XM"),
  position: text("position").notNull().default("Senior Position (V1)"),
  level: text("level").notNull().default("Team Leader"),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  securityDeposit: numeric("security_deposit", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
