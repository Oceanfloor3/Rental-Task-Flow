import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";
import { sendTemplatedEmail } from "./email";
import { parseUser, countWorkingDays, LEVEL_ORDER } from "./task-levels";

const LEVEL_LABELS: Record<string, string> = {
  V0:  "V0 Starter",
  V1:  "V1 Foundation",
  V2:  "V2 Bronze",
  V3:  "V3 Silver",
  V4:  "V4 Gold",
  V5:  "V5 Platinum",
  V6:  "V6 Diamond",
  V7:  "V7 Emerald",
  V8:  "V8 Sapphire",
  V9:  "V9 Ruby",
  V10: "V10 Elite",
  V11: "V11 Crown",
};

/**
 * Calculate the calendar date on which working day N will be reached,
 * starting from startDateStr (inclusive as day 1).
 */
function addWorkingDays(startDateStr: string, workingDaysTarget: number): Date {
  const result = new Date(startDateStr + "T00:00:00Z");
  let counted = 0;
  while (counted < workingDaysTarget) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) counted++;
  }
  return result;
}

async function runExpiryNotifications(today: string): Promise<void> {
  logger.info({ today }, "Scheduler: running level expiry notification check");

  const users = await db.select().from(usersTable);

  let sent2Day = 0;
  let sent1Day = 0;

  for (const user of users) {
    if (user.role === "admin" || !user.email) continue;

    const { activatedLevels, activationDates } = parseUser(user as any);

    for (const lvl of activatedLevels) {
      const startDate = activationDates[lvl];
      if (!startDate) continue;

      const daysCompleted = countWorkingDays(startDate, today);

      // At 48 working days done → 2 working days remain
      // At 49 working days done → 1 working day remains
      const templateKey = daysCompleted === 48
        ? "levelExpiry2Day"
        : daysCompleted === 49
          ? "levelExpiry1Day"
          : null;

      if (!templateKey) continue;

      const daysLeft = 50 - daysCompleted;
      // Compute the calendar date when day 50 is hit
      const expiryDateObj = addWorkingDays(startDate, 50);
      const expiryDate = expiryDateObj.toLocaleDateString("en-NG", {
        day: "numeric", month: "long", year: "numeric",
      });

      const levelLabel = LEVEL_LABELS[lvl] ?? lvl;

      try {
        await sendTemplatedEmail(templateKey, user.email, {
          firstName: user.firstName ?? user.email.split("@")[0] ?? "",
          levelLabel,
          expiryDate,
          daysCompleted: String(daysCompleted),
          daysLeft: String(daysLeft),
        });
        if (daysLeft === 2) sent2Day++;
        else sent1Day++;
      } catch (err) {
        logger.error({ err, userId: user.id, lvl }, "Scheduler: failed to send expiry email");
      }
    }
  }

  logger.info({ sent2Day, sent1Day }, "Scheduler: level expiry notifications sent");
}

let lastRunDate = "";

function scheduleNextCheck(): void {
  // Determine ms until 8:00 AM Africa/Lagos time (UTC+1)
  const now = new Date();
  // Get current Lagos time
  const lagosNow = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  const lagosHour = lagosNow.getHours();
  const lagosMinute = lagosNow.getMinutes();

  // ms until next 8:00 AM Lagos
  let msUntil8am: number;
  if (lagosHour < 8 || (lagosHour === 8 && lagosMinute === 0)) {
    // Fire today at 8am
    const msIntoDay = (lagosHour * 60 + lagosMinute) * 60 * 1000 + lagosNow.getSeconds() * 1000;
    msUntil8am = 8 * 60 * 60 * 1000 - msIntoDay;
  } else {
    // Fire tomorrow at 8am
    const msIntoDay = (lagosHour * 60 + lagosMinute) * 60 * 1000 + lagosNow.getSeconds() * 1000;
    msUntil8am = (24 * 60 * 60 * 1000) - msIntoDay + (8 * 60 * 60 * 1000);
  }

  // Clamp to at least 1s to avoid tight loops
  if (msUntil8am < 1000) msUntil8am = 1000;

  logger.info({ nextRunInMinutes: Math.round(msUntil8am / 60000) }, "Scheduler: next expiry check scheduled");

  setTimeout(async () => {
    const today = new Date().toISOString().split("T")[0]!;
    // Skip weekends — working-day count doesn't change, so no emails needed
    const dayOfWeek = new Date(today + "T00:00:00Z").getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && lastRunDate !== today) {
      lastRunDate = today;
      await runExpiryNotifications(today).catch(err =>
        logger.error({ err }, "Scheduler: runExpiryNotifications failed"),
      );
    }
    // Schedule the next day's run
    scheduleNextCheck();
  }, msUntil8am);
}

export function startScheduler(): void {
  logger.info("Scheduler: level expiry notification scheduler started");
  scheduleNextCheck();
}
