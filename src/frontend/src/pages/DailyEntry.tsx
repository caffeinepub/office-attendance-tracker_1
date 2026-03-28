import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarIcon,
  ChevronRight,
  Clock,
  Coffee,
  Gift,
  Loader2,
  Lock,
  Save,
  Star,
  Sun,
  Sunrise,
  Target,
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { type AttendanceRecord, LeaveType } from "../backend";
import AppleCalendarOverlay from "../components/AppleCalendarOverlay";
import SmartSwipeOutPrediction from "../components/SmartSwipeOutPrediction";
import { useActor } from "../hooks/useActor";
import { useCompOff } from "../hooks/useCompOff";
import { useHolidays } from "../hooks/useHolidays";
import { useOfflineSync } from "../hooks/useOfflineSync";
import {
  useGetAllRecords,
  useGetRecord,
  useGetRecordsByDateRange,
  useSaveRecord,
} from "../hooks/useQueries";
import {
  addCompOffDate,
  getCompOffSubType,
  isCompOffDate,
  removeCompOffDate,
  removeCompOffUsage,
  setCompOffSubType,
  setCompOffUsage,
} from "../utils/compOffLeaves";
import {
  calculateDailyHours,
  calculateWeeklyTarget,
  checkCoreHoursViolation,
  formatDateKey,
  formatHoursDisplay,
  formatMinutes,
  getCurrentTimeString,
  getDailyHoursIndicator,
  getWeekRange,
  isWeekendDate,
  parseTime,
} from "../utils/hoursCalculation";

type WeekendMode = "halfDay" | "fullDay" | "deficit";

const LEAVE_OPTIONS: { value: string; label: string; group?: string }[] = [
  { value: LeaveType.noLeave, label: "No Leave" },
  { value: LeaveType.halfDayFirstHalf, label: "Half-Day \u2013 First Half" },
  { value: LeaveType.halfDaySecondHalf, label: "Half-Day \u2013 Second Half" },
  { value: LeaveType.fullDayLeave, label: "Full-Day Leave" },
  {
    value: "compOffFull",
    label: "Comp Off \u2013 Full Day",
    group: "Comp Off",
  },
  {
    value: "compOffFirstHalf",
    label: "Comp Off \u2013 First Half",
    group: "Comp Off",
  },
  {
    value: "compOffSecondHalf",
    label: "Comp Off \u2013 Second Half",
    group: "Comp Off",
  },
];

function leaveTypeToStr(
  lt: string,
):
  | "noLeave"
  | "halfDayFirstHalf"
  | "halfDaySecondHalf"
  | "fullDayLeave"
  | "compOff"
  | "compOffFull"
  | "compOffFirstHalf"
  | "compOffSecondHalf" {
  if (
    lt === "compOffFull" ||
    lt === "compOffFirstHalf" ||
    lt === "compOffSecondHalf"
  ) {
    return lt as "compOffFull" | "compOffFirstHalf" | "compOffSecondHalf";
  }
  return lt as
    | "noLeave"
    | "halfDayFirstHalf"
    | "halfDaySecondHalf"
    | "fullDayLeave"
    | "compOff";
}

const ONE_PM_MINS = 13 * 60;
const HALF_PAST_12_MINS = 12 * 60 + 30;
const WORK_WINDOW_END_MINS = 19 * 60;

const WEEKEND_HALF_DAY_MINS = 4 * 60 + 30; // 270
const WEEKEND_FULL_DAY_MINS = 8 * 60 + 30; // 510

function calcAutoSwipeOut(
  swipeInStr: string,
  lt: string,
  hasBreakfast: boolean,
): string {
  if (!swipeInStr) return "";
  const swipeInMins = parseTime(swipeInStr);
  if (lt === LeaveType.noLeave || lt === "noLeave") {
    const rawMinutes = 8 * 60 + 30 + 30 + (hasBreakfast ? 30 : 0);
    const predictedOut = swipeInMins + rawMinutes;
    return formatMinutes(Math.min(predictedOut, WORK_WINDOW_END_MINS));
  }
  if (lt === LeaveType.halfDaySecondHalf || lt === "compOffSecondHalf") {
    return formatMinutes(HALF_PAST_12_MINS);
  }
  return "";
}

function calcWeekendSwipeOut(
  swipeInStr: string,
  mode: WeekendMode,
  deficitMins: number,
): string {
  if (!swipeInStr) return "";
  const swipeInMins = parseTime(swipeInStr);
  let durationMins: number;
  if (mode === "halfDay") {
    durationMins = WEEKEND_HALF_DAY_MINS;
  } else if (mode === "fullDay") {
    durationMins = WEEKEND_FULL_DAY_MINS;
  } else {
    durationMins = Math.max(deficitMins, 30);
  }
  const predictedOut = swipeInMins + durationMins;
  return formatMinutes(Math.min(predictedOut, WORK_WINDOW_END_MINS));
}

