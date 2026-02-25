import React from 'react';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import {
  calculateSwipeOutPrediction,
  formatHoursDisplay,
  formatTimeAmPm,
  parseTime,
  LeaveTypeStr,
} from '../utils/hoursCalculation';

interface SmartSwipeOutPredictionProps {
  swipeIn: string;
  breakfastAtOffice: boolean;
  completedMinutesThisWeek: number;
  weeklyTargetMinutes: number;
  /** Leave type for today – used to correctly factor in lunch deduction for noLeave days */
  leaveType?: LeaveTypeStr;
}

export default function SmartSwipeOutPrediction({
  swipeIn,
  breakfastAtOffice,
  completedMinutesThisWeek,
  weeklyTargetMinutes,
  leaveType = 'noLeave',
}: SmartSwipeOutPredictionProps) {
  if (!swipeIn) return null;

  // Pass leaveType so the prediction correctly adds the 30-min lunch deduction
  // to the required raw work time for noLeave days.
  const { needed, predictedSwipeOut, alreadyMet } = calculateSwipeOutPrediction(
    swipeIn,
    breakfastAtOffice,
    completedMinutesThisWeek,
    weeklyTargetMinutes,
    leaveType
  );

  if (alreadyMet) {
    return (
      <div className="flex items-start gap-3 bg-success/10 border border-success/20 rounded-xl p-3">
        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-success">Weekly target already met! 🎉</p>
          <p className="text-xs text-muted-foreground mt-0.5">You've completed your hours for this week.</p>
        </div>
      </div>
    );
  }

  if (!predictedSwipeOut) return null;

  const predictedMins = parseTime(predictedSwipeOut);
  const timeDisplay = formatTimeAmPm(predictedMins);

  return (
    <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
      <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-foreground">
          You need <span className="text-primary">{formatHoursDisplay(needed)}</span> more this week.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Swipe out at <span className="font-semibold text-foreground">{timeDisplay}</span> to complete your weekly target.
        </p>
      </div>
    </div>
  );
}
