import { Button } from "@/components/ui/button";
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
  ChevronDown,
  Clock,
  Coffee,
  Loader2,
  Lock,
  Save,
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { type AttendanceRecord, LeaveType } from "../backend";
import AppleCalendarOverlay from "../components/AppleCalendarOverlay";
import SmartSwipeOutPrediction from "../components/SmartSwipeOutPrediction";
import { useActor } from "../hooks/useActor";
import { useOfflineSync } from "../hooks/useOfflineSync";
import {
  useGetRecord,
  useGetRecordsByDateRange,
  useSaveRecord,
} from "../hooks/useQueries";
import {
  calculateDailyHours,
  calculateWeeklyTarget,
  checkCoreHoursViolation,
  formatDateKey,
  formatHoursDisplay,
  formatMinutes,
  getCurrentTimeString,
  getDailyHoursIndicator,
  getLeaveTypeLabel,
  getWeekRange,
  isWeekendDate,
  parseTime,
} from "../utils/hoursCalculation";

const LEAVE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: LeaveType.noLeave, label: "No Leave" },
  { value: LeaveType.halfDayFirstHalf, label: "Half-Day – First Half" },
  { value: LeaveType.halfDaySecondHalf, label: "Half-Day – Second Half" },
  { value: LeaveType.fullDayLeave, label: "Full-Day Leave" },
];

function leaveTypeToStr(
  lt: LeaveType,
): "noLeave" | "halfDayFirstHalf" | "halfDaySecondHalf" | "fullDayLeave" {
  return lt as unknown as
    | "noLeave"
    | "halfDayFirstHalf"
    | "halfDaySecondHalf"
    | "fullDayLeave";
}

const ONE_PM_MINS = 13 * 60;
const HALF_PAST_12_MINS = 12 * 60 + 30;
const WORK_WINDOW_END_MINS = 19 * 60;

/** Calculate the auto-predicted swipe-out based on swipe-in, leave type and breakfast */
function calcAutoSwipeOut(
  swipeInStr: string,
  lt: LeaveType,
  hasBreakfast: boolean,
): string {
  if (!swipeInStr) return "";
  const swipeInMins = parseTime(swipeInStr);

  if (lt === LeaveType.noLeave) {
    // Standard day: 8h30m target + 30m lunch deduction - breakfast bonus
    // Raw time to stay = 8.5h + 0.5h (lunch) - 0.5h (breakfast if applicable)
    const rawMinutes = 8 * 60 + 30 + 30 - (hasBreakfast ? 30 : 0);
    const predictedOut = swipeInMins + rawMinutes;
    return formatMinutes(Math.min(predictedOut, WORK_WINDOW_END_MINS));
  }

  if (lt === LeaveType.halfDaySecondHalf) {
    // Always leave at 12:30 (breakfast compensation is shown as a note, not time change)
    return formatMinutes(HALF_PAST_12_MINS);
  }

  return "";
}

