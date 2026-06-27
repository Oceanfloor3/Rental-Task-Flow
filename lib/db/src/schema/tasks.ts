import { pgTable, text, serial, integer, numeric, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  propertyName: text("property_name").notNull(),
  propertyType: text("property_type").notNull(),
  location: text("location").notNull(),
  reward: numeric("reward", { precision: 12, scale: 2 }).notNull(),
  imageUrl: text("image_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskCompletionsTable = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  propertyId: integer("property_id").notNull(),
  completionDate: date("completion_date", { mode: "string" }).notNull(),
  reward: numeric("reward", { precision: 12, scale: 2 }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  referralBonus: numeric("referral_bonus", { precision: 15, scale: 2 }).notNull().default("0"),
  subordinateCommission: numeric("subordinate_commission", { precision: 15, scale: 2 }).notNull().default("0"),
  totalReferrals: integer("total_referrals").notNull().default(0),
  leadershipBalance: numeric("leadership_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  leadershipMilestonePaid: integer("leadership_milestone_paid").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;

export const insertTaskCompletionSchema = createInsertSchema(taskCompletionsTable).omit({ id: true, completedAt: true });
export type InsertTaskCompletion = z.infer<typeof insertTaskCompletionSchema>;
export type TaskCompletion = typeof taskCompletionsTable.$inferSelect;

export const insertReferralSchema = createInsertSchema(referralsTable).omit({ id: true, createdAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;
