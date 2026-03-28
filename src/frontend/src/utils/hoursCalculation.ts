// Pure calculation utility module for working hours

export const WORK_WINDOW_START = 7 * 60; // 7:00 AM in minutes
export const WORK_WINDOW_END = 19 * 60; // 7:00 PM in minutes
export const CORE_HOURS_START = 9 * 60 + 30; // 9:30 AM in minutes
export const CORE_HOURS_END = 16 * 60; // 4:00 PM in minutes
export const DEFAULT_WEEKLY_TARGET = 42 * 60 + 30; // 42h 30m in minutes
export const BREAKFAST_BONUS = 30; // 30 minutes
export const LUNCH_DEDUCTION = 30; // 30 minutes – deducted on regular working days (noLeave only)
export const FULL_DAY_LEAVE_REDUCTION = 8 * 60 + 30; // 8h 30m
export const HALF_DAY_FIRST_REDUCTION = 4 * 60 + 30; // 4h 30m
export const HALF_DAY_SECOND_REDUCTION = 4 * 60; // 4h 00m
export const COMP_OFF_HALF_REDUCTION = 4 * 60; // 4h flat for comp off half-days
export const DAILY_TARGET_MINUTES = 8 * 60 + 30; // 8h 30m – standard daily target

const HALF_PAST_12 = 12 * 60 + 30; // 12:30 in minutes
const ONE_PM = 13 * 60; // 13:00 in minutes

// The afternoon half always starts at 13:00 for halfDayFirstHalf entries
const FIRST_HALF_END = 13 * 60; // 13:00 in minutes – effective start for first-half leave afternoon work

export type LeaveTypeStr =
  | "noLeave"
  | "halfDayFirstHalf"
  | "halfDaySecondHalf"
  | "fullDayLeave"
  | "compOff"
  | "compOffFull"
  | "compOffFirstHalf"
  | "compOffSecondHalf";

export interface DayRecord {
  date: string;
  swipeIn: string;
  swipeOut: string;
  breakfastAtOffice: boolean;
  leaveType: LeaveTypeStr;
  holidayWorking?: boolean;
}

