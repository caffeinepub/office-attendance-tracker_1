import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, List, Plus, Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface AppleCalendarOverlayProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const IOS_RED = "#FF3B30";
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function buildWeeks(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let cur = start;
  while (cur <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cur);
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function getDatesWithEntries(): Set<string> {
  try {
    const raw =
      localStorage.getItem("attendance") ||
      localStorage.getItem("attendanceData");
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    const keys = Array.isArray(data)
      ? data
          .map((d: { date?: string }) => d.date)
          .filter((x): x is string => Boolean(x))
      : Object.keys(data);
    return new Set(keys);
  } catch {
    return new Set();
  }
}

function getDatesWithLeaves(): Map<string, string> {
  try {
    const raw =
      localStorage.getItem("attendance") ||
      localStorage.getItem("attendanceData");
    if (!raw) return new Map();
    const data = JSON.parse(raw);
    const result = new Map<string, string>();
    const leaveTypes = [
      "fullDayLeave",
      "halfDayFirstHalf",
      "halfDaySecondHalf",
    ];
    if (Array.isArray(data)) {
      for (const entry of data) {
        if (
          entry.date &&
          entry.leaveType &&
          leaveTypes.includes(entry.leaveType)
        ) {
          result.set(entry.date, entry.leaveType);
        }
      }
    } else {
      for (const [key, val] of Object.entries(data)) {
        const entry = val as any;
        if (entry?.leaveType && leaveTypes.includes(entry.leaveType)) {
          result.set(key, entry.leaveType);
        }
      }
    }
    return result;
  } catch {
    return new Map();
  }
}

function getDatesHolidays(): Set<string> {
  try {
    const raw = localStorage.getItem("swipetrack-holidays");
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return new Set(data.map((h: any) => h.date).filter(Boolean));
    }
    return new Set(Object.keys(data));
  } catch {
    return new Set();
  }
}

function getTodayMonthKey(): string {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM");
}

function getTodayYear(): number {
  return new Date().getFullYear();
}

function buildAllMonths(): Date[] {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  const result: Date[] = [];
  for (let i = -6; i <= 12; i++) {
    result.push(addMonths(base, i));
  }
  return result;
}

type BadgeInfo = { label: string; bg: string; color: string } | null;

function getBadge(
  dateStr: string,
  holidayDates: Set<string>,
  leaveDates: Map<string, string>,
): BadgeInfo {
  if (holidayDates.has(dateStr)) {
    return { label: "Holiday", bg: "rgba(255,59,48,0.15)", color: "#FF3B30" };
  }
  const leave = leaveDates.get(dateStr);
  if (leave === "fullDayLeave") {
    return {
      label: "Full Leave",
      bg: "rgba(255,149,0,0.15)",
      color: "#FF9500",
    };
  }
  if (leave === "halfDayFirstHalf") {
    return { label: "1st Half", bg: "rgba(0,122,255,0.15)", color: "#007AFF" };
  }
  if (leave === "halfDaySecondHalf") {
    return { label: "2nd Half", bg: "rgba(0,122,255,0.15)", color: "#007AFF" };
  }
  return null;
}

function MonthGrid({
  month,
  selectedDate,
  onSelectDate,
  datesWithEntries,
  leaveDates,
  holidayDates,
  isDark,
}: {
  month: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  datesWithEntries: Set<string>;
  leaveDates: Map<string, string>;
  holidayDates: Set<string>;
  isDark: boolean;
}) {
  const weeks = buildWeeks(month);
  const separatorColor = isDark
    ? "rgba(255,255,255,0.12)"
    : "rgba(60,60,67,0.18)";

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          textAlign: "center",
          fontSize: 20,
          fontWeight: 700,
          color: IOS_RED,
          padding: "10px 0 4px",
          fontFamily:
            "-apple-system, SF Pro Display, BlinkMacSystemFont, sans-serif",
        }}
      >
        {format(month, "MMMM")}
      </div>

      {weeks.map((week) => {
        const weekKey = format(week[0], "yyyy-MM-dd");
        return (
          <div key={weekKey}>
            <div style={{ height: "0.5px", backgroundColor: separatorColor }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                padding: "2px 8px",
              }}
            >
              {week.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, month);
                const selected = isSameDay(day, selectedDate);
                const todayDate = isToday(day);
                const hasEntry = datesWithEntries.has(dateStr) || todayDate;
                const dow = day.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const badge = inMonth
                  ? getBadge(dateStr, holidayDates, leaveDates)
                  : null;

                let textColor: string;
                if (!inMonth) {
                  textColor = isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(60,60,67,0.18)";
                } else if (selected || todayDate) {
                  textColor = "#fff";
                } else if (isWeekend) {
                  textColor = isDark
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(60,60,67,0.55)";
                } else {
                  textColor = isDark ? "#FFFFFF" : "#000000";
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => onSelectDate(day)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      padding: "4px 0",
                      background: "none",
                      border: "none",
                      cursor: inMonth ? "pointer" : "default",
                    }}
                    aria-label={format(day, "EEEE, MMMM d, yyyy")}
                    aria-pressed={selected}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        backgroundColor:
                          selected || todayDate ? IOS_RED : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: selected || todayDate ? 600 : 400,
                          color: textColor,
                          fontFamily:
                            "-apple-system, SF Pro Text, BlinkMacSystemFont, sans-serif",
                          lineHeight: 1,
                        }}
                      >
                        {inMonth ? format(day, "d") : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        backgroundColor:
                          hasEntry && inMonth && !selected
                            ? "rgba(120,120,128,0.6)"
                            : "transparent",
                        marginTop: 1,
                      }}
                    />
                    {badge && (
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 600,
                          padding: "1px 4px",
                          borderRadius: 4,
                          marginTop: 2,
                          maxWidth: 36,
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ height: "0.5px", backgroundColor: separatorColor }} />
    </div>
  );
}

