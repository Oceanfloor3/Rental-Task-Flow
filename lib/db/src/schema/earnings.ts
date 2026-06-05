import { pgTable, serial, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const earningsTable = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  earningDate: date("earning_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEarningSchema = createInsertSchema(earningsTable).omit({ id: true, createdAt: true });
export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type Earning = typeof earningsTable.$inferSelect;
