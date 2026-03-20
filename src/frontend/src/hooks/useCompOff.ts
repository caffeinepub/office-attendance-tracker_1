import { useMemo } from "react";
import type { AttendanceRecord } from "../backend";
import { LeaveType } from "../backend";
import { calculateDailyHours } from "../utils/hoursCalculation";
import type { Holiday } from "./useHolidays";

export interface CompOffEntry {
  date: string;
  hoursWorked: number; // in minutes
  compOff: number; // 0, 0.5, or 1
  expiresOn: string; // YYYY-MM-DD
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
    return allRecords
      .filter((r) => r.holidayWorking === true && holidayDates.has(r.date))
      .map((r) => {
        const hoursWorked = calculateDailyHours({
          date: r.date,
          swipeIn: r.swipeIn,
          swipeOut: r.swipeOut,
          breakfastAtOffice: r.breakfastAtOffice,
          leaveType: "noLeave", // holiday working = treat as a normal work session
        });
        let compOff = 0;
        if (hoursWorked >= 480) compOff = 1;
        else if (hoursWorked >= 240) compOff = 0.5;
        const expiresOn = addDays(r.date, 60);
        return { date: r.date, hoursWorked, compOff, expiresOn };
      })
      .filter((e) => e.expiresOn >= today);
  }, [allRecords, holidayDates]);

  const balance = useMemo(
    () => entries.reduce((sum, e) => sum + e.compOff, 0),
    [entries],
  );

  return { balance, entries };
}
