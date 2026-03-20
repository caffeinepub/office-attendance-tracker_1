import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, ChevronRight } from "lucide-react";
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
    <div className="ios-row justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: isFullDay
              ? "oklch(var(--destructive) / 0.1)"
              : "oklch(var(--warning) / 0.1)",
          }}
        >
          <Calendar
            style={{
              width: 15,
              height: 15,
              color: isFullDay
                ? "oklch(var(--destructive))"
                : "oklch(var(--warning))",
            }}
          />
        </div>
        <div>
          <p style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
            {format(date, "MMM d, yyyy")}
          </p>
          <p style={{ fontSize: 13, color: "oklch(var(--muted-foreground))" }}>
            {getLeaveTypeLabel(leaveStr)}
          </p>
        </div>
      </div>
      <span
        className="px-2 py-0.5 rounded-full"
        style={{
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: isFullDay
            ? "oklch(var(--destructive) / 0.1)"
            : "oklch(var(--warning) / 0.1)",
          color: isFullDay
            ? "oklch(var(--destructive))"
            : "oklch(var(--warning))",
        }}
      >
        {isFullDay ? "Full Day" : isFirstHalf ? "1st Half" : "2nd Half"}
      </span>
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
      <div className="px-4 pt-4 space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter px-4 pt-4 pb-6 space-y-5">
      {/* Header */}
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
          Leaves
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          Your leave history
        </p>
      </div>

      {/* Summary */}
      <div>
        <p className="ios-section-header">Summary</p>
        <div className="ios-card overflow-hidden">
          <div className="ios-row justify-between">
            <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
              Full-Day Leaves
            </span>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--destructive))" }}
            >
              {fullDayLeaves.length}
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
            <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
              Half-Day Leaves
            </span>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--warning))" }}
            >
              {halfDayLeaves.length}
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
            <span style={{ fontSize: 17, color: "oklch(var(--foreground))" }}>
              Total
            </span>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--primary))" }}
            >
              {leaveHistory.length}
            </span>
          </div>
        </div>
      </div>

      {/* Leave History */}
      {leaveHistory.length > 0 ? (
        <div>
          <p className="ios-section-header">History</p>
          <div className="ios-card overflow-hidden">
            {leaveHistory.map((r, idx) => (
              <div key={r.date}>
                {idx > 0 && (
                  <div
                    style={{
                      height: "0.5px",
                      backgroundColor: "oklch(var(--border) / 0.4)",
                      marginLeft: 16,
                    }}
                  />
                )}
                <LeaveItem record={r} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="ios-card flex flex-col items-center text-center py-10"
          data-ocid="leaves.empty_state"
        >
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "oklch(var(--secondary))",
            }}
          >
            <Calendar
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
            No leaves recorded
          </p>
          <p
            style={{
              fontSize: 15,
              color: "oklch(var(--muted-foreground))",
              marginTop: 4,
            }}
          >
            Your leave history will appear here
          </p>
        </div>
      )}
    </div>
  );
}
