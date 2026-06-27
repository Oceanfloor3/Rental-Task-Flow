import { pgTable, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const withdrawalSettingsTable = pgTable("withdrawal_settings", {
  id: serial("id").primaryKey(),
  masterLocked: boolean("master_locked").notNull().default(false),
  lockDays: integer("lock_days").notNull().default(0),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  unlockAt: timestamp("unlock_at", { withTimezone: true }),
  manualLocked: boolean("manual_locked").notNull().default(false),
  autoScheduleEnabled: boolean("auto_schedule_enabled").notNull().default(false),
});
