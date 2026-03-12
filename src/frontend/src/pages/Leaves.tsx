import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import React, { useMemo } from "react";
import type { AttendanceRecord, LeaveType } from "../backend";
import { useGetAllRecords } from "../hooks/useQueries";
import { getLeaveTypeLabel, parseDateKey } from "../utils/hoursCalculation";

function leaveTypeToStr(
  lt: LeaveType,
): "noLeave" | "halfDayFirstHalf" | "halfDaySecondHalf" | "fullDayLeave" {
  return lt as unknown as
    | "noLeave"
    | "halfDayFirstHalf"
    | "halfDaySecondHalf"
    | "fullDayLeave";
}

function LeaveItem({ record }: { record: AttendanceRecord }) {
  const leaveStr = leaveTypeToStr(record.leaveType as unknown as LeaveType);
  const date = parseDateKey(record.date);
  const isFullDay = leaveStr === "fullDayLeave";
  const isFirstHalf = leaveStr === "halfDayFirstHalf";

  return (
    <div className="app-card p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isFullDay ? "bg-destructive/10" : "bg-warning/10"
        }`}
      >
        <Calendar
          className={`w-5 h-5 ${isFullDay ? "text-destructive" : "text-warning"}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {format(date, "EEEE, MMMM d, yyyy")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getLeaveTypeLabel(leaveStr)}
        </p>
      </div>
      <Badge
        variant={isFullDay ? "destructive" : "secondary"}
        className="text-xs flex-shrink-0"
      >
        {isFullDay ? "Full Day" : isFirstHalf ? "1st Half" : "2nd Half"}
      </Badge>
    </div>
  );
}

export default function Leaves() {
  const { data: allRecords = [], isLoading } = useGetAllRecords();

  const { fullDayLeaves, halfDayLeaves, leaveHistory } = useMemo(() => {
    const leaves = allRecords.filter((r) => {
      const lt = leaveTypeToStr(r.leaveType as unknown as LeaveType);
      return lt !== "noLeave";
    });

    const sorted = [...leaves].sort((a, b) => b.date.localeCompare(a.date));

    return {
      fullDayLeaves: sorted.filter(
        (r) =>
          leaveTypeToStr(r.leaveType as unknown as LeaveType) ===
          "fullDayLeave",
      ),
      halfDayLeaves: sorted.filter((r) => {
        const lt = leaveTypeToStr(r.leaveType as unknown as LeaveType);
        return lt === "halfDayFirstHalf" || lt === "halfDaySecondHalf";
      }),
      leaveHistory: sorted,
    };
  }, [allRecords]);

  if (isLoading) {
    return (
      <div className="px-4 py-5 space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter px-4 py-5 space-y-5">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Leaves
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your leave history and summary
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="app-card p-4 text-center">
          <p className="text-3xl font-display font-bold text-destructive">
            {fullDayLeaves.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Full-Day Leaves
          </p>
        </div>
        <div className="app-card p-4 text-center">
          <p className="text-3xl font-display font-bold text-warning">
            {halfDayLeaves.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Half-Day Leaves
          </p>
        </div>
      </div>

      {/* Full Day Leaves */}
      {fullDayLeaves.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Full-Day Leaves
            </h3>
            <Badge variant="destructive" className="text-xs">
              {fullDayLeaves.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {fullDayLeaves.map((r) => (
              <LeaveItem key={r.date} record={r} />
            ))}
          </div>
        </div>
      )}

      {/* Half Day Leaves */}
      {halfDayLeaves.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Half-Day Leaves
            </h3>
            <Badge variant="secondary" className="text-xs">
              {halfDayLeaves.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {halfDayLeaves.map((r) => (
              <LeaveItem key={r.date} record={r} />
            ))}
          </div>
        </div>
      )}

      {/* Leave History */}
      {leaveHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Complete History
          </h3>
          <div className="space-y-2">
            {leaveHistory.map((r) => (
              <LeaveItem key={r.date} record={r} />
            ))}
          </div>
        </div>
      )}

      {leaveHistory.length === 0 && (
        <div className="app-card p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">
            No leaves recorded
          </p>
          <p className="text-sm text-muted-foreground">
            Your leave history will appear here
          </p>
        </div>
      )}
    </div>
  );
}
