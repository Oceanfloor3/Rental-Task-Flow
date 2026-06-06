import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";

export const paymentProofsTable = pgTable("payment_proofs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull().default(""),
  positionKey: text("position_key").notNull(),
  positionLabel: text("position_label").notNull().default(""),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  fileData: text("file_data").notNull(),
  fileName: text("file_name").notNull().default(""),
  fileType: text("file_type").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentProof = typeof paymentProofsTable.$inferSelect;
