import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountHolderName: text("account_holder_name").notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note").notNull().default(""),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequestsTable).omit({ id: true, createdAt: true, processedAt: true });
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