export default function DailyEntry() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [swipeIn, setSwipeIn] = useState("");
  const [swipeOut, setSwipeOut] = useState("");
  const [breakfast, setBreakfast] = useState(false);
  const [leaveType, setLeaveType] = useState<string>(LeaveType.noLeave);
  const [swipeOutManual, setSwipeOutManual] = useState(false);
  const [holidayWorking, setHolidayWorking] = useState(false);
  const [weekendMode, setWeekendMode] = useState<WeekendMode | null>(null);
  const [weekendModalOpen, setWeekendModalOpen] = useState(false);

  const dateKey = formatDateKey(selectedDate);
  const { data: existingRecord, isLoading: recordLoading } =
    useGetRecord(dateKey);
  const saveRecord = useSaveRecord();
  const { actor } = useActor();
  const { addToQueue, syncPending } = useOfflineSync(actor);
  const { isHoliday, getHoliday, holidays } = useHolidays();
  const todayIsHoliday = isHoliday(dateKey);
  const holidayInfo = getHoliday(dateKey);

  const { data: allRecords = [] } = useGetAllRecords();
  const { balance: compOffBalance } = useCompOff(allRecords, holidays);

  // Reset weekendMode when date changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-run on dateKey change
  useEffect(() => {
    setWeekendMode(null);
  }, [dateKey]);

  useEffect(() => {
    if (existingRecord) {
      setSwipeIn(existingRecord.swipeIn || "");
      setSwipeOut(existingRecord.swipeOut || "");
      setBreakfast(existingRecord.breakfastAtOffice);
      let loadedLeaveType: string =
        existingRecord.leaveType as unknown as string;
      if (isCompOffDate(existingRecord.date)) {
        const sub = getCompOffSubType(existingRecord.date);
        if (sub === "firstHalf") loadedLeaveType = "compOffFirstHalf";
        else if (sub === "secondHalf") loadedLeaveType = "compOffSecondHalf";
        else loadedLeaveType = "compOffFull";
      }
      setLeaveType(loadedLeaveType);
      setSwipeOutManual(true);
      setHolidayWorking(existingRecord.holidayWorking ?? false);
    } else if (!recordLoading) {
      setSwipeIn("");
      setSwipeOut("");
      setBreakfast(false);
      setLeaveType(LeaveType.noLeave);
      setSwipeOutManual(false);
      setHolidayWorking(false);
    }
  }, [existingRecord, recordLoading]);

  const weekRange = getWeekRange(selectedDate);
  const { data: weekRecords = [] } = useGetRecordsByDateRange(
    weekRange.start,
    weekRange.end,
  );

  const completedMinutesThisWeek = useMemo(() => {
    return weekRecords
      .filter((r) => r.date !== dateKey)
      .reduce(
        (sum, r) =>
          sum +
          calculateDailyHours({
            date: r.date,
            swipeIn: r.swipeIn,
            swipeOut: r.swipeOut,
            breakfastAtOffice: r.breakfastAtOffice,
            leaveType: leaveTypeToStr(r.leaveType as unknown as LeaveType),
          }),
        0,
      );
  }, [weekRecords, dateKey]);

  const weeklyTarget = useMemo(() => {
    const allLeaves = weekRecords.map((r) => ({
      date: r.date,
      swipeIn: r.swipeIn,
      swipeOut: r.swipeOut,
      breakfastAtOffice: r.breakfastAtOffice,
      leaveType: leaveTypeToStr(r.leaveType as unknown as LeaveType),
    }));
    const todayRecord = {
      date: dateKey,
      swipeIn,
      swipeOut,
      breakfastAtOffice: breakfast,
      leaveType: leaveTypeToStr(leaveType),
    };
    return calculateWeeklyTarget([
      ...allLeaves.filter((r) => r.date !== dateKey),
      todayRecord,
    ]);
  }, [weekRecords, dateKey, leaveType, swipeIn, swipeOut, breakfast]);

  const weeklyDeficitMins = useMemo(() => {
    return Math.max(weeklyTarget - completedMinutesThisWeek, 0);
  }, [weeklyTarget, completedMinutesThisWeek]);

  const remainingWorkdays = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0) return 1; // Sunday is last day of week, use 1 to avoid div by zero
    return 7 - dayOfWeek; // Mon=6, Tue=5, Wed=4, Thu=3, Fri=2, Sat=1
  }, [selectedDate]);

  const isWeekendDay = isWeekendDate(dateKey);
  const isSimpleWorkMode =
    (todayIsHoliday && holidayWorking) ||
    (isWeekendDay && weekendMode !== null);

  const currentRecord = {
    date: dateKey,
    swipeIn,
    swipeOut,
    breakfastAtOffice: isSimpleWorkMode ? false : breakfast,
    leaveType: leaveTypeToStr(leaveType),
  };
  const dailyHours = calculateDailyHours(currentRecord);
  const coreViolation = isSimpleWorkMode
    ? null
    : checkCoreHoursViolation(currentRecord);
  const isFullDayLeave =
    leaveType === LeaveType.fullDayLeave ||
    leaveType === LeaveType.compOff ||
    leaveType === "compOffFull";

  const simpleWorkHours = useMemo(() => {
    if (!isSimpleWorkMode || !swipeIn || !swipeOut) return null;
    const raw = parseTime(swipeOut) - parseTime(swipeIn);
    return Math.max(raw, 0);
  }, [isSimpleWorkMode, swipeIn, swipeOut]);

  const holidayWorkingHours = useMemo(() => {
    if (isSimpleWorkMode) return simpleWorkHours;
    if (!todayIsHoliday || !holidayWorking || (!swipeIn && !swipeOut))
      return null;
    return calculateDailyHours({
      date: dateKey,
      swipeIn,
      swipeOut,
      breakfastAtOffice: breakfast,
      leaveType: "noLeave",
    });
  }, [
    isSimpleWorkMode,
    simpleWorkHours,
    todayIsHoliday,
    holidayWorking,
    swipeIn,
    swipeOut,
    breakfast,
    dateKey,
  ]);

  const compOffEarned = useMemo(() => {
    if (holidayWorkingHours === null) return null;
    if (holidayWorkingHours >= 480) return 1;
    if (holidayWorkingHours >= 240) return 0.5;
    return 0;
  }, [holidayWorkingHours]);

  const compOffNote = useMemo(() => {
    if (holidayWorkingHours === null) return null;
    if (holidayWorkingHours >= 480) return null;
    if (holidayWorkingHours >= 240) {
      const needed = 480 - holidayWorkingHours;
      const h = Math.floor(needed / 60);
      const m = needed % 60;
      const display = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      return `Work ${display} more to earn a full day comp off`;
    }
    if (holidayWorkingHours > 0) {
      const needed = 240 - holidayWorkingHours;
      const h = Math.floor(needed / 60);
      const m = needed % 60;
      const display = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
      return `Work ${display} more to start earning comp off (min 4h for 0.5 day)`;
    }
    return "Work at least 4h to earn 0.5 day comp off, or 8h for 1 full day";
  }, [holidayWorkingHours]);

  const showFirstHalfWarning = useMemo(() => {
    if (
      leaveType !== LeaveType.halfDayFirstHalf &&
      leaveType !== "compOffFirstHalf"
    )
      return false;
    if (!swipeIn) return false;
    return parseTime(swipeIn) > ONE_PM_MINS;
  }, [leaveType, swipeIn]);

  const showSecondHalfError = useMemo(() => {
    if (
      leaveType !== LeaveType.halfDaySecondHalf &&
      leaveType !== "compOffSecondHalf"
    )
      return false;
    if (!swipeOut) return false;
    return parseTime(swipeOut) < HALF_PAST_12_MINS;
  }, [leaveType, swipeOut]);

  const showBreakfastCompensationNote = useMemo(() => {
    return (
      (leaveType === LeaveType.halfDaySecondHalf ||
        leaveType === "compOffSecondHalf") &&
      breakfast
    );
  }, [leaveType, breakfast]);

  const hoursIndicator = useMemo(() => {
    const hasSwipes = !!(swipeIn || swipeOut);
    return getDailyHoursIndicator(
      dailyHours,
      leaveTypeToStr(leaveType),
      isWeekendDay,
      hasSwipes,
    );
  }, [dailyHours, leaveType, isWeekendDay, swipeIn, swipeOut]);

  const swipeFieldsDisabled = todayIsHoliday && !holidayWorking;

  // Auto swipe-out calculation (non-weekend)
  useEffect(() => {
    if (swipeOutManual) return;
    if (!swipeIn) return;
    if (isWeekendDay && weekendMode) {
      const auto = calcWeekendSwipeOut(swipeIn, weekendMode, weeklyDeficitMins);
      if (auto) setSwipeOut(auto);
      return;
    }
    if (!isWeekendDay) {
      const auto = calcAutoSwipeOut(
        swipeIn,
        leaveType,
        isSimpleWorkMode ? false : breakfast,
      );
      if (auto) setSwipeOut(auto);
    }
  }, [
    swipeIn,
    leaveType,
    breakfast,
    swipeOutManual,
    isWeekendDay,
    weekendMode,
    weeklyDeficitMins,
    isSimpleWorkMode,
  ]);

  useEffect(() => {
    if (
      leaveType === LeaveType.halfDayFirstHalf ||
      leaveType === "compOffFirstHalf"
    ) {
      setSwipeIn("13:00");
      setSwipeOutManual(false);
    }
  }, [leaveType]);

  const handleSwipeOutChange = (val: string) => {
    setSwipeOut(val);
    setSwipeOutManual(true);
  };

  const handleSwipeInFocus = () => {
    // Show weekend modal if needed
    if (isWeekendDay && !todayIsHoliday && weekendMode === null) {
      setWeekendModalOpen(true);
    }
  };

  const handleSwipeInChange = (val: string) => {
    setSwipeIn(val);
    setSwipeOutManual(false);
  };
  const handleLeaveTypeChange = (v: string) => {
    setLeaveType(v as LeaveType);
    setSwipeOutManual(false);
  };
  const handleBreakfastChange = (val: boolean) => {
    setBreakfast(val);
    setSwipeOutManual(false);
  };

  const handleSelectWeekendMode = (mode: WeekendMode) => {
    setWeekendMode(mode);
    setWeekendModalOpen(false);
    // If swipe-in already entered, auto-fill swipe-out
    if (swipeIn) {
      const auto = calcWeekendSwipeOut(swipeIn, mode, weeklyDeficitMins);
      if (auto) {
        setSwipeOut(auto);
        setSwipeOutManual(false);
      }
    }
  };

  const weekendModeBadgeLabel =
    weekendMode === "halfDay"
      ? "Half Day"
      : weekendMode === "fullDay"
        ? "Full Day"
        : weekendMode === "deficit"
          ? "Completing Deficit"
          : null;

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const handleSave = async () => {
    // comp off types are frontend-only; map to backend leave types
    let backendLeaveType: LeaveType = leaveType as unknown as LeaveType;
    if (leaveType === LeaveType.compOff || leaveType === "compOffFull") {
      backendLeaveType = LeaveType.fullDayLeave;
    } else if (leaveType === "compOffFirstHalf") {
      backendLeaveType = LeaveType.halfDayFirstHalf;
    } else if (leaveType === "compOffSecondHalf") {
      backendLeaveType = LeaveType.halfDaySecondHalf;
    }
    const record: AttendanceRecord = {
      date: dateKey,
      swipeIn: swipeFieldsDisabled ? "" : swipeIn,
      swipeOut: swipeFieldsDisabled ? "" : swipeOut,
      breakfastAtOffice:
        swipeFieldsDisabled || isSimpleWorkMode ? false : breakfast,
      leaveType: backendLeaveType as unknown as LeaveType,
      holidayWorking: todayIsHoliday ? holidayWorking : false,
    };
    // Track comp off dates and sub-types in localStorage
    const isCompOffType =
      leaveType === LeaveType.compOff ||
      leaveType === "compOffFull" ||
      leaveType === "compOffFirstHalf" ||
      leaveType === "compOffSecondHalf";
    if (isCompOffType) {
      addCompOffDate(dateKey);
      if (leaveType === "compOffFirstHalf") {
        setCompOffSubType(dateKey, "firstHalf");
        setCompOffUsage(dateKey, 0.5);
      } else if (leaveType === "compOffSecondHalf") {
        setCompOffSubType(dateKey, "secondHalf");
        setCompOffUsage(dateKey, 0.5);
      } else {
        setCompOffSubType(dateKey, "full");
        setCompOffUsage(dateKey, 1.0);
      }
    } else {
      removeCompOffDate(dateKey);
      removeCompOffUsage(dateKey);
    }
    try {
      await saveRecord.mutateAsync(record);
      toast.success("Record saved successfully!", {
        description: `${format(selectedDate, "EEEE, MMM d")} \u2014 ${
          todayIsHoliday && !holidayWorking
            ? "Holiday"
            : formatHoursDisplay(dailyHours)
        }`,
      });
    } catch {
      addToQueue(record);
      syncPending();
      toast.info("Saved offline", {
        description: "Will sync when connection is restored.",
      });
    }
  };

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-5">
      <Toaster position="top-center" richColors />

      {calendarOpen && (
        <AppleCalendarOverlay
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date)}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {/* Weekend Working Modal */}
      <Dialog open={weekendModalOpen} onOpenChange={setWeekendModalOpen}>
        <DialogContent
          className="rounded-2xl mx-4 p-0 overflow-hidden"
          style={{
            maxWidth: 360,
            backgroundColor: "oklch(var(--card))",
            border: "1px solid oklch(var(--border) / 0.3)",
          }}
          data-ocid="weekend_mode.dialog"
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "oklch(var(--foreground))",
                textAlign: "center",
              }}
            >
              Working This Weekend?
            </DialogTitle>

            {/* Deficit display */}
            <div
              className="mt-3 rounded-xl px-4 py-3 text-center"
              style={{
                backgroundColor:
                  weeklyDeficitMins <= 0
                    ? "oklch(var(--success) / 0.10)"
                    : "oklch(var(--primary) / 0.08)",
              }}
            >
              {weeklyDeficitMins <= 0 ? (
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "oklch(var(--success))",
                  }}
                >
                  Weekly target already met \ud83c\udf89 — any hours worked are
                  bonus.
                </p>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      color: "oklch(var(--muted-foreground))",
                      marginBottom: 2,
                    }}
                  >
                    Weekly deficit
                  </p>
                  <p
                    className="ios-number"
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: "oklch(var(--primary))",
                      lineHeight: 1,
                    }}
                  >
                    {formatMins(weeklyDeficitMins)}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "oklch(var(--muted-foreground))",
                      marginTop: 2,
                    }}
                  >
                    still needed this week
                  </p>
                </>
              )}
            </div>
          </DialogHeader>

          {/* Option cards */}
          <div className="px-4 pb-5 space-y-2">
            {/* Half Day */}
            <button
              type="button"
              onClick={() => handleSelectWeekendMode("halfDay")}
              className="w-full rounded-xl px-4 py-3.5 text-left transition-all active:scale-95"
              style={{
                border: "1px solid oklch(var(--border) / 0.5)",
                backgroundColor: "oklch(var(--background))",
              }}
              data-ocid="weekend_mode.half_day.button"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "oklch(var(--warning) / 0.12)",
                  }}
                >
                  <Sunrise
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--warning))",
                    }}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "oklch(var(--foreground))",
                    }}
                  >
                    Half Day
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "oklch(var(--muted-foreground))",
                    }}
                  >
                    4h 30m toward your weekly total
                  </p>
                </div>
                <ChevronRight
                  style={{
                    width: 16,
                    height: 16,
                    color: "oklch(var(--muted-foreground))",
                    marginLeft: "auto",
                    opacity: 0.5,
                  }}
                />
              </div>
            </button>

            {/* Full Day */}
            <button
              type="button"
              onClick={() => handleSelectWeekendMode("fullDay")}
              className="w-full rounded-xl px-4 py-3.5 text-left transition-all active:scale-95"
              style={{
                border: "1px solid oklch(var(--border) / 0.5)",
                backgroundColor: "oklch(var(--background))",
              }}
              data-ocid="weekend_mode.full_day.button"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: "oklch(var(--primary) / 0.12)",
                  }}
                >
                  <Sun
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--primary))",
                    }}
                  />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "oklch(var(--foreground))",
                    }}
                  >
                    Full Day
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "oklch(var(--muted-foreground))",
                    }}
                  >
                    8h 30m toward your weekly total
                  </p>
                </div>
                <ChevronRight
                  style={{
                    width: 16,
                    height: 16,
                    color: "oklch(var(--muted-foreground))",
                    marginLeft: "auto",
                    opacity: 0.5,
                  }}
                />
              </div>
            </button>

            {/* Complete Deficit */}
            {weeklyDeficitMins > 0 && (
              <button
                type="button"
                onClick={() => handleSelectWeekendMode("deficit")}
                className="w-full rounded-xl px-4 py-3.5 text-left transition-all active:scale-95"
                style={{
                  border: "1px solid oklch(var(--success) / 0.35)",
                  backgroundColor: "oklch(var(--success) / 0.06)",
                }}
                data-ocid="weekend_mode.deficit.button"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: "oklch(var(--success) / 0.14)",
                    }}
                  >
                    <Target
                      style={{
                        width: 18,
                        height: 18,
                        color: "oklch(var(--success))",
                      }}
                    />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      Complete Deficit
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "oklch(var(--success))",
                        fontWeight: 500,
                      }}
                    >
                      {formatMins(weeklyDeficitMins)} — just enough to finish
                      the week
                    </p>
                  </div>
                  <ChevronRight
                    style={{
                      width: 16,
                      height: 16,
                      color: "oklch(var(--success))",
                      marginLeft: "auto",
                      opacity: 0.6,
                    }}
                  />
                </div>
              </button>
            )}

            {/* Skip */}
            <button
              type="button"
              onClick={() => setWeekendModalOpen(false)}
              className="w-full py-2 text-center"
              style={{
                fontSize: 15,
                color: "oklch(var(--muted-foreground))",
              }}
              data-ocid="weekend_mode.cancel_button"
            >
              Maybe later
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DATE Section */}
      <div>
        <p className="ios-section-header">Date</p>
        <div className="ios-card overflow-hidden">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="ios-row w-full hover:bg-secondary/40 transition-colors active:bg-secondary/60"
            aria-label="Open date picker"
            data-ocid="date.open_modal_button"
          >
            <CalendarIcon
              className="mr-3 flex-shrink-0"
              style={{ width: 18, height: 18, color: "oklch(var(--primary))" }}
            />
            <span
              className="flex-1 text-left"
              style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
            >
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </span>
            <ChevronRight
              style={{
                width: 16,
                height: 16,
                color: "oklch(var(--muted-foreground))",
                opacity: 0.6,
              }}
            />
          </button>

          {isWeekendDay && (
            <>
              <div
                style={{
                  height: "0.5px",
                  backgroundColor: "oklch(var(--border) / 0.4)",
                  marginLeft: 16,
                }}
              />
              <div
                className="ios-row"
                style={{ color: "oklch(var(--warning))" }}
              >
                <span style={{ fontSize: 13 }}>
                  Weekend \u2014 Hours count toward weekly total
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* LEAVE TYPE Section */}
      <div>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <p className="ios-section-header mb-0">Leave Type</p>
          {compOffBalance > 0 && (
            <Badge
              className="text-xs flex items-center gap-1"
              style={{
                backgroundColor: "oklch(var(--warning) / 0.12)",
                color: "oklch(var(--warning))",
                border: "1px solid oklch(var(--warning) / 0.25)",
              }}
              data-ocid="comp_off.badge"
            >
              <Gift className="w-3 h-3" />
              {compOffBalance} {compOffBalance === 1 ? "day" : "days"} comp off
            </Badge>
          )}
        </div>
        <div className="ios-card overflow-hidden">
          <div className="px-4 py-1">
            <Select
              value={leaveType as string}
              onValueChange={handleLeaveTypeChange}
            >
              <SelectTrigger
                className="h-11 border-0 shadow-none bg-transparent px-0 text-base focus:ring-0 focus:ring-offset-0"
                style={{ fontSize: 17 }}
                data-ocid="leave.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {LEAVE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value as string}
                    value={opt.value as string}
                    className="rounded-lg"
                    style={{ fontSize: 16 }}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* HOLIDAY Banner */}
      {todayIsHoliday && (
        <div>
          <p className="ios-section-header">Holiday</p>
          <div className="ios-card overflow-hidden">
            {/* Holiday info row */}
            <div className="ios-row gap-3">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "oklch(var(--primary) / 0.12)",
                }}
              >
                <Star
                  style={{
                    width: 16,
                    height: 16,
                    color: "oklch(var(--primary))",
                  }}
                />
              </div>
              <div className="flex-1">
                <p
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: "oklch(var(--foreground))",
                  }}
                >
                  {holidayInfo?.name || "Company Holiday"}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "oklch(var(--muted-foreground))",
                  }}
                >
                  Weekly target reduced by 8h 30m
                </p>
              </div>
            </div>

            {/* Separator */}
            <div
              style={{
                height: "0.5px",
                backgroundColor: "oklch(var(--border) / 0.4)",
                marginLeft: 16,
              }}
            />

            {/* Holiday working toggle row */}
            <div
              className="ios-row justify-between"
              data-ocid="holiday_working.toggle"
            >
              <div>
                <p style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
                  Working today?
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "oklch(var(--muted-foreground))",
                  }}
                >
                  Toggle to earn comp off
                </p>
              </div>
              <Switch
                checked={holidayWorking}
                onCheckedChange={setHolidayWorking}
                data-ocid="holiday_working.switch"
              />
            </div>
          </div>
        </div>
      )}

      {/* SWIPE TIMES Section */}
      {!isFullDayLeave && (
        <div
          style={{
            opacity: swipeFieldsDisabled ? 0.45 : 1,
            pointerEvents: swipeFieldsDisabled ? "none" : "auto",
          }}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <p className="ios-section-header mb-0">Swipe Times</p>
            {isWeekendDay && weekendModeBadgeLabel && (
              <span
                className="px-3 py-1 rounded-full"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "oklch(var(--primary) / 0.10)",
                  color: "oklch(var(--primary))",
                  border: "1px solid oklch(var(--primary) / 0.2)",
                }}
                data-ocid="weekend_mode.badge"
              >
                {weekendModeBadgeLabel}
              </span>
            )}
          </div>
          <div className="ios-card overflow-hidden">
            {/* Swipe In row */}
            <div className="px-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <Label
                  style={{
                    fontSize: 13,
                    color: "oklch(var(--muted-foreground))",
                  }}
                >
                  Swipe In
                </Label>
                {leaveType === LeaveType.halfDayFirstHalf ||
                leaveType === "compOffFirstHalf" ? (
                  <div
                    className="flex items-center gap-1"
                    style={{ color: "oklch(var(--primary))" }}
                  >
                    <Lock style={{ width: 12, height: 12 }} />
                    <span style={{ fontSize: 12 }}>Frozen at 13:00</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwipeInChange(getCurrentTimeString())}
                    className="tap-target flex items-center gap-1 px-2"
                    style={{ fontSize: 15, color: "oklch(var(--primary))" }}
                    data-ocid="swipe_in.button"
                  >
                    <Clock style={{ width: 13, height: 13 }} />
                    Now
                  </button>
                )}
              </div>
              <input
                type="time"
                value={swipeIn}
                onFocus={handleSwipeInFocus}
                onChange={(e) => handleSwipeInChange(e.target.value)}
                disabled={
                  leaveType === LeaveType.halfDayFirstHalf ||
                  leaveType === "compOffFirstHalf"
                }
                className="w-full rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 ios-input-fill"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                  color:
                    leaveType === LeaveType.halfDayFirstHalf ||
                    leaveType === "compOffFirstHalf"
                      ? "oklch(var(--primary))"
                      : "oklch(var(--foreground))",
                  border: "none",
                }}
                data-ocid="swipe_in.input"
              />
              {showFirstHalfWarning && (
                <div
                  className="flex items-center gap-2 mt-2 px-3 py-2 rounded-[10px]"
                  style={{ backgroundColor: "oklch(var(--warning) / 0.10)" }}
                >
                  <AlertTriangle
                    style={{
                      width: 14,
                      height: 14,
                      color: "oklch(var(--warning))",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "oklch(var(--warning))" }}
                  >
                    Apply leave for full day
                  </span>
                </div>
              )}
            </div>

            {/* Hairline separator */}
            <div
              style={{
                height: "0.5px",
                backgroundColor: "oklch(var(--border) / 0.4)",
                marginLeft: 16,
              }}
            />

            {/* Swipe Out row */}
            <div className="px-4 py-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Label
                    style={{
                      fontSize: 13,
                      color: "oklch(var(--muted-foreground))",
                    }}
                  >
                    Swipe Out
                  </Label>
                  {!swipeOutManual && swipeOut && (
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        backgroundColor: "oklch(var(--primary) / 0.1)",
                        color: "oklch(var(--primary))",
                      }}
                    >
                      Auto
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleSwipeOutChange(getCurrentTimeString())}
                  className="tap-target flex items-center gap-1 px-2"
                  style={{ fontSize: 15, color: "oklch(var(--primary))" }}
                  data-ocid="swipe_out.button"
                >
                  <Clock style={{ width: 13, height: 13 }} />
                  Now
                </button>
              </div>
              <input
                type="time"
                value={swipeOut}
                onChange={(e) => handleSwipeOutChange(e.target.value)}
                className="w-full rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 ios-input-fill"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                  color: "oklch(var(--foreground))",
                  border: "none",
                }}
                data-ocid="swipe_out.input"
              />
              {showSecondHalfError && (
                <div
                  className="flex items-center gap-2 mt-2 px-3 py-2 rounded-[10px]"
                  style={{
                    backgroundColor: "oklch(var(--destructive) / 0.10)",
                  }}
                >
                  <AlertTriangle
                    style={{
                      width: 14,
                      height: 14,
                      color: "oklch(var(--destructive))",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "oklch(var(--destructive))" }}
                  >
                    Swipe-out must be \u2265 12:30 for second-half leave
                  </span>
                </div>
              )}
              {showBreakfastCompensationNote && (
                <div
                  className="flex items-center gap-2 mt-2 px-3 py-2 rounded-[10px]"
                  style={{ backgroundColor: "oklch(var(--primary) / 0.08)" }}
                >
                  <Coffee
                    style={{
                      width: 14,
                      height: 14,
                      color: "oklch(var(--primary))",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "oklch(var(--primary))" }}
                  >
                    Stay until 13:00 to compensate breakfast
                  </span>
                </div>
              )}
            </div>

            {/* Hairline separator */}
            <div
              style={{
                height: "0.5px",
                backgroundColor: "oklch(var(--border) / 0.4)",
                marginLeft: 16,
              }}
            />

            {/* Breakfast toggle row */}
            {!isWeekendDay && !todayIsHoliday && (
              <div
                className="ios-row justify-between"
                data-ocid="breakfast.toggle"
              >
                <div className="flex items-center gap-3">
                  <Coffee
                    style={{
                      width: 18,
                      height: 18,
                      color: "oklch(var(--warning))",
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: 17,
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      Breakfast at Office
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "oklch(var(--muted-foreground))",
                      }}
                    >
                      +30 min added to swipe-out
                    </p>
                  </div>
                </div>
                <Switch
                  checked={breakfast}
                  onCheckedChange={handleBreakfastChange}
                  disabled={swipeFieldsDisabled}
                  data-ocid="breakfast.switch"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* DAILY SUMMARY Section */}
      {!isFullDayLeave && !swipeFieldsDisabled && (swipeIn || swipeOut) && (
        <div>
          <p className="ios-section-header">Summary</p>
          <div className="ios-card overflow-hidden">
            {/* Hours row */}
            <div className="ios-row justify-between">
              <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
                Daily Hours
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="ios-number"
                  style={{
                    fontSize: 24,
                    color:
                      hoursIndicator.color === "green"
                        ? "oklch(var(--success))"
                        : hoursIndicator.color === "red"
                          ? "oklch(var(--destructive))"
                          : "oklch(var(--primary))",
                  }}
                >
                  {hoursIndicator.hoursDisplay}
                </span>
                {hoursIndicator.diffDisplay && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        hoursIndicator.color === "green"
                          ? "oklch(var(--success))"
                          : "oklch(var(--destructive))",
                    }}
                  >
                    {hoursIndicator.diffDisplay}
                  </span>
                )}
              </div>
            </div>

            {!isWeekendDay && !todayIsHoliday && coreViolation && (
              <>
                <div
                  style={{
                    height: "0.5px",
                    backgroundColor: "oklch(var(--border) / 0.4)",
                    marginLeft: 16,
                  }}
                />
                <div className="ios-row gap-2">
                  <AlertTriangle
                    style={{
                      width: 16,
                      height: 16,
                      color: "oklch(var(--destructive))",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{ fontSize: 13, color: "oklch(var(--destructive))" }}
                  >
                    Core hours not met (9:30 AM \u2013 4:00 PM)
                  </span>
                </div>
              </>
            )}

            {isSimpleWorkMode && holidayWorkingHours !== null && (
              <>
                <div
                  style={{
                    height: "0.5px",
                    backgroundColor: "oklch(var(--border) / 0.4)",
                    marginLeft: 16,
                  }}
                />
                <div className="ios-row gap-3">
                  <Gift
                    style={{
                      width: 16,
                      height: 16,
                      color: "oklch(var(--warning))",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "oklch(var(--warning))",
                      }}
                    >
                      {compOffEarned !== null && compOffEarned > 0
                        ? `${compOffEarned} day comp off earned`
                        : "No comp off yet"}
                    </p>
                    {compOffNote && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "oklch(var(--warning) / 0.8)",
                        }}
                      >
                        {compOffNote}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {!todayIsHoliday && (
              <>
                <div
                  style={{
                    height: "0.5px",
                    backgroundColor: "oklch(var(--border) / 0.4)",
                    marginLeft: 16,
                  }}
                />
                <div className="px-4 py-2">
                  <SmartSwipeOutPrediction
                    swipeIn={swipeIn}
                    breakfastAtOffice={breakfast}
                    completedMinutesThisWeek={completedMinutesThisWeek}
                    weeklyTargetMinutes={weeklyTarget}
                    remainingWorkdays={remainingWorkdays}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full Day Leave info */}
      {isFullDayLeave && (
        <div>
          <p className="ios-section-header">Leave Info</p>
          <div className="ios-card overflow-hidden">
            <div className="ios-row gap-3">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "oklch(var(--warning) / 0.12)",
                }}
              >
                <CalendarIcon
                  style={{
                    width: 16,
                    height: 16,
                    color: "oklch(var(--warning))",
                  }}
                />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 17,
                    fontWeight: 500,
                    color: "oklch(var(--foreground))",
                  }}
                >
                  Full-Day Leave
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "oklch(var(--muted-foreground))",
                  }}
                >
                  Weekly target reduced by 8h 30m
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVE Button */}
      <Button
        onClick={handleSave}
        disabled={saveRecord.isPending || showSecondHalfError}
        className="w-full font-semibold rounded-xl shadow-glow"
        style={{ height: 50, fontSize: 17 }}
        data-ocid="save.primary_button"
      >
        {saveRecord.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving\u2026
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Record
          </span>
        )}
      </Button>
    </div>
  );
}
