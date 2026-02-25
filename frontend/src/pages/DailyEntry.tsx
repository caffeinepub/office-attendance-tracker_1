import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Coffee, ChevronDown, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AttendanceRecord, LeaveType } from '../backend';
import {
  formatDateKey,
  getCurrentTimeString,
  calculateDailyHours,
  checkCoreHoursViolation,
  formatHoursDisplay,
  getWeekRange,
  calculateWeeklyTarget,
  isWeekendDate,
  getLeaveTypeLabel,
} from '../utils/hoursCalculation';
import { useGetRecord, useSaveRecord, useGetRecordsByDateRange } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { useOfflineSync } from '../hooks/useOfflineSync';
import SmartSwipeOutPrediction from '../components/SmartSwipeOutPrediction';

const LEAVE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: LeaveType.noLeave, label: 'No Leave' },
  { value: LeaveType.halfDayFirstHalf, label: 'Half-Day – First Half' },
  { value: LeaveType.halfDaySecondHalf, label: 'Half-Day – Second Half' },
  { value: LeaveType.fullDayLeave, label: 'Full-Day Leave' },
];

function leaveTypeToStr(lt: LeaveType): 'noLeave' | 'halfDayFirstHalf' | 'halfDaySecondHalf' | 'fullDayLeave' {
  return lt as unknown as 'noLeave' | 'halfDayFirstHalf' | 'halfDaySecondHalf' | 'fullDayLeave';
}

export default function DailyEntry() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [swipeIn, setSwipeIn] = useState('');
  const [swipeOut, setSwipeOut] = useState('');
  const [breakfast, setBreakfast] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.noLeave);

  const dateKey = formatDateKey(selectedDate);
  const { data: existingRecord, isLoading: recordLoading } = useGetRecord(dateKey);
  const saveRecord = useSaveRecord();
  const { actor } = useActor();
  const { addToQueue, syncPending } = useOfflineSync(actor);

  // Load existing record when date changes
  useEffect(() => {
    if (existingRecord) {
      setSwipeIn(existingRecord.swipeIn || '');
      setSwipeOut(existingRecord.swipeOut || '');
      setBreakfast(existingRecord.breakfastAtOffice);
      setLeaveType(existingRecord.leaveType as unknown as LeaveType);
    } else if (!recordLoading) {
      setSwipeIn('');
      setSwipeOut('');
      setBreakfast(false);
      setLeaveType(LeaveType.noLeave);
    }
  }, [existingRecord, recordLoading, dateKey]);

  // Get this week's records for prediction
  const weekRange = getWeekRange(selectedDate);
  const { data: weekRecords = [] } = useGetRecordsByDateRange(weekRange.start, weekRange.end);

  const completedMinutesThisWeek = useMemo(() => {
    return weekRecords
      .filter(r => r.date !== dateKey) // exclude today's incomplete entry
      .reduce((sum, r) => {
        return sum + calculateDailyHours({
          date: r.date,
          swipeIn: r.swipeIn,
          swipeOut: r.swipeOut,
          breakfastAtOffice: r.breakfastAtOffice,
          leaveType: leaveTypeToStr(r.leaveType as unknown as LeaveType),
        });
      }, 0);
  }, [weekRecords, dateKey]);

  const weeklyTarget = useMemo(() => {
    const allLeaves = weekRecords.map(r => ({
      date: r.date,
      swipeIn: r.swipeIn,
      swipeOut: r.swipeOut,
      breakfastAtOffice: r.breakfastAtOffice,
      leaveType: leaveTypeToStr(r.leaveType as unknown as LeaveType),
    }));
    // Include today's leave type
    const todayRecord = { date: dateKey, swipeIn, swipeOut, breakfastAtOffice: breakfast, leaveType: leaveTypeToStr(leaveType) };
    const allForTarget = [...allLeaves.filter(r => r.date !== dateKey), todayRecord];
    return calculateWeeklyTarget(allForTarget);
  }, [weekRecords, dateKey, leaveType, swipeIn, swipeOut, breakfast]);

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
      toast.success('Record saved successfully!', {
        description: `${format(selectedDate, 'EEEE, MMM d')} — ${formatHoursDisplay(dailyHours)}`,
      });
    } catch {
      // Offline fallback
      addToQueue(record);
      syncPending();
      toast.info('Saved offline', {
        description: 'Will sync when connection is restored.',
      });
    }
  };

  return (
    <div className="page-enter px-4 py-5 space-y-4">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Daily Entry</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Log your attendance for the day</p>
      </div>

      {/* Date Picker */}
      <div className="app-card p-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center justify-between bg-secondary rounded-xl px-4 py-3 tap-target hover:bg-secondary/80 transition-colors">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={date => {
                if (date) {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {isWeekendDay && (
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2">
            <span className="text-xs font-medium text-warning">Weekend — Hours count toward weekly total</span>
          </div>
        )}
      </div>

      {/* Leave Type */}
      <div className="app-card p-4 space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leave Type</Label>
        <Select value={leaveType as string} onValueChange={v => setLeaveType(v as LeaveType)}>
          <SelectTrigger className="h-12 rounded-xl bg-secondary border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {LEAVE_OPTIONS.map(opt => (
              <SelectItem key={opt.value as string} value={opt.value as string} className="rounded-lg">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swipe Times */}
      {!isFullDayLeave && (
        <div className="app-card p-4 space-y-4">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Swipe Times</Label>

          {/* Swipe In */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Swipe In</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSwipeIn(getCurrentTimeString())}
                className="h-8 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10"
              >
                <Clock className="w-3 h-3 mr-1" />
                Now
              </Button>
            </div>
            <input
              type="time"
              value={swipeIn}
              onChange={e => setSwipeIn(e.target.value)}
              className="w-full h-12 bg-secondary rounded-xl px-4 text-foreground font-semibold text-lg border-0 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Swipe Out */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Swipe Out</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSwipeOut(getCurrentTimeString())}
                className="h-8 text-xs rounded-lg border-primary/30 text-primary hover:bg-primary/10"
              >
                <Clock className="w-3 h-3 mr-1" />
                Now
              </Button>
            </div>
            <input
              type="time"
              value={swipeOut}
              onChange={e => setSwipeOut(e.target.value)}
              className="w-full h-12 bg-secondary rounded-xl px-4 text-foreground font-semibold text-lg border-0 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Breakfast Toggle */}
          <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Breakfast at Office</p>
                <p className="text-xs text-muted-foreground">+30 min added to daily hours</p>
              </div>
            </div>
            <Switch checked={breakfast} onCheckedChange={setBreakfast} />
          </div>
        </div>
      )}

      {/* Daily Summary */}
      {!isFullDayLeave && (swipeIn || swipeOut) && (
        <div className="app-card p-4 space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Summary</Label>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Daily Hours</span>
            <span className="text-2xl font-display font-bold text-primary">
              {formatHoursDisplay(dailyHours)}
            </span>
          </div>

          {coreViolation && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-destructive">
                Core hours requirement not met (9:30 AM – 4:00 PM)
              </p>
            </div>
          )}

          {/* Smart Prediction */}
          <SmartSwipeOutPrediction
            swipeIn={swipeIn}
            breakfastAtOffice={breakfast}
            completedMinutesThisWeek={completedMinutesThisWeek}
            weeklyTargetMinutes={weeklyTarget}
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
              <p className="text-sm font-semibold text-foreground">Full-Day Leave</p>
              <p className="text-xs text-muted-foreground">Weekly target reduced by 8h 30m</p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saveRecord.isPending}
        className="w-full h-14 text-base font-semibold rounded-2xl shadow-glow"
        size="lg"
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