/** Parse "HH:MM" to total minutes from midnight */
export function parseTime(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Format total minutes to "HH:MM" */
export function formatMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format total minutes to "Xh XXm" display string */
export function formatHoursDisplay(totalMinutes: number): string {
  const clamped = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Format total minutes to "H:MM AM/PM" */
export function formatTimeAmPm(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Clamp time to working window 7:00–19:00 */
export function clampToWorkingWindow(timeMinutes: number): number {
  return Math.min(Math.max(timeMinutes, WORK_WINDOW_START), WORK_WINDOW_END);
}

/** Apply half-day leave time adjustments */
export function applyLeaveTimeAdjustments(
  swipeInMinutes: number,
  swipeOutMinutes: number,
  leaveType: LeaveTypeStr,
): { swipeIn: number; swipeOut: number } {
  if (leaveType === "halfDayFirstHalf" || leaveType === "compOffFirstHalf") {
    // If swipe-in is between 12:30 PM and 1:00 PM, auto-set to 1:00 PM
    if (swipeInMinutes >= HALF_PAST_12 && swipeInMinutes <= ONE_PM) {
      return { swipeIn: ONE_PM, swipeOut: swipeOutMinutes };
    }
  }

  if (leaveType === "halfDaySecondHalf" || leaveType === "compOffSecondHalf") {
    // If swipe-out is between 12:30 PM and 1:00 PM, auto-set to 12:30 PM
    if (swipeOutMinutes >= HALF_PAST_12 && swipeOutMinutes <= ONE_PM) {
      return { swipeIn: swipeInMinutes, swipeOut: HALF_PAST_12 };
    }
  }

  return { swipeIn: swipeInMinutes, swipeOut: swipeOutMinutes };
}

/**
 * Calculate daily working hours in minutes.
 *
 * Rules:
 * - fullDayLeave: 0 minutes.
 *
 * - halfDayFirstHalf:
 *     The employee takes the morning (first half) as leave and works the afternoon.
 *     Working window is ALWAYS fixed from 13:00 → clampedSwipeOut (max 19:00).
 *     Actual swipe-in time is completely ignored — the effective start is always 13:00.
 *     No breakfast bonus (employee not in office during morning).
 *     No lunch deduction.
 *     Example: swipeIn=08:00, swipeOut=16:00, breakfast=true  → 16:00 − 13:00 = 3h 00m
 *     Example: swipeIn=13:00, swipeOut=16:00, breakfast=false → 16:00 − 13:00 = 3h 00m
 *     Example: swipeIn=14:00, swipeOut=18:00, breakfast=false → 18:00 − 13:00 = 5h 00m
 *     Example: swipeIn=09:00, swipeOut=20:00, breakfast=true  → 19:00 − 13:00 = 6h 00m (clamped)
 *
 * - halfDaySecondHalf:
 *     Primary block: clampedSwipeIn (min 07:00) → 12:30.
 *     If swipeOut > 13:00, extra hours = clampedSwipeOut (max 19:00) − 13:00 are added.
 *     Breakfast bonus (+30 min) applies when breakfastAtOffice is true.
 *     No lunch deduction.
 *     Example: swipeIn=08:00, swipeOut=12:30, breakfast=false → 12:30 − 08:00 = 4h 30m ✓
 *     Example: swipeIn=08:00, swipeOut=12:30, breakfast=true  → (12:30 − 08:00) + 0:30 = 5h 00m
 *     Example: swipeIn=08:00, swipeOut=15:00, breakfast=false → (12:30 − 08:00) + (15:00 − 13:00) = 6h 30m
 *
 * - noLeave (regular working day):
 *     net = (clampedOut − clampedIn) − LUNCH_DEDUCTION (30 min) + BREAKFAST_BONUS (30 min, if applicable)
 *     Exception: no lunch deduction on holiday/weekend working days.
 *     Example: swipeIn=07:00, swipeOut=16:00, no breakfast → 9h 00m − 30m = 8h 30m ✓
 */
export function calculateDailyHours(record: DayRecord): number {
  if (
    record.leaveType === "fullDayLeave" ||
    record.leaveType === "compOff" ||
    record.leaveType === "compOffFull"
  )
    return 0;

  if (!record.swipeIn || !record.swipeOut) return 0;

  const swipeInMins = parseTime(record.swipeIn);
  const swipeOutMins = parseTime(record.swipeOut);

  // --- halfDayFirstHalf ---
  // The employee takes the MORNING as leave and works the AFTERNOON.
  // Effective working window is always 13:00 → clampedSwipeOut (max 19:00).
  // Actual swipe-in is completely ignored — start is always FIRST_HALF_END (13:00).
  // No breakfast bonus. No lunch deduction.
  if (
    record.leaveType === "halfDayFirstHalf" ||
    record.leaveType === "compOffFirstHalf"
  ) {
    // Cap swipe-out at 19:00
    const effectiveOut = Math.min(swipeOutMins, WORK_WINDOW_END);
    // Net hours = swipeOut − 13:00 (clamped to 0 if swipeOut ≤ 13:00)
    const hours = Math.max(0, effectiveOut - FIRST_HALF_END);
    return hours;
  }

  // For all other leave types, validate that swipeOut > swipeIn
  if (swipeOutMins <= swipeInMins) return 0;

  // --- halfDaySecondHalf ---
  // Primary block: clampedSwipeIn → 12:30
  // Extra block: if swipeOut > 13:00, add (clampedSwipeOut − 13:00)
  // Breakfast bonus applies. No lunch deduction.
  if (
    record.leaveType === "halfDaySecondHalf" ||
    record.leaveType === "compOffSecondHalf"
  ) {
    const effectiveIn = clampToWorkingWindow(swipeInMins);
    // Primary block: from effectiveIn up to 12:30
    const primaryHours = Math.max(0, HALF_PAST_12 - effectiveIn);

    // Extra block: hours worked after 13:00
    let extraHours = 0;
    if (swipeOutMins > ONE_PM) {
      const effectiveOut = clampToWorkingWindow(swipeOutMins);
      extraHours = Math.max(0, effectiveOut - ONE_PM);
    }

    let hours = primaryHours + extraHours;

    // Breakfast bonus
    if (record.breakfastAtOffice) {
      hours += BREAKFAST_BONUS;
    }

    return Math.max(0, hours);
  }

  // --- noLeave (regular working day) ---
  // Apply leave time adjustments (half-day boundary corrections for edge cases)
  const adjusted = applyLeaveTimeAdjustments(
    swipeInMins,
    swipeOutMins,
    record.leaveType,
  );
  const effectiveIn = clampToWorkingWindow(adjusted.swipeIn);
  const effectiveOut = clampToWorkingWindow(adjusted.swipeOut);

  let hours = Math.max(0, effectiveOut - effectiveIn);

  // Skip lunch deduction on holiday/weekend working days
  const isWeekendWorking = isWeekendDate(record.date);
  if (!record.holidayWorking && !isWeekendWorking) {
    hours -= LUNCH_DEDUCTION;
  }

  return Math.max(0, hours);
}

/** Check if core hours requirement is met */
export function checkCoreHoursViolation(record: DayRecord): boolean {
  if (
    record.leaveType === "fullDayLeave" ||
    record.leaveType === "compOff" ||
    record.leaveType === "compOffFull"
  )
    return false;
  if (
    record.leaveType === "halfDayFirstHalf" ||
    record.leaveType === "compOffFirstHalf"
  )
    return false;
  if (
    record.leaveType === "halfDaySecondHalf" ||
    record.leaveType === "compOffSecondHalf"
  )
    return false;
  if (!record.swipeIn || !record.swipeOut) return false;

  const swipeInMins = parseTime(record.swipeIn);
  const swipeOutMins = parseTime(record.swipeOut);

  // Must be present during 9:30 AM – 4:00 PM
  return swipeInMins > CORE_HOURS_START || swipeOutMins < CORE_HOURS_END;
}

/** Get leave reduction in minutes for a given leave type */
export function getLeaveReduction(leaveType: LeaveTypeStr): number {
  switch (leaveType) {
    case "fullDayLeave":
    case "compOff":
    case "compOffFull":
      return FULL_DAY_LEAVE_REDUCTION;
    case "halfDayFirstHalf":
      return HALF_DAY_FIRST_REDUCTION;
    case "halfDaySecondHalf":
      return HALF_DAY_SECOND_REDUCTION;
    case "compOffFirstHalf":
    case "compOffSecondHalf":
      return COMP_OFF_HALF_REDUCTION;
    default:
      return 0;
  }
}

/** Calculate adjusted weekly target based on leaves */
export function calculateWeeklyTarget(records: DayRecord[]): number {
  const totalReduction = records.reduce(
    (sum, r) => sum + getLeaveReduction(r.leaveType),
    0,
  );
  return Math.max(0, DEFAULT_WEEKLY_TARGET - totalReduction);
}

/** Get the Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get the Sunday of the week containing the given date */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Format date to YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD to Date */
export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Check if a date is a weekend */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Check if a date string is a weekend */
export function isWeekendDate(dateStr: string): boolean {
  return isWeekend(parseDateKey(dateStr));
}

/** Get current time as HH:MM string */
export function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * Calculate smart swipe-out prediction.
 *
 * For noLeave days: adds LUNCH_DEDUCTION to required raw time, subtracts breakfast bonus.
 *
 * For halfDayFirstHalf:
 *   - Fixed start at 13:00, no breakfast bonus.
 *   - predictedSwipeOut = 13:00 + remaining (clamped to 19:00).
 *
 * For halfDaySecondHalf:
 *   - Primary block ends at 12:30. Breakfast bonus reduces raw time needed.
 *   - If remaining can be covered by primary block (clampedIn → 12:30 + breakfast),
 *     predicted swipe-out is within the morning block.
 *   - If remaining exceeds primary block, extra hours are needed after 13:00.
 *
 * For fullDayLeave: no prediction needed (remaining will be 0 after target reduction).
 */
export function calculateSwipeOutPrediction(
  swipeInStr: string,
  breakfastAtOffice: boolean,
  completedMinutesThisWeek: number,
  weeklyTargetMinutes: number,
  leaveType: LeaveTypeStr = "noLeave",
): { needed: number; predictedSwipeOut: string | null; alreadyMet: boolean } {
  const remaining = weeklyTargetMinutes - completedMinutesThisWeek;

  if (remaining <= 0) {
    return { needed: 0, predictedSwipeOut: null, alreadyMet: true };
  }

  if (!swipeInStr) {
    return { needed: remaining, predictedSwipeOut: null, alreadyMet: false };
  }

  const swipeInMins = parseTime(swipeInStr);

  // --- halfDayFirstHalf ---
  // Working window starts at 13:00 regardless of actual swipe-in.
  // No breakfast bonus. Predict: 13:00 + remaining, clamped to 19:00.
  if (leaveType === "halfDayFirstHalf" || leaveType === "compOffFirstHalf") {
    const predictedOut = FIRST_HALF_END + remaining;
    const clampedOut = Math.min(predictedOut, WORK_WINDOW_END);
    return {
      needed: remaining,
      predictedSwipeOut: formatMinutes(clampedOut),
      alreadyMet: false,
    };
  }

  // --- halfDaySecondHalf ---
  // Primary block: clampedSwipeIn → 12:30 (+ breakfast bonus if applicable).
  // If remaining fits in primary block, predict swipe-out within morning.
  // If remaining exceeds primary block, extra hours needed after 13:00.
  if (leaveType === "halfDaySecondHalf" || leaveType === "compOffSecondHalf") {
    const effectiveIn = clampToWorkingWindow(swipeInMins);
    const primaryBlockMinutes = Math.max(0, HALF_PAST_12 - effectiveIn);
    const breakfastBonus = breakfastAtOffice ? BREAKFAST_BONUS : 0;
    const totalMorningCapacity = primaryBlockMinutes + breakfastBonus;

    if (remaining <= totalMorningCapacity) {
      // Can finish within the morning block
      // Solve: (predictedOut - effectiveIn) + breakfastBonus = remaining
      // predictedOut = effectiveIn + remaining - breakfastBonus
      const rawNeeded = Math.max(0, remaining - breakfastBonus);
      const predictedOut = effectiveIn + rawNeeded;
      const clampedOut = Math.min(predictedOut, HALF_PAST_12);
      return {
        needed: remaining,
        predictedSwipeOut: formatMinutes(clampedOut),
        alreadyMet: false,
      };
    }
    // Need extra hours after 13:00
    // Extra needed = remaining - totalMorningCapacity
    const extraNeeded = remaining - totalMorningCapacity;
    const predictedOut = ONE_PM + extraNeeded;
    const clampedOut = Math.min(predictedOut, WORK_WINDOW_END);
    return {
      needed: remaining,
      predictedSwipeOut: formatMinutes(clampedOut),
      alreadyMet: false,
    };
  }

  // --- noLeave (regular working day) ---
  const effectiveIn = clampToWorkingWindow(swipeInMins);

  // Add lunch deduction: employee must work 30 extra raw minutes to cover lunch
  let requiredRawTime = remaining + LUNCH_DEDUCTION;
  // Subtract breakfast bonus: breakfast adds 30 net minutes, reducing raw time needed
  if (breakfastAtOffice) {
    requiredRawTime -= BREAKFAST_BONUS;
  }

  const requiredWorkTime = Math.max(0, requiredRawTime);
  const predictedOut = effectiveIn + requiredWorkTime;
  const clampedOut = Math.min(predictedOut, WORK_WINDOW_END);

  return {
    needed: remaining,
    predictedSwipeOut: formatMinutes(clampedOut),
    alreadyMet: false,
  };
}

/** Get display label for leave type */
export function getLeaveTypeLabel(leaveType: LeaveTypeStr): string {
  switch (leaveType) {
    case "noLeave":
      return "No Leave";
    case "halfDayFirstHalf":
      return "Half-Day (First Half)";
    case "halfDaySecondHalf":
      return "Half-Day (Second Half)";
    case "fullDayLeave":
      return "Full-Day Leave";
    case "compOff":
    case "compOffFull":
      return "Comp Off – Full Day";
    case "compOffFirstHalf":
      return "Comp Off – First Half";
    case "compOffSecondHalf":
      return "Comp Off – Second Half";
    default:
      return "No Leave";
  }
}

/** Get month start and end dates */
export function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
  };
}

/** Get week range as date strings */
export function getWeekRange(date: Date): { start: string; end: string } {
  return {
    start: formatDateKey(getWeekStart(date)),
    end: formatDateKey(getWeekEnd(date)),
  };
}

/**
 * Returns colour indicator info for a daily hours value.
 *
 * The comparison target (threshold) for each leave type:
 * - fullDayLeave    → neutral (no indicator)
 * - halfDayFirstHalf  → threshold = HALF_DAY_FIRST_REDUCTION = 4h 30m (270 min)
 *                       (employee works the afternoon half; target is 4h 30m)
 * - halfDaySecondHalf → threshold = HALF_DAY_SECOND_REDUCTION = 4h 00m (240 min)
 *                       (employee works the morning half; target is 4h 00m)
 * - noLeave         → threshold = DAILY_TARGET_MINUTES = 8h 30m (510 min)
 *
 * Examples:
 *   halfDayFirstHalf, 3h 00m (180 min) < 4h 30m (270 min) → red  ✓
 *   halfDayFirstHalf, 4h 30m (270 min) = 4h 30m (270 min) → green ✓
 *   halfDaySecondHalf, 3h 00m (180 min) < 4h 00m (240 min) → red  ✓
 *   halfDaySecondHalf, 4h 00m (240 min) = 4h 00m (240 min) → green ✓
 *   noLeave, 8h 30m → green ✓
 */
export interface DailyHoursIndicator {
  color: "green" | "red" | "neutral";
  hoursDisplay: string;
  diffDisplay: string | null; // e.g. "+0h 15m" or "-0h 40m", null for neutral
  diffMinutes: number; // positive = surplus, negative = shortfall
}

export function getDailyHoursIndicator(
  dailyMinutes: number,
  leaveType: LeaveTypeStr,
  isWeekendDay: boolean,
  hasRecord: boolean,
): DailyHoursIndicator {
  const hoursDisplay = formatHoursDisplay(dailyMinutes);

  // Full-day leave: neutral, no indicator
  if (
    leaveType === "fullDayLeave" ||
    leaveType === "compOff" ||
    leaveType === "compOffFull"
  ) {
    return {
      color: "neutral",
      hoursDisplay: "0h 00m",
      diffDisplay: null,
      diffMinutes: 0,
    };
  }

  // Weekend with no record: neutral
  if (isWeekendDay && !hasRecord) {
    return {
      color: "neutral",
      hoursDisplay: "—",
      diffDisplay: null,
      diffMinutes: 0,
    };
  }

  // No record on a weekday: neutral placeholder
  if (!hasRecord) {
    return {
      color: "neutral",
      hoursDisplay: "—",
      diffDisplay: null,
      diffMinutes: 0,
    };
  }

  // Determine the daily threshold based on leave type.
  // For half-day leaves, the threshold is the expected hours for that half
  // (i.e. the leave reduction value, which equals the expected working hours for that half).
  // For regular days, the threshold is the full daily target.
  let threshold: number;
  if (leaveType === "halfDayFirstHalf") {
    threshold = HALF_DAY_FIRST_REDUCTION; // 4h 30m = 270 min
  } else if (
    leaveType === "halfDaySecondHalf" ||
    leaveType === "compOffFirstHalf" ||
    leaveType === "compOffSecondHalf"
  ) {
    threshold = COMP_OFF_HALF_REDUCTION; // 4h flat = 240 min
  } else {
    threshold = DAILY_TARGET_MINUTES; // 8h 30m = 510 min
  }

  const diff = dailyMinutes - threshold;

  if (diff >= 0) {
    return {
      color: "green",
      hoursDisplay,
      diffDisplay: diff > 0 ? `+${formatHoursDisplay(diff)}` : null,
      diffMinutes: diff,
    };
  }
  return {
    color: "red",
    hoursDisplay,
    diffDisplay: `-${formatHoursDisplay(Math.abs(diff))}`,
    diffMinutes: diff,
  };
}
