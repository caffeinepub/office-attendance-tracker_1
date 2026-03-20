import { Skeleton } from "@/components/ui/skeleton";
import { addDays, format, startOfWeek } from "date-fns";
import { Award, BarChart2, Clock, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AttendanceRecord, LeaveType } from "../backend";
import { useGetRecordsByDateRange } from "../hooks/useQueries";
import {
  calculateDailyHours,
  formatDateKey,
  formatHoursDisplay,
  getMonthRange,
  getWeekRange,
  isWeekendDate,
  parseDateKey,
} from "../utils/hoursCalculation";

function leaveTypeToStr(
  lt: LeaveType,
): "noLeave" | "halfDayFirstHalf" | "halfDaySecondHalf" | "fullDayLeave" {
  return lt as unknown as
    | "noLeave"
    | "halfDayFirstHalf"
    | "halfDaySecondHalf"
    | "fullDayLeave";
}

function toCalcRecord(r: AttendanceRecord) {
  return {
    date: r.date,
    swipeIn: r.swipeIn,
    swipeOut: r.swipeOut,
    breakfastAtOffice: r.breakfastAtOffice,
    leaveType: leaveTypeToStr(r.leaveType as unknown as LeaveType),
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-3 py-2"
        style={{
          backgroundColor: "oklch(var(--card))",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        }}
      >
        <p style={{ fontSize: 12, color: "oklch(var(--muted-foreground))" }}>
          {label}
        </p>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "oklch(var(--foreground))",
          }}
        >
          {formatHoursDisplay(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
}

export default function Analytics() {
  const today = new Date();
  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);

  const { data: weekRecords = [], isLoading: weekLoading } =
    useGetRecordsByDateRange(weekRange.start, weekRange.end);
  const { data: monthRecords = [], isLoading: monthLoading } =
    useGetRecordsByDateRange(monthRange.start, monthRange.end);

  const weeklyChartData = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateKey = formatDateKey(date);
      const record = weekRecords.find((r) => r.date === dateKey);
      const hours = record ? calculateDailyHours(toCalcRecord(record)) : 0;
      return {
        day: format(date, "EEE"),
        date: dateKey,
        hours,
        isWeekend: isWeekendDate(dateKey),
      };
    });
  }, [weekRecords, today]);

  const monthlyChartData = useMemo(() => {
    const weeks: { week: string; hours: number }[] = [];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let weekNum = 1;
    let current = new Date(monthStart);
    while (current <= monthEnd) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > monthEnd) weekEnd.setTime(monthEnd.getTime());
      const weekStartKey = formatDateKey(current);
      const weekEndKey = formatDateKey(weekEnd);
      const weekHours = monthRecords
        .filter((r) => r.date >= weekStartKey && r.date <= weekEndKey)
        .reduce((sum, r) => sum + calculateDailyHours(toCalcRecord(r)), 0);
      weeks.push({ week: `W${weekNum}`, hours: weekHours });
      weekNum++;
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }, [monthRecords, today]);

  const stats = useMemo(() => {
    const allCalc = monthRecords
      .map(toCalcRecord)
      .filter((r) => !isWeekendDate(r.date) && r.leaveType === "noLeave");
    const hoursArr = allCalc
      .map((r) => calculateDailyHours(r))
      .filter((h) => h > 0);
    if (hoursArr.length === 0)
      return {
        avgDaily: 0,
        avgWeekly: 0,
        highest: 0,
        lowest: 0,
        highestDate: "",
        lowestDate: "",
      };
    const avgDaily = hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length;
    const highest = Math.max(...hoursArr);
    const lowest = Math.min(...hoursArr);
    const highestRecord = allCalc.find(
      (r) => calculateDailyHours(r) === highest,
    );
    const lowestRecord = allCalc.find((r) => calculateDailyHours(r) === lowest);
    const weeklyTotals: Record<string, number> = {};
    for (const r of allCalc) {
      const d = parseDateKey(r.date);
      const weekKey = formatDateKey(startOfWeek(d, { weekStartsOn: 1 }));
      weeklyTotals[weekKey] =
        (weeklyTotals[weekKey] || 0) + calculateDailyHours(r);
    }
    const weeklyArr = Object.values(weeklyTotals);
    const avgWeekly =
      weeklyArr.length > 0
        ? weeklyArr.reduce((a, b) => a + b, 0) / weeklyArr.length
        : 0;
    return {
      avgDaily,
      avgWeekly,
      highest,
      lowest,
      highestDate: highestRecord
        ? format(parseDateKey(highestRecord.date), "MMM d")
        : "",
      lowestDate: lowestRecord
        ? format(parseDateKey(lowestRecord.date), "MMM d")
        : "",
    };
  }, [monthRecords]);

  const isLoading = weekLoading || monthLoading;
  const axisFill = "oklch(0.52 0.01 265)";

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-5">
      <div>
        <h2
          className="ios-number"
          style={{
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "oklch(var(--foreground))",
          }}
        >
          Analytics
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          {format(today, "MMMM yyyy")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          {/* This Week Chart */}
          <div>
            <p className="ios-section-header">This Week</p>
            <div className="ios-card px-4 py-4">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyChartData}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.88 0.006 264 / 0.4)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: axisFill }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: axisFill }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${Math.floor(v / 60)}h`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="hours"
                      fill="oklch(0.59 0.2 255)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Chart */}
          <div>
            <p className="ios-section-header">
              {format(today, "MMMM")} by Week
            </p>
            <div className="ios-card px-4 py-4">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyChartData}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.88 0.006 264 / 0.4)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: axisFill }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: axisFill }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${Math.floor(v / 60)}h`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="hours"
                      fill="oklch(0.7 0.22 145)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div>
            <p className="ios-section-header">This Month</p>
            <div className="ios-card overflow-hidden">
              <div className="ios-row justify-between">
                <div className="flex items-center gap-2">
                  <Clock
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--primary))",
                    }}
                  />
                  <span
                    style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
                  >
                    Avg Daily
                  </span>
                </div>
                <span
                  className="ios-number"
                  style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
                >
                  {formatHoursDisplay(stats.avgDaily)}
                </span>
              </div>
              <div
                style={{
                  height: "0.5px",
                  backgroundColor: "oklch(var(--border) / 0.4)",
                  marginLeft: 16,
                }}
              />
              <div className="ios-row justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--success))",
                    }}
                  />
                  <span
                    style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
                  >
                    Avg Weekly
                  </span>
                </div>
                <span
                  className="ios-number"
                  style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
                >
                  {formatHoursDisplay(stats.avgWeekly)}
                </span>
              </div>
              <div
                style={{
                  height: "0.5px",
                  backgroundColor: "oklch(var(--border) / 0.4)",
                  marginLeft: 16,
                }}
              />
              <div className="ios-row justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--success))",
                    }}
                  />
                  <span
                    style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
                  >
                    Best Day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="ios-number"
                    style={{ fontSize: 17, color: "oklch(var(--success))" }}
                  >
                    {formatHoursDisplay(stats.highest)}
                  </span>
                  {stats.highestDate && (
                    <span
                      style={{
                        fontSize: 13,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      {stats.highestDate}
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  height: "0.5px",
                  backgroundColor: "oklch(var(--border) / 0.4)",
                  marginLeft: 16,
                }}
              />
              <div className="ios-row justify-between">
                <div className="flex items-center gap-2">
                  <Award
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--warning))",
                    }}
                  />
                  <span
                    style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
                  >
                    Lowest Day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="ios-number"
                    style={{ fontSize: 17, color: "oklch(var(--destructive))" }}
                  >
                    {formatHoursDisplay(stats.lowest)}
                  </span>
                  {stats.lowestDate && (
                    <span
                      style={{
                        fontSize: 13,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      {stats.lowestDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