export default function AppleCalendarOverlay({
  selectedDate,
  onSelectDate,
  onClose,
}: AppleCalendarOverlayProps) {
  const viewYear = getTodayYear();
  const todayMonthKey = getTodayMonthKey();
  const [visible, setVisible] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const datesWithEntries = getDatesWithEntries();
  const allMonths = buildAllMonths();

  const leaveDates = useMemo(() => getDatesWithLeaves(), []);
  const holidayDates = useMemo(() => getDatesHolidays(), []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const el = monthRefs.current[todayMonthKey];
    if (el && scrollRef.current) {
      const top = el.offsetTop - 96;
      scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [visible, todayMonthKey]);

  const handleSelectDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const badge = getBadge(dateStr, holidayDates, leaveDates);
      if (badge) {
        const confirmed = window.confirm(
          `Go to ${format(date, "EEEE, MMM d")}?`,
        );
        if (!confirmed) return;
        onSelectDate(date);
        setTimeout(onClose, 80);
      } else {
        onSelectDate(date);
        setTimeout(onClose, 80);
      }
    },
    [onSelectDate, onClose, holidayDates, leaveDates],
  );

  const handleTodayPress = useCallback(() => {
    const el = monthRefs.current[todayMonthKey];
    if (el && scrollRef.current) {
      const top = el.offsetTop - 96;
      scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    onSelectDate(new Date());
  }, [onSelectDate, todayMonthKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const bgMain = isDark ? "#000000" : "#F2F2F7";
  const bgHeader = isDark ? "rgba(28,28,30,0.95)" : "rgba(242,242,247,0.95)";
  const separatorColor = isDark
    ? "rgba(255,255,255,0.12)"
    : "rgba(60,60,67,0.18)";
  const yearColor = isDark ? "#FFFFFF" : "#000000";
  const weekdayColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(60,60,67,0.6)";

  return (
    <dialog
      open
      aria-label="Calendar"
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: bgMain,
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "-apple-system, SF Pro Text, BlinkMacSystemFont, sans-serif",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.22s ease-out",
        width: "100%",
        height: "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        margin: 0,
        padding: 0,
        border: "none",
        overflow: "hidden",
      }}
    >
      {/* ── Fixed Header ──────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: bgHeader,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: `0.5px solid ${separatorColor}`,
        }}
      >
        {/* Year + icons row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                padding: "4px 6px 4px 0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Close calendar"
              data-ocid="calendar.close_button"
            >
              <ChevronLeft size={22} color={IOS_RED} strokeWidth={2.5} />
            </button>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: yearColor,
                letterSpacing: "-0.3px",
              }}
            >
              {viewYear}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 4,
                cursor: "pointer",
              }}
              aria-label="List view"
            >
              <List size={22} color={IOS_RED} strokeWidth={2} />
            </button>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 4,
                cursor: "pointer",
              }}
              aria-label="Search"
            >
              <Search size={22} color={IOS_RED} strokeWidth={2} />
            </button>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                padding: 4,
                cursor: "pointer",
              }}
              aria-label="Add event"
            >
              <Plus size={22} color={IOS_RED} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            padding: "4px 8px 6px",
          }}
        >
          {WEEKDAY_LABELS.map((label, i) => {
            const key = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][i];
            return (
              <div
                key={key}
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: weekdayColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Month List ──────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 64,
          backgroundColor: bgMain,
        }}
      >
        {allMonths.map((month) => {
          const key = format(month, "yyyy-MM");
          return (
            <div
              key={key}
              ref={(el) => {
                monthRefs.current[key] = el;
              }}
            >
              <MonthGrid
                month={month}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                datesWithEntries={datesWithEntries}
                leaveDates={leaveDates}
                holidayDates={holidayDates}
                isDark={isDark}
              />
            </div>
          );
        })}
      </div>

      {/* ── Fixed Bottom Tab Bar ────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          backgroundColor: bgHeader,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: `0.5px solid ${separatorColor}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            height: 49,
          }}
        >
          <button
            type="button"
            onClick={handleTodayPress}
            data-ocid="calendar.today_button"
            style={{
              background: "none",
              border: "none",
              fontSize: 17,
              color: IOS_RED,
              cursor: "pointer",
              padding: "8px 20px",
              fontFamily:
                "-apple-system, SF Pro Text, BlinkMacSystemFont, sans-serif",
            }}
          >
            Today
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              fontSize: 17,
              color: IOS_RED,
              cursor: "pointer",
              padding: "8px 20px",
              fontFamily:
                "-apple-system, SF Pro Text, BlinkMacSystemFont, sans-serif",
            }}
          >
            Calendars
          </button>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              fontSize: 17,
              color: IOS_RED,
              cursor: "pointer",
              padding: "8px 20px",
              fontFamily:
                "-apple-system, SF Pro Text, BlinkMacSystemFont, sans-serif",
            }}
          >
            Inbox
          </button>
        </div>
      </div>
    </dialog>
  );
}
