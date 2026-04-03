import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays, format } from "date-fns";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { AttendanceRecord, LeaveType } from "../backend";
import { useHolidays } from "../hooks/useHolidays";
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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type TabType = "today" | "week" | "month";

export default function Dashboard() {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);
  const [activeTab, setActiveTab] = useState<TabType>("today");

  const { data: weekRecords = [], isLoading: weekLoading } =
    useGetRecordsByDateRange(weekRange.start, weekRange.end);
  const { data: monthRecords = [], isLoading: monthLoading } =
    useGetRecordsByDateRange(monthRange.start, monthRange.end);

  const { isHoliday, getHoliday, holidays } = useHolidays();

  const todayRecord = weekRecords.find((r) => r.date === todayKey);

  const weekData = useMemo(() => {
    const calcRecords = weekRecords.map(toCalcRecord);
    const baseTarget = calculateWeeklyTarget(calcRecords);
    const holidayReduction =
      holidays.filter(
        (h) => h.date >= weekRange.start && h.date <= weekRange.end,
      ).length * 510;
    const target = Math.max(0, baseTarget - holidayReduction);
    const completed = calcRecords.reduce(
      (sum, r) => sum + calculateDailyHours(r),
      0,
    );
    const remaining = Math.max(0, target - completed);
    const deficit = completed < target ? target - completed : 0;
    const surplus = completed > target ? completed - target : 0;
    const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const workdaysPassed = Math.min(dayOfWeek, 5);
    const expectedByNow = (target / 5) * workdaysPassed;
    const onTrack = completed >= expectedByNow;
    const weekendHours = calcRecords
      .filter((r) => isWeekendDate(r.date))
      .reduce((sum, r) => sum + calculateDailyHours(r), 0);
    return {
      target,
      completed,
      remaining,
      deficit,
      surplus,
      progress,
      onTrack,
      weekendHours,
    };
  }, [weekRecords, today, holidays, weekRange.start, weekRange.end]);

  const weekDays = useMemo(() => {
    const weekStart = getWeekStart(today);
    return DAY_LABELS.map((label, i) => {
      const date = addDays(weekStart, i);
      const dateKey = formatDateKey(date);
      const isWeekend = i >= 5;
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
      const isHolidayDay = isHoliday(dateKey);
      const holidayName = getHoliday(dateKey)?.name;
      return {
        label,
        date,
        dateKey,
        isWeekend,
        record,
        hours,
        indicator,
        isToday,
        isHolidayDay,
        holidayName,
      };
    });
  }, [weekRecords, today, todayKey, isHoliday, getHoliday]);

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

  const TABS: { key: TabType; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ];

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-4">
      {/* Page header */}
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
          Dashboard
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          {format(today, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* iOS Segmented Control */}
      <div className="ios-segmented">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className="ios-segment"
            data-active={activeTab === tab.key ? "true" : "false"}
            onClick={() => setActiveTab(tab.key)}
            data-ocid={`dashboard.${tab.key}.tab`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === "today" && (
        <div className="space-y-4 animate-fade-in">
          {weekLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : todayData ? (
            <>
              {/* Hours card */}
              <div>
                <p className="ios-section-header">Today&apos;s Hours</p>
                <div className="ios-card overflow-hidden">
                  <div className="px-4 py-4">
                    <div className="flex items-end justify-between">
                      <span
                        className="ios-number"
                        style={{
                          fontSize: 48,
                          lineHeight: 1,
                          color:
                            todayData.indicator.color === "green"
                              ? "oklch(var(--success))"
                              : todayData.indicator.color === "red"
                                ? "oklch(var(--destructive))"
                                : "oklch(var(--primary))",
                        }}
                      >
                        {todayData.indicator.hoursDisplay}
                      </span>
                      {todayData.indicator.diffDisplay && (
                        <span
                          style={{
                            fontSize: 17,
                            fontWeight: 600,
                            paddingBottom: 4,
                            color:
                              todayData.indicator.color === "green"
                                ? "oklch(var(--success))"
                                : "oklch(var(--destructive))",
                          }}
                        >
                          {todayData.indicator.diffDisplay}
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

                  {/* Swipe times */}
                  <div className="flex">
                    <div
                      className="flex-1 px-4 py-3 border-r"
                      style={{
                        borderColor: "oklch(var(--border) / 0.4)",
                        borderWidth: "0 0.5px 0 0",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          color: "oklch(var(--muted-foreground))",
                          marginBottom: 2,
                        }}
                      >
                        Swipe In
                      </p>
                      <p
                        className="ios-number"
                        style={{
                          fontSize: 20,
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        {todayData.record.swipeIn || "\u2014"}
                      </p>
                    </div>
                    <div className="flex-1 px-4 py-3">
                      <p
                        style={{
                          fontSize: 12,
                          color: "oklch(var(--muted-foreground))",
                          marginBottom: 2,
                        }}
                      >
                        Swipe Out
                      </p>
                      <p
                        className="ios-number"
                        style={{
                          fontSize: 20,
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        {todayData.record.swipeOut || "\u2014"}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      height: "0.5px",
                      backgroundColor: "oklch(var(--border) / 0.4)",
                      marginLeft: 16,
                    }}
                  />

                  {/* Leave & Breakfast */}
                  <div className="ios-row justify-between">
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Leave Type
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      {getLeaveTypeLabel(
                        leaveTypeToStr(
                          todayData.record.leaveType as unknown as LeaveType,
                        ),
                      )}
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
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Breakfast
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      {todayData.record.breakfastAtOffice ? "Yes (+30m)" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {todayData.coreViolation && (
                <div
                  className="flex items-start gap-2 rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: "oklch(var(--destructive) / 0.08)",
                  }}
                >
                  <AlertTriangle
                    style={{
                      width: 16,
                      height: 16,
                      color: "oklch(var(--destructive))",
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  />
                  <p
                    style={{ fontSize: 13, color: "oklch(var(--destructive))" }}
                  >
                    Core hours requirement not met (9:30 AM \u2013 4:00 PM)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="ios-card flex flex-col items-center text-center py-10">
              <div
                className="flex items-center justify-center mb-4"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: "oklch(var(--secondary))",
                }}
              >
                <Clock
                  style={{
                    width: 28,
                    height: 28,
                    color: "oklch(var(--muted-foreground))",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "oklch(var(--foreground))",
                }}
              >
                No entry for today
              </p>
              <p
                style={{
                  fontSize: 15,
                  color: "oklch(var(--muted-foreground))",
                  marginTop: 4,
                }}
              >
                Go to Today tab to log attendance
              </p>
            </div>
          )}
        </div>
      )}

      {/* WEEK TAB */}
      {activeTab === "week" && (
        <div className="space-y-4 animate-fade-in">
          {weekLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Status + Progress */}
              <div>
                <p className="ios-section-header">Progress</p>
                <div className="ios-card overflow-hidden">
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {weekData.onTrack ? (
                          <TrendingUp
                            style={{
                              width: 18,
                              height: 18,
                              color: "oklch(var(--success))",
                            }}
                          />
                        ) : (
                          <TrendingDown
                            style={{
                              width: 18,
                              height: 18,
                              color: "oklch(var(--destructive))",
                            }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: 17,
                            fontWeight: 600,
                            color: weekData.onTrack
                              ? "oklch(var(--success))"
                              : "oklch(var(--destructive))",
                          }}
                        >
                          {weekData.onTrack ? "On Track" : "Behind Schedule"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        {Math.round(weekData.progress)}%
                      </span>
                    </div>
                    <Progress
                      value={weekData.progress}
                      className="h-1.5 rounded-full"
                    />
                    <div className="flex justify-between mt-2">
                      <span
                        style={{
                          fontSize: 13,
                          color: "oklch(var(--muted-foreground))",
                        }}
                      >
                        {formatHoursDisplay(weekData.completed)} done
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "oklch(var(--muted-foreground))",
                        }}
                      >
                        {formatHoursDisplay(weekData.target)} target
                      </span>
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
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Completed
                    </span>
                    <span
                      className="ios-number"
                      style={{ fontSize: 17, color: "oklch(var(--success))" }}
                    >
                      {formatHoursDisplay(weekData.completed)}
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
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Remaining
                    </span>
                    <span
                      className="ios-number"
                      style={{ fontSize: 17, color: "oklch(var(--primary))" }}
                    >
                      {formatHoursDisplay(weekData.remaining)}
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
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Deficit/Surplus
                    </span>
                    <span
                      className="ios-number"
                      style={{
                        fontSize: 17,
                        color:
                          weekData.deficit > 0
                            ? "oklch(var(--destructive))"
                            : weekData.surplus > 0
                              ? "oklch(0.55 0.18 145)"
                              : "oklch(var(--muted-foreground))",
                      }}
                    >
                      {weekData.deficit > 0
                        ? formatHoursDisplay(weekData.deficit)
                        : weekData.surplus > 0
                          ? `+${formatHoursDisplay(weekData.surplus)}`
                          : "\u2014"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Day-by-day */}
              <div>
                <p className="ios-section-header">Day by Day</p>
                <div className="ios-card overflow-hidden">
                  {weekDays.map((day, idx) => (
                    <div key={day.dateKey}>
                      {idx > 0 && (
                        <div
                          style={{
                            height: "0.5px",
                            backgroundColor: "oklch(var(--border) / 0.4)",
                            marginLeft: 16,
                          }}
                        />
                      )}
                      <div
                        className="ios-row justify-between"
                        style={{
                          backgroundColor: day.isToday
                            ? "oklch(var(--primary) / 0.06)"
                            : "transparent",
                        }}
                        data-ocid={`dashboard.day.item.${idx + 1}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              fontSize: 17,
                              fontWeight: day.isToday ? 600 : 400,
                              color: day.isToday
                                ? "oklch(var(--primary))"
                                : day.isWeekend
                                  ? "oklch(var(--muted-foreground))"
                                  : "oklch(var(--foreground))",
                              width: 36,
                            }}
                          >
                            {day.label}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              color: "oklch(var(--muted-foreground))",
                            }}
                          >
                            {format(day.date, "d")}
                          </span>
                          {day.isToday && (
                            <span
                              className="px-1.5 py-0.5 rounded-full"
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: "oklch(var(--primary))",
                                color: "#fff",
                              }}
                            >
                              Today
                            </span>
                          )}
                          {day.isHolidayDay && (
                            <span
                              className="px-1.5 py-0.5 rounded-full"
                              style={{
                                fontSize: 11,
                                backgroundColor: "oklch(var(--primary) / 0.1)",
                                color: "oklch(var(--primary))",
                              }}
                            >
                              Holiday
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {day.record ? (
                            <>
                              <span
                                className="ios-number"
                                style={{
                                  fontSize: 15,
                                  color:
                                    day.indicator.color === "green"
                                      ? "oklch(var(--success))"
                                      : day.indicator.color === "red"
                                        ? "oklch(var(--destructive))"
                                        : "oklch(var(--muted-foreground))",
                                }}
                              >
                                {day.indicator.hoursDisplay}
                              </span>
                              {day.indicator.diffDisplay && (
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color:
                                      day.indicator.color === "green"
                                        ? "oklch(var(--success))"
                                        : "oklch(var(--destructive))",
                                  }}
                                >
                                  {day.indicator.diffDisplay}
                                </span>
                              )}
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: 17,
                                color: "oklch(var(--muted-foreground) / 0.4)",
                              }}
                            >
                              \u2014
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {weekData.deficit > 0 && (
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: "oklch(var(--warning) / 0.08)" }}
                >
                  <Calendar
                    style={{
                      width: 16,
                      height: 16,
                      color: "oklch(var(--warning))",
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  />
                  <p style={{ fontSize: 13, color: "oklch(var(--warning))" }}>
                    You have {formatHoursDisplay(weekData.deficit)} deficit this
                    week.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MONTH TAB */}
      {activeTab === "month" && (
        <div className="space-y-4 animate-fade-in">
          {monthLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : (
            <>
              <div>
                <p className="ios-section-header">
                  {format(today, "MMMM yyyy")}
                </p>
                <div className="ios-card overflow-hidden">
                  <div className="px-4 py-5">
                    <p
                      style={{
                        fontSize: 13,
                        color: "oklch(var(--muted-foreground))",
                        marginBottom: 4,
                      }}
                    >
                      Total Hours
                    </p>
                    <span
                      className="ios-number"
                      style={{
                        fontSize: 48,
                        lineHeight: 1,
                        color: "oklch(var(--primary))",
                      }}
                    >
                      {formatHoursDisplay(monthData.totalHours)}
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
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Working Days
                    </span>
                    <span
                      className="ios-number"
                      style={{
                        fontSize: 17,
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      {monthData.workingDays} days
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
                    <span
                      style={{
                        fontSize: 15,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      Avg Daily
                    </span>
                    <span
                      className="ios-number"
                      style={{
                        fontSize: 17,
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      {formatHoursDisplay(monthData.avgDaily)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
