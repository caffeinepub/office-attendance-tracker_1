import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import React, { useState, useMemo } from "react";
import type { AttendanceRecord, LeaveType } from "../backend";
import {
  useGetAllRecords,
  useGetRecordsByDateRange,
} from "../hooks/useQueries";
import {
  calculateDailyHours,
  formatHoursDisplay,
  getLeaveTypeLabel,
  getMonthRange,
  getWeekRange,
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

type ExportRange = "week" | "month" | "all";

interface ExportRow {
  Date: string;
  "Swipe In": string;
  "Swipe Out": string;
  Hours: string;
  Breakfast: string;
  "Leave Type": string;
}

function buildExportRows(records: AttendanceRecord[]): ExportRow[] {
  return records.map((r) => {
    const leaveStr = leaveTypeToStr(r.leaveType as unknown as LeaveType);
    const hours = calculateDailyHours({
      date: r.date,
      swipeIn: r.swipeIn,
      swipeOut: r.swipeOut,
      breakfastAtOffice: r.breakfastAtOffice,
      leaveType: leaveStr,
    });
    return {
      Date: r.date,
      "Swipe In": r.swipeIn || "\u2014",
      "Swipe Out": r.swipeOut || "\u2014",
      Hours: formatHoursDisplay(hours),
      Breakfast: r.breakfastAtOffice ? "Yes" : "No",
      "Leave Type": getLeaveTypeLabel(leaveStr),
    };
  });
}

function downloadCSV(rows: ExportRow[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h]);
          return val.includes(",") ? `"${val}"` : val;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadXLSXFallback(rows: ExportRow[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
  const tsvContent = [
    headers.join("\t"),
    ...rows.map((row) => headers.map((h) => String(row[h])).join("\t")),
  ].join("\n");
  const blob = new Blob([tsvContent], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Export() {
  const today = new Date();
  const [range, setRange] = useState<ExportRange>("month");
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);

  const weekRange = getWeekRange(today);
  const monthRange = getMonthRange(today);
  const { data: allRecords = [] } = useGetAllRecords();
  const { data: weekRecords = [] } = useGetRecordsByDateRange(
    weekRange.start,
    weekRange.end,
  );
  const { data: monthRecords = [] } = useGetRecordsByDateRange(
    monthRange.start,
    monthRange.end,
  );

  const selectedRecords = useMemo(() => {
    switch (range) {
      case "week":
        return weekRecords;
      case "month":
        return monthRecords;
      case "all":
        return allRecords;
    }
  }, [range, weekRecords, monthRecords, allRecords]);

  const rangeLabel = useMemo(() => {
    switch (range) {
      case "week":
        return `Week of ${format(new Date(weekRange.start), "MMM d")}`;
      case "month":
        return format(today, "MMMM yyyy");
      case "all":
        return "All Records";
    }
  }, [range, weekRange.start, today]);

  const handleCSV = async () => {
    setIsExporting("csv");
    try {
      downloadCSV(
        buildExportRows(selectedRecords),
        `swipetrack-${range}-${format(today, "yyyy-MM-dd")}.csv`,
      );
    } finally {
      setIsExporting(null);
    }
  };

  const handleXLSX = async () => {
    setIsExporting("xlsx");
    try {
      downloadXLSXFallback(
        buildExportRows(selectedRecords),
        `swipetrack-${range}-${format(today, "yyyy-MM-dd")}.xlsx`,
      );
    } finally {
      setIsExporting(null);
    }
  };

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
          Export
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "oklch(var(--muted-foreground))",
            marginTop: 2,
          }}
        >
          Download your attendance data
        </p>
      </div>

      {/* Range Selector */}
      <div>
        <p className="ios-section-header">Date Range</p>
        <div className="ios-card overflow-hidden">
          <div className="px-4 py-1">
            <Select
              value={range}
              onValueChange={(v) => setRange(v as ExportRange)}
            >
              <SelectTrigger
                className="h-11 border-0 shadow-none bg-transparent px-0 focus:ring-0 focus:ring-offset-0"
                style={{ fontSize: 17 }}
                data-ocid="export.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="week" style={{ fontSize: 16 }}>
                  Current Week
                </SelectItem>
                <SelectItem value="month" style={{ fontSize: 16 }}>
                  Current Month
                </SelectItem>
                <SelectItem value="all" style={{ fontSize: 16 }}>
                  All Records
                </SelectItem>
              </SelectContent>
            </Select>
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
              style={{ fontSize: 15, color: "oklch(var(--muted-foreground))" }}
            >
              Records
            </span>
            <span
              className="ios-number"
              style={{ fontSize: 17, color: "oklch(var(--foreground))" }}
            >
              {selectedRecords.length}
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
              style={{ fontSize: 15, color: "oklch(var(--muted-foreground))" }}
            >
              Range
            </span>
            <span style={{ fontSize: 15, color: "oklch(var(--foreground))" }}>
              {rangeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div>
        <p className="ios-section-header">Included Columns</p>
        <div className="ios-card px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {[
              "Date",
              "Swipe In",
              "Swipe Out",
              "Hours",
              "Breakfast",
              "Leave Type",
            ].map((col) => (
              <span
                key={col}
                className="px-2.5 py-1 rounded-full"
                style={{
                  fontSize: 13,
                  backgroundColor: "oklch(var(--primary) / 0.1)",
                  color: "oklch(var(--primary))",
                }}
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleCSV}
          disabled={isExporting !== null || selectedRecords.length === 0}
          variant="outline"
          className="w-full rounded-xl font-semibold"
          style={{ height: 50, fontSize: 17 }}
          data-ocid="export.csv.button"
        >
          {isExporting === "csv" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting\u2026
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileText
                className="w-5 h-5"
                style={{ color: "oklch(var(--primary))" }}
              />
              Export as CSV
            </span>
          )}
        </Button>

        <Button
          onClick={handleXLSX}
          disabled={isExporting !== null || selectedRecords.length === 0}
          className="w-full rounded-xl font-semibold shadow-glow"
          style={{ height: 50, fontSize: 17 }}
          data-ocid="export.xlsx.button"
        >
          {isExporting === "xlsx" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting\u2026
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Export as Excel
            </span>
          )}
        </Button>

        {selectedRecords.length === 0 && (
          <p
            style={{
              textAlign: "center",
              fontSize: 15,
              color: "oklch(var(--muted-foreground))",
            }}
          >
            No records found for the selected range.
          </p>
        )}
      </div>

      {/* Preview Table */}
      {selectedRecords.length > 0 && (
        <div>
          <p className="ios-section-header">
            Preview ({Math.min(selectedRecords.length, 5)} of{" "}
            {selectedRecords.length})
          </p>
          <div className="ios-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      borderBottom: "0.5px solid oklch(var(--border) / 0.4)",
                    }}
                  >
                    {["Date", "In", "Out", "Hours"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-4"
                        style={{
                          fontSize: 12,
                          color: "oklch(var(--muted-foreground))",
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.slice(0, 5).map((r, idx) => {
                    const leaveStr = leaveTypeToStr(
                      r.leaveType as unknown as LeaveType,
                    );
                    const hours = calculateDailyHours({
                      date: r.date,
                      swipeIn: r.swipeIn,
                      swipeOut: r.swipeOut,
                      breakfastAtOffice: r.breakfastAtOffice,
                      leaveType: leaveStr,
                    });
                    return (
                      <tr
                        key={r.date}
                        style={{
                          borderTop:
                            idx > 0
                              ? "0.5px solid oklch(var(--border) / 0.3)"
                              : undefined,
                        }}
                      >
                        <td
                          className="py-2.5 px-4"
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "oklch(var(--foreground))",
                          }}
                        >
                          {r.date}
                        </td>
                        <td
                          className="py-2.5 px-4"
                          style={{
                            fontSize: 13,
                            color: "oklch(var(--muted-foreground))",
                          }}
                        >
                          {r.swipeIn || "\u2014"}
                        </td>
                        <td
                          className="py-2.5 px-4"
                          style={{
                            fontSize: 13,
                            color: "oklch(var(--muted-foreground))",
                          }}
                        >
                          {r.swipeOut || "\u2014"}
                        </td>
                        <td
                          className="py-2.5 px-4"
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "oklch(var(--primary))",
                          }}
                        >
                          {formatHoursDisplay(hours)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 pb-2 text-center">
        <p style={{ fontSize: 13, color: "oklch(var(--muted-foreground))" }}>
          \u00a9 {new Date().getFullYear()} SwipeTrack Pro \u00b7 Built with
          \u2764\ufe0f using{" "}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "swipetrack-pro")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(var(--primary))" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
