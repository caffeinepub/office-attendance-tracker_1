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
export const DAILY_TARGET_MINUTES = 8 * 60 + 30; // 8h 30m – standard daily target

export type LeaveTypeStr = 'noLeave' | 'halfDayFirstHalf' | 'halfDaySecondHalf' | 'fullDayLeave';

export interface DayRecord {
  date: string;
  swipeIn: string;
  swipeOut: string;
  breakfastAtOffice: boolean;
  leaveType: LeaveTypeStr;
}

/** Parse "HH:MM" to total minutes from midnight */
export function parseTime(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/** Format total minutes to "HH:MM" */
export function formatMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format total minutes to "Xh XXm" display string */
export function formatHoursDisplay(totalMinutes: number): string {
  const clamped = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Format total minutes to "H:MM AM/PM" */
export function formatTimeAmPm(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Clamp time to working window 7:00–19:00 */
export function clampToWorkingWindow(timeMinutes: number): number {
  return Math.min(Math.max(timeMinutes, WORK_WINDOW_START), WORK_WINDOW_END);
}

/** Apply half-day leave time adjustments */
export function applyLeaveTimeAdjustments(
  swipeInMinutes: number,
  swipeOutMinutes: number,
  leaveType: LeaveTypeStr
): { swipeIn: number; swipeOut: number } {
  const HALF_PAST_12 = 12 * 60 + 30; // 12:30 PM
  const ONE_PM = 13 * 60; // 1:00 PM

  if (leaveType === 'halfDayFirstHalf') {
    // If swipe-in is between 12:30 PM and 1:00 PM, auto-set to 1:00 PM
    if (swipeInMinutes >= HALF_PAST_12 && swipeInMinutes <= ONE_PM) {
      return { swipeIn: ONE_PM, swipeOut: swipeOutMinutes };
    }
  }

  if (leaveType === 'halfDaySecondHalf') {
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
 * - halfDayFirstHalf: raw clamped hours from swipeIn, no lunch deduction.
 * - halfDaySecondHalf:
 *     If swipeOut > 13:00, extra hours = (clampedSwipeOut − 13:00) + breakfast bonus if applicable.
 *     If swipeOut ≤ 13:00, 0 extra hours (employee left before/at 13:00).
 * - noLeave (regular working day):
 *     net = (clampedOut − clampedIn) − LUNCH_DEDUCTION (30 min) + BREAKFAST_BONUS (30 min, if applicable)
 *
 * Example: swipeIn=07:00, swipeOut=16:00, no breakfast, noLeave
 *   raw = 9h 00m, net = 9h 00m − 30m lunch = 8h 30m ✓
 *
 * Example: swipeIn=07:00, swipeOut=16:00, breakfast=true, noLeave
 *   raw = 9h 00m, net = 9h 00m − 30m lunch + 30m breakfast = 9h 00m ✓
 *
 * Example: halfDaySecondHalf, swipeOut=15:00, no breakfast
 *   extra = 15:00 − 13:00 = 2h 00m ✓
 */
export function calculateDailyHours(record: DayRecord): number {
  if (record.leaveType === 'fullDayLeave') return 0;

  if (!record.swipeIn || !record.swipeOut) return 0;

  let swipeInMins = parseTime(record.swipeIn);
  let swipeOutMins = parseTime(record.swipeOut);

  if (swipeOutMins <= swipeInMins) return 0;

  const ONE_PM = 13 * 60; // 13:00 in minutes

  // Special handling for halfDaySecondHalf
  if (record.leaveType === 'halfDaySecondHalf') {
    if (swipeOutMins <= ONE_PM) {
      // Worked up to 13:00 or earlier — no credited hours
      return 0;
    }
    // Worked after 13:00 — credit hours from 13:00 onwards
    const effectiveOut = clampToWorkingWindow(swipeOutMins);
    let hours = Math.max(0, effectiveOut - ONE_PM);
    if (record.breakfastAtOffice) {
      hours += BREAKFAST_BONUS;
    }
    return Math.max(0, hours);
  }

  // Apply leave time adjustments (half-day boundary corrections)
  const adjusted = applyLeaveTimeAdjustments(swipeInMins, swipeOutMins, record.leaveType);
  swipeInMins = adjusted.swipeIn;
  swipeOutMins = adjusted.swipeOut;

  // Clamp to working window
  const effectiveIn = clampToWorkingWindow(swipeInMins);
  const effectiveOut = clampToWorkingWindow(swipeOutMins);

  let hours = Math.max(0, effectiveOut - effectiveIn);

  if (record.leaveType === 'noLeave') {
    // Deduct 30 minutes for lunch break on regular working days only
    hours -= LUNCH_DEDUCTION;

    // Add breakfast bonus if employee had breakfast at the office
    if (record.breakfastAtOffice) {
      hours += BREAKFAST_BONUS;
    }
  }
  // halfDayFirstHalf: no lunch deduction, no breakfast bonus adjustment

  // Ensure we never return negative minutes
  return Math.max(0, hours);
}

/** Check if core hours requirement is met */
export function checkCoreHoursViolation(record: DayRecord): boolean {
  if (record.leaveType === 'fullDayLeave') return false;
  if (record.leaveType === 'halfDayFirstHalf') return false; // Half day first half - no core hours check
  if (record.leaveType === 'halfDaySecondHalf') return false; // Half day second half - no core hours check
  if (!record.swipeIn || !record.swipeOut) return false;

  const swipeInMins = parseTime(record.swipeIn);
  const swipeOutMins = parseTime(record.swipeOut);

  // Must be present during 9:30 AM – 4:00 PM
  return swipeInMins > CORE_HOURS_START || swipeOutMins < CORE_HOURS_END;
}

/** Get leave reduction in minutes for a given leave type */
export function getLeaveReduction(leaveType: LeaveTypeStr): number {
  switch (leaveType) {
    case 'fullDayLeave': return FULL_DAY_LEAVE_REDUCTION;
    case 'halfDayFirstHalf': return HALF_DAY_FIRST_REDUCTION;
    case 'halfDaySecondHalf': return HALF_DAY_SECOND_REDUCTION;
    default: return 0;
  }
}

/** Calculate adjusted weekly target based on leaves */
export function calculateWeeklyTarget(records: DayRecord[]): number {
  const totalReduction = records.reduce((sum, r) => sum + getLeaveReduction(r.leaveType), 0);
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
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD to Date */
export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
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
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calculate smart swipe-out prediction.
 *
 * For a noLeave day, the lunch deduction (30 min) will be applied when hours are
 * calculated, so the employee needs to stay LUNCH_DEDUCTION extra raw minutes to
 * achieve the required net minutes. The breakfast bonus reduces the raw time needed.
 *
 * Example: remaining=8h30m, noLeave, no breakfast
 *   requiredRaw = 8h30m + 30m lunch = 9h00m raw → swipe out at swipeIn + 9h00m
 *
 * Example: remaining=8h30m, noLeave, breakfast=true
 *   requiredRaw = 8h30m + 30m lunch − 30m breakfast = 8h30m raw
 */
export function calculateSwipeOutPrediction(
  swipeInStr: string,
  breakfastAtOffice: boolean,
  completedMinutesThisWeek: number,
  weeklyTargetMinutes: number,
  leaveType: LeaveTypeStr = 'noLeave'
): { needed: number; predictedSwipeOut: string | null; alreadyMet: boolean } {
  const remaining = weeklyTargetMinutes - completedMinutesThisWeek;

  if (remaining <= 0) {
    return { needed: 0, predictedSwipeOut: null, alreadyMet: true };
  }

  if (!swipeInStr) {
    return { needed: remaining, predictedSwipeOut: null, alreadyMet: false };
  }

  const swipeInMins = parseTime(swipeInStr);
  const effectiveIn = clampToWorkingWindow(swipeInMins);

  // For noLeave days: the lunch deduction will be applied to the final hours,
  // so we need to add LUNCH_DEDUCTION to the raw time needed.
  // The breakfast bonus reduces the raw time needed (it adds to net hours).
  let requiredRawTime = remaining;

  if (leaveType === 'noLeave') {
    // Add lunch deduction: employee must work 30 extra raw minutes to cover lunch
    requiredRawTime += LUNCH_DEDUCTION;
    // Subtract breakfast bonus: breakfast adds 30 net minutes, reducing raw time needed
    if (breakfastAtOffice) {
      requiredRawTime -= BREAKFAST_BONUS;
    }
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
    case 'noLeave': return 'No Leave';
    case 'halfDayFirstHalf': return 'Half-Day (First Half)';
    case 'halfDaySecondHalf': return 'Half-Day (Second Half)';
    case 'fullDayLeave': return 'Full-Day Leave';
    default: return 'No Leave';
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
 * - fullDayLeave → neutral (no indicator)
 * - weekend with no record → neutral (no indicator)
 * - hours >= DAILY_TARGET_MINUTES (8h 30m) → green with surplus
 * - hours < DAILY_TARGET_MINUTES on a non-full-day-leave day → red with shortfall
 */
export interface DailyHoursIndicator {
  color: 'green' | 'red' | 'neutral';
  hoursDisplay: string;
  diffDisplay: string | null; // e.g. "+0h 15m" or "-0h 40m", null for neutral
  diffMinutes: number; // positive = surplus, negative = shortfall
}

export function getDailyHoursIndicator(
  dailyMinutes: number,
  leaveType: LeaveTypeStr,
  isWeekendDay: boolean,
  hasRecord: boolean
): DailyHoursIndicator {
  const hoursDisplay = formatHoursDisplay(dailyMinutes);

  // Full-day leave: neutral, no indicator
  if (leaveType === 'fullDayLeave') {
    return { color: 'neutral', hoursDisplay: '0h 00m', diffDisplay: null, diffMinutes: 0 };
  }

  // Weekend with no record: neutral
  if (isWeekendDay && !hasRecord) {
    return { color: 'neutral', hoursDisplay: '—', diffDisplay: null, diffMinutes: 0 };
  }

  // No record on a weekday: neutral placeholder
  if (!hasRecord) {
    return { color: 'neutral', hoursDisplay: '—', diffDisplay: null, diffMinutes: 0 };
  }

  const diff = dailyMinutes - DAILY_TARGET_MINUTES;

  if (diff >= 0) {
    return {
      color: 'green',
      hoursDisplay,
      diffDisplay: `+${formatHoursDisplay(diff)}`,
      diffMinutes: diff,
    };
  } else {
    return {
      color: 'red',
      hoursDisplay,
      diffDisplay: `-${formatHoursDisplay(Math.abs(diff))}`,
      diffMinutes: diff,
    };
  }
}
