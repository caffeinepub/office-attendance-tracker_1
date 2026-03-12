import { Brain, CheckCircle2 } from "lucide-react";
import React from "react";
import {
  type LeaveTypeStr,
  calculateSwipeOutPrediction,
  formatHoursDisplay,
  formatTimeAmPm,
  parseTime,
} from "../utils/hoursCalculation";

interface SmartSwipeOutPredictionProps {
  swipeIn: string;
  breakfastAtOffice: boolean;
  completedMinutesThisWeek: number;
  weeklyTargetMinutes: number;
  remainingWorkdays?: number;
  /** Leave type for today – used to correctly factor in lunch deduction for noLeave days */
  leaveType?: LeaveTypeStr;
}

export default function SmartSwipeOutPrediction({
  swipeIn,
  breakfastAtOffice,
  completedMinutesThisWeek,
  weeklyTargetMinutes,
  remainingWorkdays = 1,
  leaveType = "noLeave",
}: SmartSwipeOutPredictionProps) {
  if (!swipeIn) return null;

  const { needed, predictedSwipeOut, alreadyMet } = calculateSwipeOutPrediction(
    swipeIn,
    breakfastAtOffice,
    completedMinutesThisWeek,
    weeklyTargetMinutes,
    leaveType,
  );

  if (alreadyMet) {
    return (
      <div className="flex items-start gap-3 bg-success/10 border border-success/20 rounded-xl p-3">
        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-success">
            Weekly target already met! 🎉
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You've completed your hours for this week.
          </p>
        </div>
      </div>
    );
  }

  if (!predictedSwipeOut) return null;

  const predictedMins = parseTime(predictedSwipeOut);
  const _timeDisplay = formatTimeAmPm(predictedMins);

  // AI-based insight: average hours per remaining workday
  const daysLeft = Math.max(1, remainingWorkdays);
  const avgPerDay = Math.ceil(needed / daysLeft);
  const avgDisplay = formatHoursDisplay(avgPerDay);

  // Build smart message
  const dayLabel = daysLeft === 1 ? "day" : "days";

  return (
    <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
      <Brain className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          <span className="text-primary">{formatHoursDisplay(needed)}</span>{" "}
          left this week across{" "}
          <span className="text-primary">
            {daysLeft} {dayLabel}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Aim for ~
          <span className="font-semibold text-foreground">
            {avgDisplay}/day
          </span>{" "}
          to stay on track.
        </p>
      </div>
    </div>
  );
}
