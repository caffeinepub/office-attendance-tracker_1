import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import type { AttendanceRecord, LeaveType } from "../backend";
import { useGetRecordsByDateRange } from "../hooks/useQueries";
import {
  DEFAULT_WEEKLY_TARGET,
  calculateDailyHours,
  calculateWeeklyTarget,
  checkCoreHoursViolation,
  formatDateKey,
  formatHoursDisplay,
  getDailyHoursIndicator,
  getLeaveTypeLabel,
  getMonthRange,
  getWeekRange,
  getWeekStart,
  isWeekendDate,
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

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <div
      className={`app-card p-4 flex items-center gap-3 ${accent ? "border-primary/30" : ""}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? "bg-primary/10" : "bg-secondary"}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p
          className={`text-xl font-display font-bold leading-tight ${accent ? "text-primary" : "text-foreground"}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Dashboard() {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);

  const { data: weekRecords = [], isLoading: weekLoading } =
    useGetRecordsByDateRange(weekRange.start, weekRange.end);
  const { data: monthRecords = [], isLoading: monthLoading } =
    useGetRecordsByDateRange(monthRange.start, monthRange.end);

  const todayRecord = weekRecords.find((r) => r.date === todayKey);

  // Week calculations
  const weekData = useMemo(() => {
    const calcRecords = weekRecords.map(toCalcRecord);
    const target = calculateWeeklyTarget(calcRecords);
    const completed = calcRecords.reduce(
      (sum, r) => sum + calculateDailyHours(r),
      0,
    );
    const remaining = Math.max(0, target - completed);
    const deficit = completed < target ? target - completed : 0;
    const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;

    // Determine if on track: compare completed vs expected by today
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1, Sun=7
    const workdaysPassed = Math.min(dayOfWeek, 5); // Mon-Fri
    const expectedByNow = (target / 5) * workdaysPassed;
    const onTrack = completed >= expectedByNow;

    // Weekend hours
    const weekendHours = calcRecords
      .filter((r) => isWeekendDate(r.date))
      .reduce((sum, r) => sum + calculateDailyHours(r), 0);

    return {
      target,
      completed,
      remaining,
      deficit,
      progress,
      onTrack,
      weekendHours,
    };
  }, [weekRecords, today]);

  // Build day-by-day week breakdown (Mon–Sun)
  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(today);
    return DAY_LABELS.map((label, i) => {
      const date = addDays(weekStart, i);
      const dateKey = formatDateKey(date);
      const isWeekend = i >= 5; // Sat=5, Sun=6
      const record = weekRecords.find((r) => r.date === dateKey);
      const calcRecord = record ? toCalcRecord(record) : null;
      const hours = calcRecord ? calculateDailyHours(calcRecord) : 0;
      const leaveType = calcRecord ? calcRecord.leaveType : "noLeave";
      const indicator = getDailyHoursIndicator(
        hours,
        leaveType,
        isWeekend,
        !!record,
      );
      const isToday = dateKey === todayKey;
      return {
        label,
        date,
        dateKey,
        isWeekend,
        record,
        hours,
        indicator,
        isToday,
      };
    });
  }, [weekRecords, today, todayKey]);

  // Month calculations
  const monthData = useMemo(() => {
    const calcRecords = monthRecords.map(toCalcRecord);
    const totalHours = calcRecords.reduce(
      (sum, r) => sum + calculateDailyHours(r),
      0,
    );
    const workingDays = calcRecords.filter(
      (r) =>
        !isWeekendDate(r.date) &&
        r.leaveType !== "fullDayLeave" &&
        (r.swipeIn || r.swipeOut),
    ).length;
    const avgDaily = workingDays > 0 ? totalHours / workingDays : 0;
    return { totalHours, workingDays, avgDaily };
  }, [monthRecords]);

  // Today data
  const todayData = useMemo(() => {
    if (!todayRecord) return null;
    const calc = toCalcRecord(todayRecord);
    const hours = calculateDailyHours(calc);
    const coreViolation = checkCoreHoursViolation(calc);
    const indicator = getDailyHoursIndicator(
      hours,
      calc.leaveType,
      isWeekendDate(todayKey),
      true,
    );
    return { hours, coreViolation, record: todayRecord, indicator };
  }, [todayRecord, todayKey]);

  return (
    <div className="page-enter px-4 py-5 space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(today, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="w-full rounded-xl h-11 bg-secondary p-1">
          <TabsTrigger
            value="today"
            className="flex-1 rounded-lg text-sm font-medium"
          >
            Today
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="flex-1 rounded-lg text-sm font-medium"
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            className="flex-1 rounded-lg text-sm font-medium"
          >
            Month
          </TabsTrigger>
        </TabsList>

        {/* TODAY TAB */}
        <TabsContent value="today" className="mt-4 space-y-3 animate-fade-in">
          {weekLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : todayData ? (
            <>
              {/* Hours card */}
              <div className="app-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Today's Hours
                  </p>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      todayData.coreViolation
                        ? "bg-destructive/10 text-destructive"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {todayData.coreViolation ? "Core Hours ⚠️" : "Core Hours ✓"}
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <p
                    className={`text-5xl font-display font-bold ${
                      todayData.indicator.color === "green"
                        ? "text-success"
                        : todayData.indicator.color === "red"
                          ? "text-destructive"
                          : "text-primary"
                    }`}
                  >
                    {todayData.indicator.hoursDisplay}
                  </p>
                  {todayData.indicator.diffDisplay && (
                    <span
                      className={`text-base font-semibold mb-1 ${
                        todayData.indicator.color === "green"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {todayData.indicator.diffDisplay}
                    </span>
                  )}
                </div>
              </div>

              {/* Swipe times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="app-card p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    Swipe In
                  </p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {todayData.record.swipeIn || "—"}
                  </p>
                </div>
                <div className="app-card p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    Swipe Out
                  </p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {todayData.record.swipeOut || "—"}
                  </p>
                </div>
              </div>

              {/* Leave & Breakfast */}
              <div className="app-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Leave Type</p>
                  <p className="text-sm font-semibold text-foreground">
                    {getLeaveTypeLabel(
                      leaveTypeToStr(
                        todayData.record.leaveType as unknown as LeaveType,
                      ),
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Breakfast</p>
                  <p className="text-sm font-semibold text-foreground">
                    {todayData.record.breakfastAtOffice ? "Yes (+30m)" : "No"}
                  </p>
                </div>
              </div>

              {todayData.coreViolation && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-medium text-destructive">
                    Core hours requirement not met (9:30 AM – 4:00 PM)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="app-card p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1">
                No entry for today
              </p>
              <p className="text-sm text-muted-foreground">
                Go to Today tab to log your attendance
              </p>
            </div>
          )}
        </TabsContent>

        {/* WEEK TAB */}
        <TabsContent value="week" className="mt-4 space-y-3 animate-fade-in">
          {weekLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Status indicator */}
              <div
                className={`app-card p-4 flex items-center gap-3 ${weekData.onTrack ? "border-success/30" : "border-destructive/30"}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${weekData.onTrack ? "bg-success/10" : "bg-destructive/10"}`}
                >
                  {weekData.onTrack ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-base font-display font-bold ${weekData.onTrack ? "text-success" : "text-destructive"}`}
                  >
                    {weekData.onTrack ? "On Track" : "Behind Schedule"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(weekRange.start), "MMM d")} –{" "}
                    {format(new Date(weekRange.end), "MMM d")}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="app-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Weekly Progress
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {Math.round(weekData.progress)}%
                  </span>
                </div>
                <Progress
                  value={weekData.progress}
                  className="h-3 rounded-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatHoursDisplay(weekData.completed)} done</span>
                  <span>{formatHoursDisplay(weekData.target)} target</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Completed"
                  value={formatHoursDisplay(weekData.completed)}
                  icon={<CheckCircle2 className="w-5 h-5 text-success" />}
                  accent
                />
                <StatCard
                  label="Remaining"
                  value={formatHoursDisplay(weekData.remaining)}
                  icon={<Clock className="w-5 h-5 text-primary" />}
                />
                <StatCard
                  label="Weekly Target"
                  value={formatHoursDisplay(weekData.target)}
                  sub="adjusted for leaves"
                  icon={<BarChart2 className="w-5 h-5 text-muted-foreground" />}
                />
                <StatCard
                  label="Deficit"
                  value={
                    weekData.deficit > 0
                      ? formatHoursDisplay(weekData.deficit)
                      : "—"
                  }
                  icon={
                    <TrendingDown className="w-5 h-5 text-muted-foreground" />
                  }
                />
              </div>

              {/* Day-by-day breakdown */}
              <div className="app-card p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Day-by-Day
                </p>
                {weekDays.map((day) => (
                  <div
                    key={day.dateKey}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                      day.isToday
                        ? "bg-primary/10 border border-primary/20"
                        : day.isWeekend
                          ? "bg-secondary/50"
                          : "hover:bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold w-8 ${
                          day.isToday
                            ? "text-primary"
                            : day.isWeekend
                              ? "text-muted-foreground"
                              : "text-foreground"
                        }`}
                      >
                        {day.label}
                      </span>
                      <span
                        className={`text-xs ${day.isToday ? "text-primary/70" : "text-muted-foreground"}`}
                      >
                        {format(day.date, "d")}
                      </span>
                      {day.isToday && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                      {day.isWeekend && (
                        <span className="text-xs text-muted-foreground/60">
                          Weekend
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {day.record ? (
                        <>
                          <span
                            className={`text-sm font-bold ${
                              day.indicator.color === "green"
                                ? "text-success"
                                : day.indicator.color === "red"
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {day.indicator.hoursDisplay}
                          </span>
                          {day.indicator.diffDisplay && (
                            <span
                              className={`text-xs font-semibold ${
                                day.indicator.color === "green"
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {day.indicator.diffDisplay}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Weekend compensation */}
              {weekData.deficit > 0 && (
                <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-xl p-3">
                  <Calendar className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-warning">
                      You have {formatHoursDisplay(weekData.deficit)} deficit.
                    </p>
                    {weekData.weekendHours > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Weekend hours logged:{" "}
                        {formatHoursDisplay(weekData.weekendHours)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* MONTH TAB */}
        <TabsContent value="month" className="mt-4 space-y-3 animate-fade-in">
          {monthLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="app-card p-5">
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  {format(today, "MMMM yyyy")} Total
                </p>
                <p className="text-5xl font-display font-bold text-primary">
                  {formatHoursDisplay(monthData.totalHours)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Working Days"
                  value={String(monthData.workingDays)}
                  sub="days logged"
                  icon={<Calendar className="w-5 h-5 text-primary" />}
                  accent
                />
                <StatCard
                  label="Avg Daily"
                  value={formatHoursDisplay(monthData.avgDaily)}
                  sub="per working day"
                  icon={<BarChart2 className="w-5 h-5 text-muted-foreground" />}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
