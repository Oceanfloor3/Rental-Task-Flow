export const MONTHLY_TRANSFER_LIMITS: Record<string, number> = {
  V0:  2_500,
  V1:  5_000,
  V2:  10_000,
  V3:  15_000,
  V4:  25_000,
  V5:  50_000,
  V6:  75_000,
  V7:  100_000,
  V8:  125_000,
  V9:  175_000,
  V10: 250_000,
  V11: 500_000,
};

export const LEVEL_CONFIG: Record<string, { tasks: number; income: number }> = {
  V0:  { tasks: 5,   income: 1200 },
  V1:  { tasks: 10,  income: 2000 },
  V2:  { tasks: 15,  income: 4000 },
  V3:  { tasks: 20,  income: 6000 },
  V4:  { tasks: 25,  income: 10000 },
  V5:  { tasks: 30,  income: 20000 },
  V6:  { tasks: 35,  income: 40000 },
  V7:  { tasks: 40,  income: 60000 },
  V8:  { tasks: 50,  income: 98000 },
  V9:  { tasks: 100, income: 200000 },
  V10: { tasks: 150, income: 400000 },
  V11: { tasks: 200, income: 600000 },
};

export const LEVEL_ORDER = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11"];

/**
 * Resolve the highest active (non-expired) level key for a user.
 * Checks activatedLevels + levelActivationDates first (multi-level system),
 * then falls back to the position string (legacy/admin-set field).
 * Returns null only for admins; returns "V0" as the minimum for regular users.
 */
export function resolveUserLevelKey(user: {
  role?: string | null;
  activatedLevels?: string | null;
  levelActivationDates?: string | null;
  position?: string | null;
}): string | null {
  if (user.role === "admin") return null;

  const today = new Date().toISOString().split("T")[0]!;
  const { activatedLevels, activationDates } = parseUser(user as any);
  const activeLevels = getActiveLevels(activatedLevels, activationDates, today);

  // Pick the highest active level
  const highestActive = [...LEVEL_ORDER].reverse().find(k => activeLevels.includes(k));
  if (highestActive) return highestActive;

  // Fall back to position string (legacy admin-set field)
  return deriveLevelKeyFromPosition(user.position) ?? "V0";
}

export function countWorkingDays(startDateStr: string, todayStr: string): number {
  const start = new Date(startDateStr + "T00:00:00Z");
  const end   = new Date(todayStr   + "T00:00:00Z");
  if (start > end) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export function getActiveLevels(
  activatedLevels: string[],
  activationDates: Record<string, string>,
  today: string,
): string[] {
  return activatedLevels.filter(lvl => {
    const startDate = activationDates[lvl];
    if (!startDate) return true;
    return countWorkingDays(startDate, today) <= 50;
  });
}

export function getCombinedConfig(activeLevels: string[]): { tasks: number; income: number } {
  let tasks = 0;
  let income = 0;
  for (const lvl of activeLevels) {
    tasks  += LEVEL_CONFIG[lvl]?.tasks  ?? 0;
    income += LEVEL_CONFIG[lvl]?.income ?? 0;
  }
  return { tasks, income };
}

/** Derive the level key (e.g. "V1") from a position string like "V1 FOUNDATION". */
export function deriveLevelKeyFromPosition(position?: string | null): string | null {
  if (!position) return null;
  const upper = position.toUpperCase();
  for (let i = 11; i >= 0; i--) {
    if (upper.includes(`V${i}`)) return `V${i}`;
  }
  return null;
}

export function parseUser(user: { activatedLevels: string; levelActivationDates?: string | null; position?: string | null; level?: string | null }) {
  let activatedLevels: string[] = [];
  try { activatedLevels = JSON.parse(user.activatedLevels || "[]"); } catch { activatedLevels = []; }

  let activationDates: Record<string, string> = {};
  try { activationDates = JSON.parse((user as any).levelActivationDates || "{}"); } catch { activationDates = {}; }

  return { activatedLevels, activationDates };
}
