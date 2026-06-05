import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const helpCenterTable = pgTable("help_center", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  handle: text("handle").notNull(),
  url: text("url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertHelpCenterSchema = createInsertSchema(helpCenterTable).omit({ id: true });
export type InsertHelpCenter = z.infer<typeof insertHelpCenterSchema>;
export type HelpCenter = typeof helpCenterTable.$inferSelect;