export default function DailyEntry() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [swipeIn, setSwipeIn] = useState("");
  const [swipeOut, setSwipeOut] = useState("");
  const [breakfast, setBreakfast] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.noLeave);
  // Track whether swipeOut was auto-filled vs manually set
  const [swipeOutManual, setSwipeOutManual] = useState(false);

  const dateKey = formatDateKey(selectedDate);
  const { data: existingRecord, isLoading: recordLoading } =
    useGetRecord(dateKey);
  const saveRecord = useSaveRecord();
  const { actor } = useActor();
  const { addToQueue, syncPending } = useOfflineSync(actor);

  // Load existing record when date changes
  useEffect(() => {
    if (existingRecord) {
      setSwipeIn(existingRecord.swipeIn || "");
      setSwipeOut(existingRecord.swipeOut || "");
      setBreakfast(existingRecord.breakfastAtOffice);
      setLeaveType(existingRecord.leaveType as unknown as LeaveType);
      setSwipeOutManual(true); // treat loaded data as manual
    } else if (!recordLoading) {
      setSwipeIn("");
      setSwipeOut("");
      setBreakfast(false);
      setLeaveType(LeaveType.noLeave);
      setSwipeOutManual(false);
    }
  }, [existingRecord, recordLoading]);

  // Auto-fill swipe-out when swipeIn, leaveType, or breakfast changes
  // Only auto-fill if swipeOut hasn't been manually edited
  useEffect(() => {
    if (swipeOutManual) return;
    if (!swipeIn) return;
    const auto = calcAutoSwipeOut(swipeIn, leaveType, breakfast);
    if (auto) {
      setSwipeOut(auto);
    }
  }, [swipeIn, leaveType, breakfast, swipeOutManual]);

  // Freeze swipe-in at 13:00 when first-half leave is selected
  useEffect(() => {
    if (leaveType === LeaveType.halfDayFirstHalf) {
      setSwipeIn("13:00");
      setSwipeOutManual(false);
    }
  }, [leaveType]);

  const handleSwipeOutChange = (val: string) => {
    setSwipeOut(val);
    setSwipeOutManual(true); // user manually changed it
  };

  const handleSwipeInChange = (val: string) => {
    setSwipeIn(val);
    // Reset manual flag so auto-fill kicks in again
    setSwipeOutManual(false);
  };

  const handleLeaveTypeChange = (v: string) => {
    setLeaveType(v as LeaveType);
    setSwipeOutManual(false); // re-trigger auto-fill for new leave type
  };

  const handleBreakfastChange = (val: boolean) => {
    setBreakfast(val);
    setSwipeOutManual(false); // re-trigger auto-fill since breakfast changes time
  };

  // Get this week's records for prediction
  const weekRange = getWeekRange(selectedDate);
  const { data: weekRecords = [] } = useGetRecordsByDateRange(
    weekRange.start,
    weekRange.end,
  );

  const completedMinutesThisWeek = useMemo(() => {
    return weekRecords
      .filter((r) => r.date !== dateKey)
      .reduce((sum, r) => {
        return (
          sum +
          calculateDailyHours({
            date: r.date,
            swipeIn: r.swipeIn,
            swipeOut: r.swipeOut,
            breakfastAtOffice: r.breakfastAtOffice,
            leaveType: leaveTypeToStr(r.leaveType as unknown as LeaveType),
          })
        );
      }, 0);
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
    const allForTarget = [
      ...allLeaves.filter((r) => r.date !== dateKey),
      todayRecord,
    ];
    return calculateWeeklyTarget(allForTarget);
  }, [weekRecords, dateKey, leaveType, swipeIn, swipeOut, breakfast]);

  // Remaining weekdays from today (inclusive) until Friday
  const remainingWorkdays = useMemo(() => {
    const dayOfWeek = selectedDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) return 5; // weekend: full week ahead
    return 6 - dayOfWeek; // Mon=5, Tue=4, Wed=3, Thu=2, Fri=1
  }, [selectedDate]);
  const currentRecord = {
    date: dateKey,
    swipeIn,
    swipeOut,
    breakfastAtOffice: breakfast,
    leaveType: leaveTypeToStr(leaveType),
  };

  const dailyHours = calculateDailyHours(currentRecord);
  const coreViolation = checkCoreHoursViolation(currentRecord);
  const isWeekendDay = isWeekendDate(dateKey);
  const isFullDayLeave = leaveType === LeaveType.fullDayLeave;

  const showFirstHalfWarning = useMemo(() => {
    if (leaveType !== LeaveType.halfDayFirstHalf) return false;
    if (!swipeIn) return false;
    return parseTime(swipeIn) > ONE_PM_MINS;
  }, [leaveType, swipeIn]);

  const showSecondHalfError = useMemo(() => {
    if (leaveType !== LeaveType.halfDaySecondHalf) return false;
    if (!swipeOut) return false;
    return parseTime(swipeOut) < HALF_PAST_12_MINS;
  }, [leaveType, swipeOut]);

  // Show breakfast compensation note: second half leave + breakfast
  const showBreakfastCompensationNote = useMemo(() => {
    return leaveType === LeaveType.halfDaySecondHalf && breakfast;
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

  const handleSave = async () => {
    const record: AttendanceRecord = {
      date: dateKey,
      swipeIn,
      swipeOut,
      breakfastAtOffice: breakfast,
      leaveType: leaveType as unknown as LeaveType,
    };

    try {
      await saveRecord.mutateAsync(record);
      toast.success("Record saved successfully!", {
        description: `${format(selectedDate, "EEEE, MMM d")} — ${formatHoursDisplay(dailyHours)}`,
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
    <div className="page-enter px-4 py-5 space-y-4">
      <Toaster position="top-center" richColors />

      {calendarOpen && (
        <AppleCalendarOverlay
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            // Do NOT call setCalendarOpen(false) here.
            // The overlay handles its own close animation and calls onClose after it completes.
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Daily Entry
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Log your attendance for the day
        </p>
      </div>

      {/* Date Picker */}
      <div className="app-card p-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Date
        </Label>
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="w-full flex items-center justify-between bg-secondary rounded-xl px-4 py-3 tap-target hover:bg-secondary/80 transition-colors"
          aria-label="Open date picker"
          data-ocid="date.open_modal_button"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>

        {isWeekendDay && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-warning">
              Weekend — Hours count toward weekly total
            </span>
          </div>
        )}
      </div>

      {/* Leave Type */}
      <div className="app-card p-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Leave Type
        </Label>
        <Select
          value={leaveType as string}
          onValueChange={handleLeaveTypeChange}
        >
          <SelectTrigger
            className="h-12 rounded-xl bg-secondary border-0"
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
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swipe Times */}
      {!isFullDayLeave && (
        <div className="app-card p-4 space-y-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Swipe Times
          </Label>

          {/* Swipe In */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">
                Swipe In
              </Label>
              {leaveType !== LeaveType.halfDayFirstHalf && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSwipeInChange(getCurrentTimeString())}
                  className="h-8 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                  data-ocid="swipe_in.button"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Now
                </Button>
              )}
            </div>
            <input
              type="time"
              value={swipeIn}
              onChange={(e) => handleSwipeInChange(e.target.value)}
              disabled={leaveType === LeaveType.halfDayFirstHalf}
              className={`w-full h-12 rounded-xl px-4 font-semibold text-lg border-0 outline-none focus:ring-2 focus:ring-primary/30 ${leaveType === LeaveType.halfDayFirstHalf ? "bg-primary/10 text-primary cursor-not-allowed" : "bg-secondary text-foreground"}`}
              data-ocid="swipe_in.input"
            />
            {leaveType === LeaveType.halfDayFirstHalf && (
              <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-xl px-3 py-2">
                <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-primary">
                  Frozen at 13:00 (first-half leave)
                </span>
              </div>
            )}
            {showFirstHalfWarning && (
              <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                <span className="text-xs font-medium text-warning">
                  Apply leave for full day
                </span>
              </div>
            )}
          </div>

          {/* Swipe Out */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">
                Swipe Out
                {!swipeOutManual && swipeOut && (
                  <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Auto-filled
                  </span>
                )}
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSwipeOutChange(getCurrentTimeString())}
                className="h-8 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                data-ocid="swipe_out.button"
              >
                <Clock className="w-3 h-3 mr-1" />
                Now
              </Button>
            </div>
            <input
              type="time"
              value={swipeOut}
              onChange={(e) => handleSwipeOutChange(e.target.value)}
              className="w-full h-12 bg-secondary rounded-xl px-4 text-foreground font-semibold text-lg border-0 outline-none focus:ring-2 focus:ring-primary/30"
              data-ocid="swipe_out.input"
            />
            {showSecondHalfError && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span className="text-xs font-medium text-destructive">
                  You cannot leave before 12:30
                </span>
              </div>
            )}
            {showBreakfastCompensationNote && (
              <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2.5">
                <Coffee className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <span className="text-xs font-medium text-warning">
                  Breakfast taken — stay until 13:00 to compensate the 30 min
                  breakfast time
                </span>
              </div>
            )}
          </div>

          {/* Breakfast Toggle */}
          <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Breakfast at Office
                </p>
                <p className="text-xs text-muted-foreground">
                  +30 min added to daily hours
                </p>
              </div>
            </div>
            <Switch
              checked={breakfast}
              onCheckedChange={handleBreakfastChange}
              data-ocid="breakfast.switch"
            />
          </div>
        </div>
      )}

      {/* Daily Summary */}
      {!isFullDayLeave && (swipeIn || swipeOut) && (
        <div className="app-card p-4 space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Today's Summary
          </Label>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Daily Hours</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-2xl font-display font-bold ${
                  hoursIndicator.color === "green"
                    ? "text-success"
                    : hoursIndicator.color === "red"
                      ? "text-destructive"
                      : "text-primary"
                }`}
              >
                {hoursIndicator.hoursDisplay}
              </span>
              {hoursIndicator.diffDisplay && (
                <span
                  className={`text-sm font-semibold ${
                    hoursIndicator.color === "green"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {hoursIndicator.diffDisplay}
                </span>
              )}
            </div>
          </div>

          {coreViolation && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-destructive">
                Core hours requirement not met (9:30 AM – 4:00 PM)
              </p>
            </div>
          )}

          <SmartSwipeOutPrediction
            swipeIn={swipeIn}
            breakfastAtOffice={breakfast}
            completedMinutesThisWeek={completedMinutesThisWeek}
            weeklyTargetMinutes={weeklyTarget}
            remainingWorkdays={remainingWorkdays}
          />
        </div>
      )}

      {isFullDayLeave && (
        <div className="app-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Full-Day Leave
              </p>
              <p className="text-xs text-muted-foreground">
                Weekly target reduced by 8h 30m
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saveRecord.isPending || showSecondHalfError}
        className="w-full h-14 text-base font-semibold rounded-2xl shadow-glow"
        size="lg"
        data-ocid="save.primary_button"
      >
        {saveRecord.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Saving...
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
