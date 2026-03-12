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
      <div className="bg-popover border border-border rounded-xl px-3 py-2 shadow-elevated">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">
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

  // Weekly chart data - all 7 days
  const weeklyChartData = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
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

  // Monthly chart data - by week
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

  // Stats
  const stats = useMemo(() => {
    const allCalc = monthRecords
      .map(toCalcRecord)
      .filter((r) => !isWeekendDate(r.date) && r.leaveType === "noLeave");

    const hoursArr = allCalc
      .map((r) => calculateDailyHours(r))
      .filter((h) => h > 0);

    if (hoursArr.length === 0) {
      return {
        avgDaily: 0,
        avgWeekly: 0,
        highest: 0,
        lowest: 0,
        highestDate: "",
        lowestDate: "",
      };
    }

    const avgDaily = hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length;
    const highest = Math.max(...hoursArr);
    const lowest = Math.min(...hoursArr);

    const highestRecord = allCalc.find(
      (r) => calculateDailyHours(r) === highest,
    );
    const lowestRecord = allCalc.find((r) => calculateDailyHours(r) === lowest);

    // Weekly average
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

  return (
    <div className="page-enter px-4 py-5 space-y-5">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Analytics
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(today, "MMMM yyyy")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Weekly Chart */}
          <div className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                This Week
              </h3>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.01 85 / 0.3)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "oklch(0.52 0.015 260)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.52 0.015 260)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.floor(v / 60)}h`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="hours"
                    fill="oklch(0.62 0.18 55)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="app-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {format(today, "MMMM")} by Week
              </h3>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyChartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.01 85 / 0.3)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "oklch(0.52 0.015 260)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "oklch(0.52 0.015 260)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.floor(v / 60)}h`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="hours"
                    fill="oklch(0.55 0.16 145)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="app-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Avg Daily
                  </p>
                </div>
                <p className="text-xl font-display font-bold text-foreground">
                  {formatHoursDisplay(stats.avgDaily)}
                </p>
              </div>
              <div className="app-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Avg Weekly
                  </p>
                </div>
                <p className="text-xl font-display font-bold text-foreground">
                  {formatHoursDisplay(stats.avgWeekly)}
                </p>
              </div>
              <div className="app-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-success" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Best Day
                  </p>
                </div>
                <p className="text-xl font-display font-bold text-foreground">
                  {formatHoursDisplay(stats.highest)}
                </p>
                {stats.highestDate && (
                  <p className="text-xs text-muted-foreground">
                    {stats.highestDate}
                  </p>
                )}
              </div>
              <div className="app-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Lowest Day
                  </p>
                </div>
                <p className="text-xl font-display font-bold text-foreground">
                  {formatHoursDisplay(stats.lowest)}
                </p>
                {stats.lowestDate && (
                  <p className="text-xs text-muted-foreground">
                    {stats.lowestDate}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
