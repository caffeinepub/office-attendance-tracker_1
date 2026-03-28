import { useMemo } from "react";
import type { AttendanceRecord } from "../backend";
import { getTotalCompOffUsed } from "../utils/compOffLeaves";
import { calculateDailyHours, isWeekendDate } from "../utils/hoursCalculation";
import type { Holiday } from "./useHolidays";

export interface CompOffEntry {
  date: string;
  hoursWorked: number; // in minutes
  compOff: number; // 0, 0.5, or 1
  expiresOn: string; // YYYY-MM-DD
  source: "holiday" | "weekend";
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcCompOff(hoursWorked: number): number {
  if (hoursWorked >= 480) return 1;
  if (hoursWorked >= 240) return 0.5;
  return 0;
}

export function useCompOff(
  allRecords: AttendanceRecord[],
  holidays: Holiday[],
) {
  const holidayDates = useMemo(
    () => new Set(holidays.map((h) => h.date)),
    [holidays],
  );

  const entries = useMemo<CompOffEntry[]>(() => {
    const today = todayStr();
    const result: CompOffEntry[] = [];

    for (const r of allRecords) {
      // Holiday working: flagged explicitly
      if (r.holidayWorking === true && holidayDates.has(r.date)) {
        const hoursWorked = calculateDailyHours({
          date: r.date,
          swipeIn: r.swipeIn,
          swipeOut: r.swipeOut,
          breakfastAtOffice: r.breakfastAtOffice,
          leaveType: "noLeave",
        });
        const compOff = calcCompOff(hoursWorked);
        const expiresOn = addDays(r.date, 60);
        if (expiresOn >= today && compOff > 0) {
          result.push({
            date: r.date,
            hoursWorked,
            compOff,
            expiresOn,
            source: "holiday",
          });
        }
        continue; // skip weekend check for this date
      }

      // Weekend working: Sat/Sun, not a holiday, has actual swipe-in/out data
      if (
        isWeekendDate(r.date) &&
        !holidayDates.has(r.date) &&
        r.swipeIn &&
        r.swipeOut
      ) {
        const hoursWorked = calculateDailyHours({
          date: r.date,
          swipeIn: r.swipeIn,
          swipeOut: r.swipeOut,
          breakfastAtOffice: r.breakfastAtOffice,
          leaveType: "noLeave",
        });
        const compOff = calcCompOff(hoursWorked);
        const expiresOn = addDays(r.date, 60);
        if (expiresOn >= today && compOff > 0) {
          result.push({
            date: r.date,
            hoursWorked,
            compOff,
            expiresOn,
            source: "weekend",
          });
        }
      }
    }

    return result;
  }, [allRecords, holidayDates]);

  const earnedBalance = useMemo(
    () => entries.reduce((sum, e) => sum + e.compOff, 0),
    [entries],
  );

  // Subtract comp off days already used as leave
  const totalUsed = getTotalCompOffUsed();
  const balance = Math.max(0, earnedBalance - totalUsed);

  return { balance, earnedBalance, totalUsed, entries };
}
